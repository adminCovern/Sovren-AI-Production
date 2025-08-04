/**
 * SOVREN AI - Phase 2 Intelligence Orchestrator
 * 
 * Master orchestrator for Emergency Phase 2 Intelligence Systems deployment.
 * Coordinates all intelligence systems, monitors deployment progress,
 * and ensures 16-hour deadline compliance.
 * 
 * CLASSIFICATION: EMERGENCY INTELLIGENCE ORCHESTRATION
 */

import { EventEmitter } from 'events';
import { EmergencyPhase2IntelligenceSystems, IntelligenceDeployment } from './EmergencyPhase2IntelligenceSystems';

export interface Phase2Status {
  deploymentId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'deadline_exceeded';
  startTime: Date;
  endTime?: Date;
  progress: number;
  timeRemaining: number; // minutes
  criticalSystemsOnline: number;
  totalCriticalSystems: number;
  emergencyReadiness: number; // 0-1 scale
  lastUpdate: Date;
}

export interface IntelligenceCapability {
  name: string;
  status: 'offline' | 'online' | 'degraded';
  capability: string;
  importance: 'critical' | 'high' | 'medium';
  healthScore: number;
}

export interface Phase2Report {
  reportId: string;
  timestamp: Date;
  phase2Status: Phase2Status;
  intelligenceCapabilities: IntelligenceCapability[];
  systemPerformance: {
    processingCapacity: number;
    responseTime: number;
    accuracyScore: number;
    throughput: number;
  };
  emergencyProtocols: {
    active: number;
    standby: number;
    triggered: number;
  };
  recommendations: string[];
  nextActions: string[];
}

export class Phase2IntelligenceOrchestrator extends EventEmitter {
  private emergencyPhase2: EmergencyPhase2IntelligenceSystems;
  private currentStatus: Phase2Status | null = null;
  private monitoringActive: boolean = false;
  private statusUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.emergencyPhase2 = new EmergencyPhase2IntelligenceSystems();
    this.initializeEventHandlers();
  }

  /**
   * Initialize event handlers
   */
  private initializeEventHandlers(): void {
    this.emergencyPhase2.on('emergencyPhase2Completed', this.handlePhase2Completion.bind(this));
    this.emergencyPhase2.on('emergencyPhase2Failed', this.handlePhase2Failure.bind(this));
    this.emergencyPhase2.on('systemHealthDegraded', this.handleSystemHealthDegradation.bind(this));
    this.emergencyPhase2.on('deploymentDeadlineExceeded', this.handleDeadlineExceeded.bind(this));

    console.log('🔗 Phase 2 Intelligence Orchestrator event handlers initialized');
  }

  /**
   * Execute Emergency Phase 2 Intelligence Systems deployment
   */
  public async executePhase2IntelligenceDeployment(): Promise<Phase2Status> {
    console.log('🚨 ========================================');
    console.log('🚨 EMERGENCY PHASE 2: INTELLIGENCE SYSTEMS');
    console.log('🚨 TIMELINE: 16 HOURS MAXIMUM');
    console.log('🚨 ========================================');

    if (this.currentStatus && this.currentStatus.status === 'in_progress') {
      throw new Error('Emergency Phase 2 deployment already in progress');
    }

    const startTime = new Date();
    
    // Initialize status tracking
    this.currentStatus = {
      deploymentId: `phase2-${Date.now()}`,
      status: 'in_progress',
      startTime,
      progress: 0,
      timeRemaining: 16 * 60, // 16 hours in minutes
      criticalSystemsOnline: 0,
      totalCriticalSystems: 5, // Based on critical systems count
      emergencyReadiness: 0,
      lastUpdate: startTime
    };

    // Start monitoring
    this.startStatusMonitoring();

    try {
      console.log('🧠 Initiating intelligence systems deployment...');
      
      // Execute the deployment
      const deployment = await this.emergencyPhase2.executeEmergencyPhase2();
      
      // Update final status
      this.currentStatus.status = 'completed';
      this.currentStatus.endTime = new Date();
      this.currentStatus.progress = 100;
      this.currentStatus.emergencyReadiness = deployment.metrics.emergencyReadiness;
      this.currentStatus.criticalSystemsOnline = deployment.systems.filter(s => 
        s.priority === 'critical' && s.status === 'online'
      ).length;

      const totalTime = this.currentStatus.endTime.getTime() - this.currentStatus.startTime.getTime();
      const totalMinutes = Math.round(totalTime / 60000);

      console.log('✅ ========================================');
      console.log('✅ EMERGENCY PHASE 2 COMPLETED SUCCESSFULLY');
      console.log('✅ ========================================');
      console.log(`🎯 Deployment ID: ${this.currentStatus.deploymentId}`);
      console.log(`⏰ Total Time: ${totalMinutes} minutes (${(totalMinutes/60).toFixed(1)} hours)`);
      console.log(`🧠 Critical Systems: ${this.currentStatus.criticalSystemsOnline}/${this.currentStatus.totalCriticalSystems} online`);
      console.log(`🚨 Emergency Readiness: ${(this.currentStatus.emergencyReadiness * 100).toFixed(1)}%`);
      console.log('✅ ========================================');

      this.emit('phase2IntelligenceCompleted', this.currentStatus);

      return this.currentStatus;

    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ EMERGENCY PHASE 2 FAILED');
      console.error('❌ ========================================');
      console.error(`❌ Error: ${error}`);
      console.error('❌ ========================================');

      if (this.currentStatus) {
        this.currentStatus.status = 'failed';
        this.currentStatus.endTime = new Date();
      }

      this.emit('phase2IntelligenceFailed', { status: this.currentStatus, error });

      throw error;

    } finally {
      this.stopStatusMonitoring();
    }
  }

  /**
   * Generate comprehensive Phase 2 report
   */
  public generatePhase2Report(): Phase2Report {
    if (!this.currentStatus) {
      throw new Error('No Phase 2 deployment status available');
    }

    const activeDeployment = this.emergencyPhase2.getActiveDeployment();
    
    const intelligenceCapabilities: IntelligenceCapability[] = [];
    
    if (activeDeployment) {
      activeDeployment.systems.forEach(system => {
        system.emergencyCapabilities.forEach(capability => {
          intelligenceCapabilities.push({
            name: system.name,
            status: system.status === 'online' ? 'online' : 
                   system.status === 'degraded' ? 'degraded' : 'offline',
            capability,
            importance: system.priority,
            healthScore: system.healthScore
          });
        });
      });
    }

    const report: Phase2Report = {
      reportId: `phase2-report-${Date.now()}`,
      timestamp: new Date(),
      phase2Status: this.currentStatus,
      intelligenceCapabilities,
      systemPerformance: {
        processingCapacity: activeDeployment?.metrics.processingCapacity || 0,
        responseTime: activeDeployment?.metrics.responseTime || 0,
        accuracyScore: activeDeployment?.metrics.accuracyScore || 0,
        throughput: activeDeployment?.metrics.processingCapacity || 0
      },
      emergencyProtocols: {
        active: activeDeployment?.emergencyProtocols.filter(p => p.status === 'active').length || 0,
        standby: activeDeployment?.emergencyProtocols.filter(p => p.status === 'standby').length || 0,
        triggered: activeDeployment?.emergencyProtocols.filter(p => p.status === 'completed').length || 0
      },
      recommendations: this.generateRecommendations(),
      nextActions: this.generateNextActions()
    };

    return report;
  }

  /**
   * Start status monitoring
   */
  private startStatusMonitoring(): void {
    this.monitoringActive = true;
    
    this.statusUpdateInterval = setInterval(() => {
      this.updateStatus();
    }, 60000); // Update every minute

    console.log('📊 Phase 2 status monitoring started');
  }

  /**
   * Stop status monitoring
   */
  private stopStatusMonitoring(): void {
    this.monitoringActive = false;
    
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }

    console.log('📊 Phase 2 status monitoring stopped');
  }

  /**
   * Update status based on current deployment
   */
  private updateStatus(): void {
    if (!this.currentStatus || !this.monitoringActive) return;

    const activeDeployment = this.emergencyPhase2.getActiveDeployment();
    
    if (activeDeployment) {
      this.currentStatus.progress = activeDeployment.progress;
      this.currentStatus.timeRemaining = activeDeployment.timeRemaining;
      this.currentStatus.emergencyReadiness = activeDeployment.metrics.emergencyReadiness;
      this.currentStatus.criticalSystemsOnline = activeDeployment.systems.filter(s => 
        s.priority === 'critical' && s.status === 'online'
      ).length;
      this.currentStatus.lastUpdate = new Date();

      // Check for deadline concerns
      if (this.currentStatus.timeRemaining < 60 && this.currentStatus.progress < 80) {
        console.warn('⚠️ Phase 2 deployment may not meet deadline - less than 1 hour remaining');
        this.emit('phase2DeadlineWarning', this.currentStatus);
      }

      // Emit status update
      this.emit('phase2StatusUpdate', this.currentStatus);
    }
  }

  /**
   * Generate recommendations based on current status
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.currentStatus) return recommendations;

    if (this.currentStatus.emergencyReadiness < 0.9) {
      recommendations.push('Increase emergency readiness by deploying remaining systems');
    }

    if (this.currentStatus.criticalSystemsOnline < this.currentStatus.totalCriticalSystems) {
      recommendations.push('Priority focus on bringing all critical systems online');
    }

    if (this.currentStatus.timeRemaining < 120 && this.currentStatus.progress < 70) {
      recommendations.push('Consider activating Phase 3 emergency protocols');
    }

    if (this.currentStatus.status === 'completed') {
      recommendations.push('Phase 2 completed successfully - ready for Phase 3 deployment');
    }

    return recommendations;
  }

  /**
   * Generate next actions based on current status
   */
  private generateNextActions(): string[] {
    const nextActions: string[] = [];
    
    if (!this.currentStatus) return nextActions;

    switch (this.currentStatus.status) {
      case 'in_progress':
        nextActions.push('Monitor deployment progress');
        nextActions.push('Ensure critical systems come online first');
        nextActions.push('Prepare Phase 3 emergency protocols');
        break;
        
      case 'completed':
        nextActions.push('Validate all intelligence systems are operational');
        nextActions.push('Begin Phase 3 deployment preparation');
        nextActions.push('Activate continuous monitoring protocols');
        break;
        
      case 'failed':
        nextActions.push('Analyze failure root cause');
        nextActions.push('Activate Phase 3 emergency protocols');
        nextActions.push('Implement emergency recovery procedures');
        break;
        
      case 'deadline_exceeded':
        nextActions.push('Activate Phase 4 emergency protocols');
        nextActions.push('Implement crisis management procedures');
        nextActions.push('Notify executive emergency team');
        break;
    }

    return nextActions;
  }

  /**
   * Event handlers
   */
  private handlePhase2Completion(deployment: IntelligenceDeployment): void {
    console.log('✅ Phase 2 Intelligence Systems deployment completed successfully');
    
    if (this.currentStatus) {
      this.currentStatus.status = 'completed';
      this.currentStatus.endTime = new Date();
    }
  }

  private handlePhase2Failure(event: { deployment: IntelligenceDeployment; error: any }): void {
    console.error('❌ Phase 2 Intelligence Systems deployment failed:', event.error);
    
    if (this.currentStatus) {
      this.currentStatus.status = 'failed';
      this.currentStatus.endTime = new Date();
    }
  }

  private handleSystemHealthDegradation(event: { system: any; deployment: IntelligenceDeployment }): void {
    console.warn(`⚠️ System health degraded: ${event.system.name}`);
    this.emit('systemHealthAlert', event);
  }

  private handleDeadlineExceeded(deployment: IntelligenceDeployment): void {
    console.error('❌ Phase 2 deployment deadline exceeded');
    
    if (this.currentStatus) {
      this.currentStatus.status = 'deadline_exceeded';
      this.currentStatus.endTime = new Date();
    }
    
    this.emit('phase2DeadlineExceeded', this.currentStatus);
  }

  /**
   * Public methods
   */
  public getCurrentStatus(): Phase2Status | null {
    return this.currentStatus;
  }

  public getIntelligenceSystemStatus(systemId: string): any {
    return this.emergencyPhase2.getSystemStatus(systemId);
  }

  public async emergencySystemRestart(systemId: string): Promise<void> {
    console.log(`🔄 Initiating emergency restart for system: ${systemId}`);
    await this.emergencyPhase2.emergencySystemRestart(systemId);
    
    this.emit('emergencySystemRestart', { systemId, timestamp: new Date() });
  }

  public isPhase2Complete(): boolean {
    return this.currentStatus?.status === 'completed' || false;
  }

  public getPhase2Duration(): number {
    if (!this.currentStatus) return 0;
    
    const endTime = this.currentStatus.endTime || new Date();
    return endTime.getTime() - this.currentStatus.startTime.getTime();
  }

  public getEmergencyReadiness(): number {
    return this.currentStatus?.emergencyReadiness || 0;
  }
}
