import { EventEmitter } from 'events';
import { B200ResourceManager, B200AllocationRequest } from '../b200/B200ResourceManager';
import { nvlinkFabricCoordinator } from '../coordination/NVLinkFabricCoordinator';
import { executiveAccessManager } from '../security/ExecutiveAccessManager';

/**
 * B200 Auto-Scaling Engine
 * Dynamic resource allocation system that automatically scales GPU resources
 * based on executive workload and user demand
 */

export interface ScalingMetrics {
  timestamp: Date;
  totalRequests: number;
  activeExecutives: number;
  gpuUtilization: number;
  memoryUtilization: number;
  powerUtilization: number;
  averageLatency: number;
  queueLength: number;
  throughput: number;
}

export interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'maintain' | 'redistribute';
  reason: string;
  targetGPUs: number;
  currentGPUs: number;
  executiveReallocation?: Map<string, number>;
  estimatedImpact: {
    latencyImprovement: number;
    throughputIncrease: number;
    powerEfficiency: number;
  };
  confidence: number;
}

export interface AutoScalingConfig {
  minGPUs: number;
  maxGPUs: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number; // milliseconds
  evaluationInterval: number; // milliseconds
  latencyThreshold: number; // milliseconds
  queueThreshold: number;
  powerBudget: number; // watts
}

export interface ExecutiveWorkload {
  executiveId: string;
  currentRequests: number;
  averageLatency: number;
  gpuUtilization: number;
  memoryUsage: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  predictedLoad: number;
}

export class B200AutoScaler extends EventEmitter {
  private b200ResourceManager: B200ResourceManager;
  private config: AutoScalingConfig;
  private isRunning: boolean = false;
  private lastScalingAction: Date | null = null;
  private metricsHistory: ScalingMetrics[] = [];
  private executiveWorkloads: Map<string, ExecutiveWorkload> = new Map();
  private scalingInterval: NodeJS.Timeout | null = null;
  private currentUserId: string | null = null; // SECURITY: Track which user this auto-scaler serves

  // Default auto-scaling configuration
  private readonly defaultConfig: AutoScalingConfig = {
    minGPUs: 2,
    maxGPUs: 8,
    targetUtilization: 0.75, // 75% target utilization
    scaleUpThreshold: 0.85, // Scale up at 85% utilization
    scaleDownThreshold: 0.50, // Scale down below 50% utilization
    cooldownPeriod: 300000, // 5 minutes cooldown
    evaluationInterval: 30000, // Evaluate every 30 seconds
    latencyThreshold: 1000, // 1 second latency threshold
    queueThreshold: 10, // Scale up if queue > 10 requests
    powerBudget: 6400 // 8 GPUs × 800W each
  };

  constructor(config?: Partial<AutoScalingConfig>) {
    super();
    this.b200ResourceManager = new B200ResourceManager();
    this.config = { ...this.defaultConfig, ...config };
    // SECURITY: Executive workloads will be initialized when start() is called with userId
  }

  /**
   * Initialize executive workload tracking - SECURE VERSION
   * NO HARDCODED NAMES - Gets executives from user's actual Shadow Board
   */
  private async initializeExecutiveWorkloads(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('SECURITY VIOLATION: userId required for executive workload initialization');
    }

    this.currentUserId = userId;

    try {
      // SECURITY: Get user's actual executives - NO HARDCODED NAMES
      await executiveAccessManager.ensureUserShadowBoard(userId);
      const userExecutives = await executiveAccessManager.getUserExecutives(userId);

      this.executiveWorkloads.clear(); // Clear any previous data

      for (const [role, executive] of userExecutives.entries()) {
        this.executiveWorkloads.set(role, {
          executiveId: executive.executiveId,
          currentRequests: 0,
          averageLatency: 0,
          gpuUtilization: 0,
          memoryUsage: 0,
          priority: role === 'sovren-ai' ? 'critical' : 'high',
          predictedLoad: 0
        });
      }

      console.log(`🔐 SECURE: Initialized workload tracking for ${userExecutives.size} executives for user ${userId}`);
      console.log(`🎯 Executives: ${Array.from(userExecutives.values()).map(e => `${e.role}: ${e.name}`).join(', ')}`);

    } catch (error) {
      console.error(`❌ SECURITY ERROR: Failed to initialize executive workloads for user ${userId}:`, error);
      throw new Error(`Executive workload initialization failed for user: ${userId}`);
    }
  }

  /**
   * Start auto-scaling system - SECURE VERSION
   */
  public async start(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('SECURITY VIOLATION: userId required to start auto-scaling');
    }

    if (this.isRunning) {
      console.log('⚠️ Auto-scaling already running');
      return;
    }

    try {
      await this.b200ResourceManager.initialize();

      // SECURITY: Initialize with user's actual executives
      await this.initializeExecutiveWorkloads(userId);

      this.isRunning = true;
      this.scalingInterval = setInterval(
        () => this.evaluateScaling(),
        this.config.evaluationInterval
      );

      console.log(`🔐 SECURE: B200 Auto-Scaling system started for user ${userId}`);
      console.log(`📊 Evaluation interval: ${this.config.evaluationInterval / 1000}s`);
      console.log(`🎯 Target utilization: ${this.config.targetUtilization * 100}%`);
      console.log(`⚡ GPU range: ${this.config.minGPUs}-${this.config.maxGPUs} GPUs`);

      this.emit('started', { config: this.config, userId });

    } catch (error) {
      console.error(`❌ Failed to start auto-scaling for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Stop auto-scaling system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = null;
    }

    console.log('🛑 B200 Auto-Scaling system stopped');
    this.emit('stopped');
  }

  /**
   * Evaluate current system state and make scaling decisions
   */
  private async evaluateScaling(): Promise<void> {
    try {
      // Collect current metrics
      const metrics = await this.collectMetrics();
      this.metricsHistory.push(metrics);
      
      // Keep only last 100 metrics (for trend analysis)
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }

      // Update executive workloads
      await this.updateExecutiveWorkloads();

      // Make scaling decision
      const decision = await this.makeScalingDecision(metrics);

      // Execute scaling action if needed
      if (decision.action !== 'maintain') {
        await this.executeScalingDecision(decision);
      }

      this.emit('evaluation', { metrics, decision });

    } catch (error) {
      console.error('❌ Auto-scaling evaluation failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<ScalingMetrics> {
    const resourceStatus = await this.b200ResourceManager.getResourceStatus();
    const currentMetrics = await this.b200ResourceManager.getCurrentMetrics();
    const fabricMetrics = nvlinkFabricCoordinator.getFabricMetrics();

    // Calculate queue length from active allocations
    const activeAllocations = await this.b200ResourceManager.getActiveAllocations();
    const queueLength = Math.max(0, activeAllocations.length - resourceStatus.available_gpus);

    // Calculate throughput (requests per minute)
    const recentMetrics = this.metricsHistory.slice(-5); // Last 5 evaluations
    const throughput = recentMetrics.length > 1 ? 
      (recentMetrics[recentMetrics.length - 1].totalRequests - recentMetrics[0].totalRequests) / 
      ((recentMetrics.length - 1) * this.config.evaluationInterval / 60000) : 0;

    return {
      timestamp: new Date(),
      totalRequests: activeAllocations.length,
      activeExecutives: fabricMetrics.executiveDistribution.size,
      gpuUtilization: currentMetrics.gpu_utilization / 100,
      memoryUtilization: currentMetrics.memory_usage_gb / resourceStatus.total_memory_gb,
      powerUtilization: currentMetrics.power_consumption_watts / this.config.powerBudget,
      averageLatency: currentMetrics.average_latency_ms || 0,
      queueLength,
      throughput
    };
  }

  /**
   * Update executive workload information
   */
  private async updateExecutiveWorkloads(): Promise<void> {
    const activeAllocations = await this.b200ResourceManager.getActiveAllocations();
    
    // Reset current request counts
    for (const workload of this.executiveWorkloads.values()) {
      workload.currentRequests = 0;
      workload.gpuUtilization = 0;
      workload.memoryUsage = 0;
    }

    // Count active requests per executive
    for (const allocation of activeAllocations) {
      const executiveId = this.extractExecutiveFromComponent(allocation.component_name);
      const workload = this.executiveWorkloads.get(executiveId);
      
      if (workload) {
        workload.currentRequests++;
        workload.memoryUsage += allocation.memory_allocated_gb;
        // Estimate GPU utilization based on allocation
        workload.gpuUtilization += 1 / allocation.gpu_ids.length;
      }
    }

    // Predict future load based on trends
    for (const [executiveId, workload] of this.executiveWorkloads.entries()) {
      workload.predictedLoad = this.predictExecutiveLoad(executiveId);
    }
  }

  /**
   * Extract executive ID from component name - SECURE VERSION
   */
  private extractExecutiveFromComponent(componentName: string): string {
    if (!this.currentUserId) {
      console.warn('⚠️ SECURITY WARNING: No user context for executive extraction');
      return 'unknown';
    }

    const parts = componentName.toLowerCase().split('_');

    // SECURITY: Use actual user's executive roles, not hardcoded list
    for (const [role, workload] of this.executiveWorkloads.entries()) {
      if (parts.some(part => part.includes(role.replace('-', '')))) {
        return role;
      }
    }

    return 'unknown';
  }

  /**
   * Predict future load for an executive based on historical data
   */
  private predictExecutiveLoad(executiveId: string): number {
    const recentMetrics = this.metricsHistory.slice(-10); // Last 10 evaluations
    if (recentMetrics.length < 3) return 0;

    // Simple linear trend prediction
    const loads = recentMetrics.map(() => {
      const workload = this.executiveWorkloads.get(executiveId);
      return workload ? workload.currentRequests : 0;
    });

    const avgLoad = loads.reduce((sum, load) => sum + load, 0) / loads.length;
    const trend = loads.length > 1 ? 
      (loads[loads.length - 1] - loads[0]) / (loads.length - 1) : 0;

    return Math.max(0, avgLoad + trend * 3); // Predict 3 intervals ahead
  }

  /**
   * Make scaling decision based on current metrics
   */
  private async makeScalingDecision(metrics: ScalingMetrics): Promise<ScalingDecision> {
    const currentGPUs = await this.getCurrentGPUCount();
    
    // Check cooldown period
    if (this.lastScalingAction && 
        Date.now() - this.lastScalingAction.getTime() < this.config.cooldownPeriod) {
      return {
        action: 'maintain',
        reason: 'Cooldown period active',
        targetGPUs: currentGPUs,
        currentGPUs,
        estimatedImpact: { latencyImprovement: 0, throughputIncrease: 0, powerEfficiency: 0 },
        confidence: 1.0
      };
    }

    // Scale up conditions
    if (this.shouldScaleUp(metrics, currentGPUs)) {
      const targetGPUs = Math.min(currentGPUs + 1, this.config.maxGPUs);
      return {
        action: 'scale_up',
        reason: this.getScaleUpReason(metrics),
        targetGPUs,
        currentGPUs,
        estimatedImpact: this.estimateScaleUpImpact(currentGPUs, targetGPUs),
        confidence: this.calculateScalingConfidence(metrics, 'up')
      };
    }

    // Scale down conditions
    if (this.shouldScaleDown(metrics, currentGPUs)) {
      const targetGPUs = Math.max(currentGPUs - 1, this.config.minGPUs);
      return {
        action: 'scale_down',
        reason: this.getScaleDownReason(metrics),
        targetGPUs,
        currentGPUs,
        estimatedImpact: this.estimateScaleDownImpact(currentGPUs, targetGPUs),
        confidence: this.calculateScalingConfidence(metrics, 'down')
      };
    }

    // Check if redistribution is needed
    if (this.shouldRedistribute(metrics)) {
      return {
        action: 'redistribute',
        reason: 'Executive workload imbalance detected',
        targetGPUs: currentGPUs,
        currentGPUs,
        executiveReallocation: await this.calculateOptimalReallocation(),
        estimatedImpact: { latencyImprovement: 0.15, throughputIncrease: 0.1, powerEfficiency: 0.05 },
        confidence: 0.8
      };
    }

    return {
      action: 'maintain',
      reason: 'System operating within optimal parameters',
      targetGPUs: currentGPUs,
      currentGPUs,
      estimatedImpact: { latencyImprovement: 0, throughputIncrease: 0, powerEfficiency: 0 },
      confidence: 1.0
    };
  }

  /**
   * Check if system should scale up
   */
  private shouldScaleUp(metrics: ScalingMetrics, currentGPUs: number): boolean {
    if (currentGPUs >= this.config.maxGPUs) return false;

    return (
      metrics.gpuUtilization > this.config.scaleUpThreshold ||
      metrics.averageLatency > this.config.latencyThreshold ||
      metrics.queueLength > this.config.queueThreshold ||
      this.hasCriticalExecutiveOverload()
    );
  }

  /**
   * Check if system should scale down
   */
  private shouldScaleDown(metrics: ScalingMetrics, currentGPUs: number): boolean {
    if (currentGPUs <= this.config.minGPUs) return false;

    const recentMetrics = this.metricsHistory.slice(-5);
    const avgUtilization = recentMetrics.length > 0 ?
      recentMetrics.reduce((sum, m) => sum + m.gpuUtilization, 0) / recentMetrics.length :
      metrics.gpuUtilization;

    return (
      avgUtilization < this.config.scaleDownThreshold &&
      metrics.averageLatency < this.config.latencyThreshold * 0.5 &&
      metrics.queueLength === 0 &&
      !this.hasCriticalExecutiveLoad()
    );
  }

  /**
   * Check if executive workload redistribution is needed
   */
  private shouldRedistribute(metrics: ScalingMetrics): boolean {
    const workloads = Array.from(this.executiveWorkloads.values());
    const utilizationVariance = this.calculateUtilizationVariance(workloads);
    
    return utilizationVariance > 0.3; // High variance indicates imbalance
  }

  /**
   * Calculate utilization variance across executives
   */
  private calculateUtilizationVariance(workloads: ExecutiveWorkload[]): number {
    const utilizations = workloads.map(w => w.gpuUtilization);
    const avg = utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length;
    const variance = utilizations.reduce((sum, u) => sum + Math.pow(u - avg, 2), 0) / utilizations.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Check if any critical executive is overloaded
   */
  private hasCriticalExecutiveOverload(): boolean {
    for (const workload of this.executiveWorkloads.values()) {
      if (workload.priority === 'critical' && 
          (workload.gpuUtilization > 0.9 || workload.currentRequests > 5)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if any critical executive has significant load
   */
  private hasCriticalExecutiveLoad(): boolean {
    for (const workload of this.executiveWorkloads.values()) {
      if (workload.priority === 'critical' && workload.currentRequests > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get current GPU count
   */
  private async getCurrentGPUCount(): Promise<number> {
    const resourceStatus = await this.b200ResourceManager.getResourceStatus();
    return resourceStatus.total_gpus;
  }

  /**
   * Get scale up reason
   */
  private getScaleUpReason(metrics: ScalingMetrics): string {
    const reasons = [];
    
    if (metrics.gpuUtilization > this.config.scaleUpThreshold) {
      reasons.push(`High GPU utilization: ${(metrics.gpuUtilization * 100).toFixed(1)}%`);
    }
    if (metrics.averageLatency > this.config.latencyThreshold) {
      reasons.push(`High latency: ${metrics.averageLatency.toFixed(0)}ms`);
    }
    if (metrics.queueLength > this.config.queueThreshold) {
      reasons.push(`Queue backlog: ${metrics.queueLength} requests`);
    }
    if (this.hasCriticalExecutiveOverload()) {
      reasons.push('Critical executive overload detected');
    }
    
    return reasons.join(', ');
  }

  /**
   * Get scale down reason
   */
  private getScaleDownReason(metrics: ScalingMetrics): string {
    return `Low utilization: ${(metrics.gpuUtilization * 100).toFixed(1)}%, ` +
           `Low latency: ${metrics.averageLatency.toFixed(0)}ms, ` +
           `No queue backlog`;
  }

  /**
   * Estimate impact of scaling up
   */
  private estimateScaleUpImpact(currentGPUs: number, targetGPUs: number): any {
    const scaleFactor = targetGPUs / currentGPUs;
    return {
      latencyImprovement: 1 - (1 / scaleFactor), // Inverse relationship
      throughputIncrease: scaleFactor - 1,
      powerEfficiency: -0.1 // Slight decrease due to overhead
    };
  }

  /**
   * Estimate impact of scaling down
   */
  private estimateScaleDownImpact(currentGPUs: number, targetGPUs: number): any {
    const scaleFactor = targetGPUs / currentGPUs;
    return {
      latencyImprovement: -(1 - scaleFactor), // Negative improvement (increase)
      throughputIncrease: scaleFactor - 1, // Negative increase (decrease)
      powerEfficiency: 0.15 // Improved efficiency
    };
  }

  /**
   * Calculate confidence in scaling decision
   */
  private calculateScalingConfidence(metrics: ScalingMetrics, direction: 'up' | 'down'): number {
    const recentMetrics = this.metricsHistory.slice(-5);
    if (recentMetrics.length < 3) return 0.5;

    // Calculate trend consistency
    const utilizationTrend = this.calculateTrend(recentMetrics.map(m => m.gpuUtilization));
    const latencyTrend = this.calculateTrend(recentMetrics.map(m => m.averageLatency));

    const trendAlignment = direction === 'up' ? 
      (utilizationTrend > 0 && latencyTrend > 0 ? 1 : 0.5) :
      (utilizationTrend < 0 && latencyTrend < 0 ? 1 : 0.5);

    return Math.min(0.95, 0.5 + trendAlignment * 0.45);
  }

  /**
   * Calculate trend from data points
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Calculate optimal executive reallocation - SECURE VERSION
   */
  private async calculateOptimalReallocation(): Promise<Map<string, number>> {
    if (!this.currentUserId) {
      throw new Error('SECURITY VIOLATION: No user context for executive reallocation');
    }

    const reallocation = new Map<string, number>();
    const workloads = Array.from(this.executiveWorkloads.entries())
      .map(([role, workload]) => ({ role, ...workload }))
      .sort((a, b) => b.currentRequests - a.currentRequests);

    // SECURITY: Use actual user's executives for rebalancing
    let gpuIndex = 0;
    for (const workload of workloads) {
      if (workload.currentRequests > 0) {
        reallocation.set(workload.role, gpuIndex % this.config.maxGPUs);
        gpuIndex++;
      }
    }

    console.log(`🔐 SECURE: Calculated reallocation for user ${this.currentUserId}:`,
      Array.from(reallocation.entries()).map(([role, gpu]) => `${role}->GPU${gpu}`).join(', '));

    return reallocation;
  }

  /**
   * Execute scaling decision
   */
  private async executeScalingDecision(decision: ScalingDecision): Promise<void> {
    console.log(`🎯 Executing scaling decision: ${decision.action}`);
    console.log(`📊 Reason: ${decision.reason}`);
    console.log(`⚡ GPUs: ${decision.currentGPUs} → ${decision.targetGPUs}`);

    try {
      switch (decision.action) {
        case 'scale_up':
          await this.scaleUp(decision.targetGPUs - decision.currentGPUs);
          break;
        case 'scale_down':
          await this.scaleDown(decision.currentGPUs - decision.targetGPUs);
          break;
        case 'redistribute':
          await this.redistributeExecutives(decision.executiveReallocation!);
          break;
      }

      this.lastScalingAction = new Date();
      this.emit('scaled', decision);

    } catch (error) {
      console.error(`❌ Scaling execution failed:`, error);
      this.emit('scalingError', { decision, error });
    }
  }

  /**
   * Scale up GPU resources
   */
  private async scaleUp(additionalGPUs: number): Promise<void> {
    console.log(`📈 Scaling up by ${additionalGPUs} GPUs`);
    
    // In production, this would trigger actual GPU provisioning
    // For now, we update the resource manager configuration
    await this.b200ResourceManager.expandCluster(additionalGPUs);
    
    // Optimize executive placement across new GPUs
    const executives = Array.from(this.executiveWorkloads.keys());
    await nvlinkFabricCoordinator.optimizeExecutivePlacement(executives);
  }

  /**
   * Scale down GPU resources
   */
  private async scaleDown(gpusToRemove: number): Promise<void> {
    console.log(`📉 Scaling down by ${gpusToRemove} GPUs`);
    
    // Ensure no critical workloads are affected
    await this.migrateWorkloadsBeforeScaleDown(gpusToRemove);
    
    // In production, this would trigger actual GPU deprovisioning
    await this.b200ResourceManager.shrinkCluster(gpusToRemove);
  }

  /**
   * Redistribute executives across GPUs - SECURE VERSION
   */
  private async redistributeExecutives(reallocation: Map<string, number>): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('SECURITY VIOLATION: No user context for executive redistribution');
    }

    console.log(`🔐 SECURE: Redistributing ${reallocation.size} executives for user ${this.currentUserId}`);

    for (const [role, gpuId] of reallocation.entries()) {
      const workload = this.executiveWorkloads.get(role);
      if (workload) {
        console.log(`📍 Moving ${role} (${workload.executiveId}) to GPU ${gpuId}`);
      }
    }

    // SECURITY: Apply new executive placement using actual executive IDs
    const executiveIds = Array.from(reallocation.keys());
    await nvlinkFabricCoordinator.optimizeExecutivePlacement(executiveIds);
  }

  /**
   * Migrate workloads before scaling down
   */
  private async migrateWorkloadsBeforeScaleDown(gpusToRemove: number): Promise<void> {
    const activeAllocations = await this.b200ResourceManager.getActiveAllocations();
    
    // Identify allocations on GPUs that will be removed
    const currentGPUCount = await this.getCurrentGPUCount();
    const gpusToRemoveIds = Array.from({ length: gpusToRemove }, (_, i) =>
      currentGPUCount - 1 - i
    );
    
    for (const allocation of activeAllocations) {
      const hasGPUToRemove = allocation.gpu_ids.some(id => gpusToRemoveIds.includes(id));
      
      if (hasGPUToRemove) {
        console.log(`🔄 Migrating allocation: ${allocation.component_name}`);
        // In production, this would trigger workload migration
        await this.b200ResourceManager.migrateAllocation(allocation.allocation_id, gpusToRemoveIds);
      }
    }
  }

  /**
   * Get current auto-scaling metrics
   */
  public getCurrentMetrics(): ScalingMetrics | null {
    return this.metricsHistory.length > 0 ? 
      this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  /**
   * Get executive workloads
   */
  public getExecutiveWorkloads(): Map<string, ExecutiveWorkload> {
    return new Map(this.executiveWorkloads);
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(): ScalingMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get auto-scaling configuration
   */
  public getConfig(): AutoScalingConfig {
    return { ...this.config };
  }

  /**
   * Update auto-scaling configuration
   */
  public updateConfig(newConfig: Partial<AutoScalingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Auto-scaling configuration updated');
    this.emit('configUpdated', this.config);
  }

  /**
   * Get system status
   */
  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      lastScalingAction: this.lastScalingAction,
      metricsCount: this.metricsHistory.length,
      activeExecutives: this.executiveWorkloads.size,
      config: this.config
    };
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.stop();
    this.metricsHistory = [];
    this.executiveWorkloads.clear();
    console.log('🧹 B200 Auto-Scaler cleaned up');
  }
}

// SECURITY NOTE: Auto-scaler instances should be created per user, not globally
// Use B200AutoScalerFactory.createForUser(userId) instead
export class B200AutoScalerFactory {
  private static userAutoScalers: Map<string, B200AutoScaler> = new Map();

  /**
   * Get or create auto-scaler for specific user - SECURE ACCESS
   */
  public static getForUser(userId: string, config?: Partial<AutoScalingConfig>): B200AutoScaler {
    if (!userId) {
      throw new Error('SECURITY VIOLATION: userId required for auto-scaler access');
    }

    if (!this.userAutoScalers.has(userId)) {
      const autoScaler = new B200AutoScaler(config);
      this.userAutoScalers.set(userId, autoScaler);
      console.log(`🔐 SECURE: Created auto-scaler for user ${userId}`);
    }

    return this.userAutoScalers.get(userId)!;
  }

  /**
   * Remove auto-scaler for user - SECURITY CLEANUP
   */
  public static async removeForUser(userId: string): Promise<void> {
    const autoScaler = this.userAutoScalers.get(userId);
    if (autoScaler) {
      await autoScaler.cleanup();
      this.userAutoScalers.delete(userId);
      console.log(`🔐 SECURE: Removed auto-scaler for user ${userId}`);
    }
  }

  /**
   * Get all active users - ADMIN ONLY
   */
  public static getActiveUsers(): string[] {
    return Array.from(this.userAutoScalers.keys());
  }
}
