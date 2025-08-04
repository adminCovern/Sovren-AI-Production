/**
 * APPLICATION BOOTSTRAP
 * Production-ready application initialization with dependency injection
 */

import { container, SERVICE_IDENTIFIERS } from '../di/DIContainer';
import { registerServices, initializeServices, cleanupServices, Logger } from '../di/ServiceRegistry';
import { SOVRENAICore } from '../sovren/SOVRENAICore';

/**
 * Application bootstrap class
 */
export class ApplicationBootstrap {
  private static instance: ApplicationBootstrap | null = null;
  private isInitialized: boolean = false;
  private sovrenCore: SOVRENAICore | null = null;
  private logger: Logger | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ApplicationBootstrap {
    if (!ApplicationBootstrap.instance) {
      ApplicationBootstrap.instance = new ApplicationBootstrap();
    }
    return ApplicationBootstrap.instance;
  }

  /**
   * Initialize the entire application
   */
  public async initialize(): Promise<SOVRENAICore> {
    if (this.isInitialized && this.sovrenCore) {
      return this.sovrenCore;
    }

    try {
      // Step 1: Register all services
      console.log('🔧 Registering application services...');
      registerServices();

      // Step 2: Initialize infrastructure services
      console.log('🚀 Initializing infrastructure services...');
      await initializeServices();

      // Step 3: Get logger
      this.logger = container.resolve<Logger>(SERVICE_IDENTIFIERS.LOGGER);
      this.logger.info('📋 Logger initialized');

      // Step 4: Resolve SOVREN AI Core with all dependencies
      this.logger.info('🧠 Initializing SOVREN AI Core...');
      this.sovrenCore = container.resolve<SOVRENAICore>(SERVICE_IDENTIFIERS.SOVREN_AI_CORE);

      // Step 5: Initialize SOVREN AI Core
      await this.sovrenCore.initialize();

      this.isInitialized = true;
      this.logger.info('✅ Application bootstrap completed successfully');

      return this.sovrenCore;

    } catch (error) {
      const errorMessage = `❌ Application bootstrap failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      if (this.logger) {
        this.logger.error(errorMessage, error);
      } else {
        console.error(errorMessage, error);
      }
      
      throw error;
    }
  }

  /**
   * Get the initialized SOVREN AI Core instance
   */
  public getSOVRENCore(): SOVRENAICore {
    if (!this.isInitialized || !this.sovrenCore) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    return this.sovrenCore;
  }

  /**
   * Check if application is initialized
   */
  public isAppInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      if (this.logger) {
        this.logger.info('🛑 Shutting down application...');
      } else {
        console.log('🛑 Shutting down application...');
      }

      // Cleanup services
      await cleanupServices();

      // Reset state
      this.isInitialized = false;
      this.sovrenCore = null;
      this.logger = null;

      console.log('✅ Application shutdown completed');

    } catch (error) {
      const errorMessage = `❌ Application shutdown failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      if (this.logger) {
        this.logger.error(errorMessage, error);
      } else {
        console.error(errorMessage, error);
      }
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, boolean>;
    timestamp: Date;
  }> {
    const services: Record<string, boolean> = {};
    let overallHealthy = true;

    try {
      // Check if core services are available
      const serviceChecks = [
        { name: 'Logger', identifier: SERVICE_IDENTIFIERS.LOGGER },
        { name: 'AuthenticationSystem', identifier: SERVICE_IDENTIFIERS.AUTHENTICATION_SYSTEM },
        { name: 'ShadowBoardManager', identifier: SERVICE_IDENTIFIERS.SHADOW_BOARD_MANAGER },
        { name: 'VoiceSystemManager', identifier: SERVICE_IDENTIFIERS.VOICE_SYSTEM_MANAGER },
        { name: 'CRMIntegrationSystem', identifier: SERVICE_IDENTIFIERS.CRM_INTEGRATION_SYSTEM },
        { name: 'EmailOrchestrationExecutives', identifier: SERVICE_IDENTIFIERS.EMAIL_ORCHESTRATION_EXECUTIVES },
        { name: 'TTSBackendService', identifier: SERVICE_IDENTIFIERS.TTS_BACKEND_SERVICE },
        { name: 'SOVRENAICore', identifier: SERVICE_IDENTIFIERS.SOVREN_AI_CORE }
      ];

      for (const check of serviceChecks) {
        try {
          const service = container.resolve(check.identifier);
          services[check.name] = !!service;
        } catch (error) {
          services[check.name] = false;
          overallHealthy = false;
        }
      }

      // Check SOVREN Core initialization
      if (this.sovrenCore) {
        const state = this.sovrenCore.getState();
        services['SOVRENCore_Online'] = state.isOnline;
        if (!state.isOnline) {
          overallHealthy = false;
        }
      } else {
        services['SOVRENCore_Online'] = false;
        overallHealthy = false;
      }

    } catch (error) {
      overallHealthy = false;
      if (this.logger) {
        this.logger.error('Health check failed:', error);
      }
    }

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date()
    };
  }
}

/**
 * Global application instance
 */
export const app = ApplicationBootstrap.getInstance();

/**
 * Initialize application (convenience function)
 */
export async function initializeApplication(): Promise<SOVRENAICore> {
  return app.initialize();
}

/**
 * Get SOVREN AI Core instance (convenience function)
 */
export function getSOVRENCore(): SOVRENAICore {
  return app.getSOVRENCore();
}

/**
 * Shutdown application (convenience function)
 */
export async function shutdownApplication(): Promise<void> {
  return app.shutdown();
}

/**
 * Application health check (convenience function)
 */
export async function checkApplicationHealth() {
  return app.healthCheck();
}

// Handle process termination gracefully
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await shutdownApplication();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await shutdownApplication();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await shutdownApplication();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await shutdownApplication();
  process.exit(1);
});
