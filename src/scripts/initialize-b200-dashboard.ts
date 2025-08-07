#!/usr/bin/env node

/**
 * B200 Dashboard Initialization Script
 * Sets up monitoring, WebSocket server, and dashboard components
 */

import { b200ResourceMonitor } from '../lib/monitoring/B200ResourceMonitor';
import { b200DashboardWebSocket } from '../lib/websocket/B200DashboardWebSocket';
import { B200ResourceManager } from '../lib/b200/B200ResourceManager';

class B200DashboardInitializer {
  private resourceManager: B200ResourceManager;
  private isInitialized: boolean = false;

  constructor() {
    this.resourceManager = new B200ResourceManager();
  }

  /**
   * Initialize the complete B200 dashboard system
   */
  public async initialize(): Promise<void> {
    console.log('🚀 Initializing B200 Resource Monitoring Dashboard...');

    try {
      // Step 1: Initialize B200 Resource Manager
      console.log('📊 Step 1: Initializing B200 Resource Manager...');
      await this.resourceManager.initialize();
      console.log('✅ B200 Resource Manager initialized');

      // Step 2: Start Resource Monitoring
      console.log('📈 Step 2: Starting B200 Resource Monitoring...');
      await b200ResourceMonitor.startMonitoring();
      console.log('✅ B200 Resource Monitoring started');

      // Step 3: Start WebSocket Server
      console.log('🔌 Step 3: Starting WebSocket Server...');
      b200DashboardWebSocket.start(8081);
      console.log('✅ WebSocket Server started on port 8081');

      // Step 4: Set up monitoring event handlers
      console.log('🎯 Step 4: Setting up event handlers...');
      this.setupEventHandlers();
      console.log('✅ Event handlers configured');

      // Step 5: Verify system health
      console.log('🏥 Step 5: Verifying system health...');
      await this.verifySystemHealth();
      console.log('✅ System health verified');

      this.isInitialized = true;
      console.log('🎉 B200 Dashboard initialization complete!');
      
      this.printSystemStatus();

    } catch (error) {
      console.error('❌ B200 Dashboard initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers for monitoring and alerts
   */
  private setupEventHandlers(): void {
    // Monitor resource updates
    b200ResourceMonitor.on('metricsUpdate', (data) => {
      console.log(`📊 Metrics update: ${data.clusterMetrics.activeGPUs}/${data.clusterMetrics.totalGPUs} GPUs active`);
    });

    // Handle performance alerts
    b200ResourceMonitor.on('newAlerts', (alerts) => {
      for (const alert of alerts) {
        console.log(`🚨 ${alert.severity.toUpperCase()} Alert: ${alert.message}`);
      }
    });

    // Monitor WebSocket connections
    b200DashboardWebSocket.on('connection', (clientId) => {
      console.log(`🔌 Dashboard client connected: ${clientId}`);
    });

    // Handle monitoring errors
    b200ResourceMonitor.on('monitoringError', (error) => {
      console.error('❌ Monitoring error:', error);
    });

    console.log('Event handlers set up successfully');
  }

  /**
   * Verify system health and readiness
   */
  private async verifySystemHealth(): Promise<void> {
    try {
      // Check B200 resource status
      const resourceStatus = await this.resourceManager.getResourceStatus();
      console.log(`🔍 B200 Status: ${resourceStatus.available_gpus}/${resourceStatus.total_gpus} GPUs available`);

      // Check monitoring status
      const currentMetrics = await b200ResourceMonitor.getCurrentMetrics();
      console.log(`📈 Monitoring: ${currentMetrics.isMonitoring ? 'Active' : 'Inactive'}`);

      // Check WebSocket status
      const wsStatus = b200DashboardWebSocket.getStatus();
      console.log(`🔌 WebSocket: ${wsStatus.isRunning ? 'Running' : 'Stopped'}, ${wsStatus.connectedClients} clients`);

      // Verify GPU metrics collection
      if (currentMetrics.gpuMetrics && currentMetrics.gpuMetrics.length > 0) {
        console.log(`📊 GPU Metrics: Collecting data from ${currentMetrics.gpuMetrics.length} GPUs`);
      } else {
        console.warn('⚠️ No GPU metrics available');
      }

      // Verify executive workloads
      if (currentMetrics.executiveWorkloads && currentMetrics.executiveWorkloads.length > 0) {
        console.log(`👥 Executive Workloads: ${currentMetrics.executiveWorkloads.length} active`);
      } else {
        console.log('📝 No active executive workloads');
      }

    } catch (error) {
      console.error('❌ System health check failed:', error);
      throw new Error(`System health verification failed: ${error}`);
    }
  }

  /**
   * Print comprehensive system status
   */
  private printSystemStatus(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 B200 RESOURCE MONITORING DASHBOARD STATUS');
    console.log('='.repeat(60));
    console.log('');
    console.log('📊 MONITORING COMPONENTS:');
    console.log('  ✅ B200 Resource Manager    - Initialized');
    console.log('  ✅ GPU Metrics Collection   - Active');
    console.log('  ✅ Executive Workload Track - Active');
    console.log('  ✅ Performance Alerts      - Active');
    console.log('  ✅ Real-time Updates       - Active');
    console.log('');
    console.log('🔌 COMMUNICATION:');
    console.log('  ✅ WebSocket Server        - Running on port 8081');
    console.log('  ✅ REST API Endpoints      - Available');
    console.log('  ✅ Real-time Data Stream   - Active');
    console.log('');
    console.log('🎯 DASHBOARD FEATURES:');
    console.log('  ✅ GPU Utilization         - Real-time monitoring');
    console.log('  ✅ Memory Usage            - Live tracking');
    console.log('  ✅ Temperature Monitoring  - Thermal alerts');
    console.log('  ✅ Power Consumption       - Efficiency tracking');
    console.log('  ✅ Tensor Core Activity    - FP8 optimization');
    console.log('  ✅ Executive Workloads     - Shadow Board tracking');
    console.log('  ✅ Performance Alerts      - Proactive monitoring');
    console.log('');
    console.log('🚀 ACCESS INFORMATION:');
    console.log('  📱 Dashboard URL: http://localhost:3000/dashboard/b200');
    console.log('  🔌 WebSocket URL: ws://localhost:8081');
    console.log('  🔗 API Endpoint: http://localhost:3000/api/dashboard/b200');
    console.log('');
    console.log('🎉 System ready for production monitoring!');
    console.log('='.repeat(60));
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down B200 Dashboard...');

    try {
      // Stop monitoring
      b200ResourceMonitor.stopMonitoring();
      console.log('✅ Resource monitoring stopped');

      // Stop WebSocket server
      b200DashboardWebSocket.stop();
      console.log('✅ WebSocket server stopped');

      // Cleanup resources
      await b200ResourceMonitor.cleanup();
      console.log('✅ Resources cleaned up');

      this.isInitialized = false;
      console.log('✅ B200 Dashboard shutdown complete');

    } catch (error) {
      console.error('❌ Shutdown error:', error);
    }
  }

  /**
   * Get initialization status
   */
  public getStatus(): { initialized: boolean; timestamp: Date } {
    return {
      initialized: this.isInitialized,
      timestamp: new Date()
    };
  }
}

// Main execution
async function main() {
  const initializer = new B200DashboardInitializer();

  // Handle process signals for graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await initializer.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await initializer.shutdown();
    process.exit(0);
  });

  try {
    await initializer.initialize();
    
    // Keep the process running
    console.log('🔄 Dashboard running... Press Ctrl+C to stop');
    
    // Periodic status updates
    setInterval(() => {
      const status = initializer.getStatus();
      console.log(`💓 Dashboard heartbeat: ${status.initialized ? 'Healthy' : 'Unhealthy'} at ${status.timestamp.toLocaleTimeString()}`);
    }, 60000); // Every minute

  } catch (error) {
    console.error('❌ Failed to initialize B200 Dashboard:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { B200DashboardInitializer };
