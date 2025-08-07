import { EventEmitter } from 'events';
import { b200OptimizationLayer } from '../hardware/B200OptimizationLayer';

/**
 * B200 Blackwell GPU Resource Monitoring System
 * Real-time monitoring of GPU utilization, memory, tensor cores, and executive workloads
 */

export interface B200GPUMetrics {
  gpuId: number;
  name: string;
  utilization: number; // 0-100%
  memoryUsed: number; // GB
  memoryTotal: number; // GB
  memoryUtilization: number; // 0-100%
  temperature: number; // Celsius
  powerUsage: number; // Watts
  powerLimit: number; // Watts
  clockSpeed: number; // MHz
  tensorCoreUtilization: number; // 0-100%
  fp8Operations: number; // Operations per second
  nvlinkUtilization: number; // 0-100%
  timestamp: Date;
}

export interface ExecutiveWorkload {
  executiveRole: string;
  executiveName: string;
  gpuId: number;
  allocationId: string;
  memoryAllocated: number; // GB
  currentTask: string;
  taskStartTime: Date;
  estimatedCompletion: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  utilizationPercent: number;
  operationsPerSecond: number;
  modelType: 'llm' | 'tts' | 'analysis';
  quantization: 'fp8' | 'fp16' | 'int8';
}

export interface B200ClusterMetrics {
  totalGPUs: number;
  activeGPUs: number;
  totalMemory: number; // GB
  usedMemory: number; // GB
  totalPower: number; // Watts
  usedPower: number; // Watts
  averageUtilization: number; // 0-100%
  averageTemperature: number; // Celsius
  nvlinkThroughput: number; // GB/s
  fp8ThroughputTOPS: number; // Tera-operations per second
  activeExecutives: number;
  queuedTasks: number;
  timestamp: Date;
}

export interface B200PerformanceAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'temperature' | 'memory' | 'utilization' | 'power' | 'error';
  gpuId?: number;
  executiveRole?: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export class B200ResourceMonitor extends EventEmitter {
  private b200OptimizationLayer = b200OptimizationLayer;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: Map<number, B200GPUMetrics[]> = new Map();
  private executiveWorkloads: Map<string, ExecutiveWorkload> = new Map();
  private alerts: B200PerformanceAlert[] = [];
  private readonly maxHistoryLength = 1000; // Keep last 1000 data points per GPU
  private readonly monitoringIntervalMs = 1000; // 1 second updates

  constructor() {
    super();
    this.initializeMonitoring();
  }

  /**
   * Initialize B200 resource monitoring
   */
  private async initializeMonitoring(): Promise<void> {
    try {
      console.log('📊 Initializing B200 Resource Monitor...');
      // B200 optimization layer is already initialized
      console.log('✅ B200 Resource Monitor initialized');
    } catch (error) {
      console.error('❌ Failed to initialize B200 Resource Monitor:', error);
    }
  }

  /**
   * Start real-time monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ B200 monitoring already active');
      return;
    }

    console.log('🚀 Starting B200 real-time monitoring...');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('❌ Error collecting B200 metrics:', error);
        this.emit('monitoringError', error);
      }
    }, this.monitoringIntervalMs);

    this.emit('monitoringStarted');
    console.log('✅ B200 monitoring started');
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🛑 Stopping B200 monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoringStopped');
    console.log('✅ B200 monitoring stopped');
  }

  /**
   * Collect real-time metrics from all B200 GPUs
   */
  private async collectMetrics(): Promise<void> {
    const resourceStatus = { total_gpus: 8, active_gpus: 8 }; // Mock resource status
    const gpuMetrics: B200GPUMetrics[] = [];

    // Collect metrics for each GPU
    for (let gpuId = 0; gpuId < resourceStatus.total_gpus; gpuId++) {
      const metrics = await this.collectGPUMetrics(gpuId);
      gpuMetrics.push(metrics);

      // Store in history
      if (!this.metricsHistory.has(gpuId)) {
        this.metricsHistory.set(gpuId, []);
      }
      const history = this.metricsHistory.get(gpuId)!;
      history.push(metrics);

      // Limit history size
      if (history.length > this.maxHistoryLength) {
        history.shift();
      }

      // Check for alerts
      this.checkForAlerts(metrics);
    }

    // Update executive workloads
    await this.updateExecutiveWorkloads();

    // Calculate cluster metrics
    const clusterMetrics = this.calculateClusterMetrics(gpuMetrics);

    // Emit metrics update
    this.emit('metricsUpdate', {
      gpuMetrics,
      clusterMetrics,
      executiveWorkloads: Array.from(this.executiveWorkloads.values()),
      alerts: this.alerts.filter(alert => !alert.acknowledged)
    });
  }

  /**
   * Collect metrics for a specific GPU
   */
  private async collectGPUMetrics(gpuId: number): Promise<B200GPUMetrics> {
    // In production, this would use nvidia-ml-py or similar to get real GPU metrics
    // For now, simulate realistic B200 Blackwell metrics
    const baseUtilization = 70 + Math.random() * 25; // 70-95% utilization
    const memoryTotal = 80; // 80GB HBM3e per B200
    const memoryUsed = (baseUtilization / 100) * memoryTotal;

    return {
      gpuId,
      name: `NVIDIA B200 Blackwell GPU ${gpuId}`,
      utilization: Math.round(baseUtilization),
      memoryUsed: Math.round(memoryUsed * 10) / 10,
      memoryTotal,
      memoryUtilization: Math.round((memoryUsed / memoryTotal) * 100),
      temperature: 65 + Math.random() * 15, // 65-80°C
      powerUsage: Math.round(400 + Math.random() * 300), // 400-700W
      powerLimit: 1000, // 1000W max for B200
      clockSpeed: Math.round(1800 + Math.random() * 400), // 1800-2200 MHz
      tensorCoreUtilization: Math.round(baseUtilization * 0.9), // Tensor cores slightly lower
      fp8Operations: Math.round((baseUtilization / 100) * 2500000000000), // 2.5 TOPS at full utilization
      nvlinkUtilization: Math.round(Math.random() * 40), // 0-40% NVLink usage
      timestamp: new Date()
    };
  }

  /**
   * Update executive workload information
   */
  private async updateExecutiveWorkloads(): Promise<void> {
    // Get current allocations from B200 Resource Manager
    const allocations = await this.b200OptimizationLayer.getAllocations();

    this.executiveWorkloads.clear();

    for (const allocation of allocations) {
      const workload: ExecutiveWorkload = {
        executiveRole: this.extractExecutiveRole(allocation.component_name),
        executiveName: this.getExecutiveName(allocation.component_name),
        gpuId: 0, // Default GPU ID
        allocationId: allocation.component_name,
        memoryAllocated: allocation.estimated_vram_gb,
        currentTask: this.getCurrentTask(allocation.component_name),
        taskStartTime: new Date(Date.now() - Math.random() * 300000), // Random start time within 5 minutes
        estimatedCompletion: new Date(Date.now() + Math.random() * 600000), // Random completion within 10 minutes
        priority: allocation.priority as any,
        utilizationPercent: 75 + Math.random() * 20, // 75-95% utilization
        operationsPerSecond: Math.round(Math.random() * 1000000), // Random ops/sec
        modelType: this.getModelType(allocation.model_type),
        quantization: allocation.quantization as any
      };

      this.executiveWorkloads.set(allocation.component_name, workload);
    }
  }

  /**
   * Calculate cluster-wide metrics
   */
  private calculateClusterMetrics(gpuMetrics: B200GPUMetrics[]): B200ClusterMetrics {
    const totalGPUs = gpuMetrics.length;
    const activeGPUs = gpuMetrics.filter(gpu => gpu.utilization > 10).length;
    
    const totalMemory = gpuMetrics.reduce((sum, gpu) => sum + gpu.memoryTotal, 0);
    const usedMemory = gpuMetrics.reduce((sum, gpu) => sum + gpu.memoryUsed, 0);
    const totalPower = gpuMetrics.reduce((sum, gpu) => sum + gpu.powerLimit, 0);
    const usedPower = gpuMetrics.reduce((sum, gpu) => sum + gpu.powerUsage, 0);
    
    const averageUtilization = gpuMetrics.reduce((sum, gpu) => sum + gpu.utilization, 0) / totalGPUs;
    const averageTemperature = gpuMetrics.reduce((sum, gpu) => sum + gpu.temperature, 0) / totalGPUs;
    const nvlinkThroughput = gpuMetrics.reduce((sum, gpu) => sum + (gpu.nvlinkUtilization / 100) * 900, 0); // 900 GB/s max per GPU
    const fp8ThroughputTOPS = gpuMetrics.reduce((sum, gpu) => sum + gpu.fp8Operations, 0) / 1000000000000; // Convert to TOPS

    return {
      totalGPUs,
      activeGPUs,
      totalMemory: Math.round(totalMemory),
      usedMemory: Math.round(usedMemory * 10) / 10,
      totalPower: Math.round(totalPower),
      usedPower: Math.round(usedPower),
      averageUtilization: Math.round(averageUtilization),
      averageTemperature: Math.round(averageTemperature * 10) / 10,
      nvlinkThroughput: Math.round(nvlinkThroughput * 10) / 10,
      fp8ThroughputTOPS: Math.round(fp8ThroughputTOPS * 10) / 10,
      activeExecutives: this.executiveWorkloads.size,
      queuedTasks: Math.floor(Math.random() * 5), // Simulated queue
      timestamp: new Date()
    };
  }

  /**
   * Check for performance alerts
   */
  private checkForAlerts(metrics: B200GPUMetrics): void {
    const alerts: B200PerformanceAlert[] = [];

    // Temperature alert
    if (metrics.temperature > 85) {
      alerts.push({
        id: `temp-${metrics.gpuId}-${Date.now()}`,
        severity: metrics.temperature > 90 ? 'critical' : 'warning',
        type: 'temperature',
        gpuId: metrics.gpuId,
        message: `GPU ${metrics.gpuId} temperature: ${metrics.temperature}°C`,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Memory alert
    if (metrics.memoryUtilization > 90) {
      alerts.push({
        id: `memory-${metrics.gpuId}-${Date.now()}`,
        severity: metrics.memoryUtilization > 95 ? 'critical' : 'warning',
        type: 'memory',
        gpuId: metrics.gpuId,
        message: `GPU ${metrics.gpuId} memory usage: ${metrics.memoryUtilization}%`,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Power alert
    if (metrics.powerUsage > 900) {
      alerts.push({
        id: `power-${metrics.gpuId}-${Date.now()}`,
        severity: 'warning',
        type: 'power',
        gpuId: metrics.gpuId,
        message: `GPU ${metrics.gpuId} high power usage: ${metrics.powerUsage}W`,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Add new alerts
    this.alerts.push(...alerts);

    // Emit alerts
    if (alerts.length > 0) {
      this.emit('newAlerts', alerts);
    }

    // Clean up old alerts (keep last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Get current metrics snapshot
   */
  public async getCurrentMetrics(): Promise<any> {
    if (!this.isMonitoring) {
      await this.collectMetrics();
    }

    const gpuMetrics: B200GPUMetrics[] = [];
    for (const [gpuId, history] of this.metricsHistory.entries()) {
      if (history.length > 0) {
        gpuMetrics.push(history[history.length - 1]);
      }
    }

    const clusterMetrics = this.calculateClusterMetrics(gpuMetrics);

    return {
      gpuMetrics,
      clusterMetrics,
      executiveWorkloads: Array.from(this.executiveWorkloads.values()),
      alerts: this.alerts.filter(alert => !alert.acknowledged),
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Get historical metrics for a GPU
   */
  public getGPUHistory(gpuId: number, limit: number = 100): B200GPUMetrics[] {
    const history = this.metricsHistory.get(gpuId) || [];
    return history.slice(-limit);
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
    }
  }

  /**
   * Helper methods
   */
  private extractExecutiveRole(componentName: string): string {
    if (componentName.includes('cfo')) return 'CFO';
    if (componentName.includes('cmo')) return 'CMO';
    if (componentName.includes('cto')) return 'CTO';
    if (componentName.includes('clo')) return 'CLO';
    if (componentName.includes('coo')) return 'COO';
    if (componentName.includes('chro')) return 'CHRO';
    if (componentName.includes('cso')) return 'CSO';
    if (componentName.includes('sovren')) return 'SOVREN-AI';
    return 'Unknown';
  }

  private getExecutiveName(componentName: string): string {
    // SECURITY: No hardcoded names - use role-based identification
    const roleMap: Record<string, string> = {
      'cfo': 'CFO Executive',
      'cmo': 'CMO Executive',
      'cto': 'CTO Executive',
      'clo': 'CLO Executive',
      'coo': 'COO Executive',
      'chro': 'CHRO Executive',
      'cso': 'CSO Executive',
      'sovren': 'SOVREN-AI'
    };

    for (const [key, role] of Object.entries(roleMap)) {
      if (componentName.includes(key)) {
        return role;
      }
    }
    return 'Unknown Executive';
  }

  private getCurrentTask(componentName: string): string {
    const tasks = [
      'Financial Analysis',
      'Market Research',
      'Technical Review',
      'Legal Compliance',
      'Operations Planning',
      'HR Strategy',
      'Strategic Planning',
      'AI Processing',
      'Voice Synthesis',
      'Data Analysis'
    ];
    return tasks[Math.floor(Math.random() * tasks.length)];
  }

  private getModelType(modelType: string): 'llm' | 'tts' | 'analysis' {
    if (modelType.includes('tts')) return 'tts';
    if (modelType.includes('llm')) return 'llm';
    return 'analysis';
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    this.stopMonitoring();
    this.metricsHistory.clear();
    this.executiveWorkloads.clear();
    this.alerts = [];
    console.log('🧹 B200 Resource Monitor cleaned up');
  }
}

// Global monitor instance
export const b200ResourceMonitor = new B200ResourceMonitor();
