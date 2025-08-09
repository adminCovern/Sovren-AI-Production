/**
 * CLIENT BOOTSTRAP
 * Client-safe application initialization without server dependencies
 */

export interface ClientApplicationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
}

/**
 * Client-side application bootstrap
 */
export class ClientBootstrap {
  private static instance: ClientBootstrap | null = null;
  private state: ClientApplicationState = {
    isInitialized: false,
    isLoading: false,
    error: null,
    healthStatus: 'unknown'
  };

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ClientBootstrap {
    if (!ClientBootstrap.instance) {
      ClientBootstrap.instance = new ClientBootstrap();
    }
    return ClientBootstrap.instance;
  }

  /**
   * Initialize client-side application
   */
  public async initialize(): Promise<boolean> {
    if (this.state.isInitialized) {
      console.log('Client application already initialized');
      return true;
    }

    this.state.isLoading = true;
    this.state.error = null;

    try {
      console.log('🚀 Initializing client application...');

      // Client-side initialization (no server dependencies)
      await this.initializeClientServices();

      this.state.isInitialized = true;
      this.state.isLoading = false;
      this.state.healthStatus = 'healthy';

      console.log('✅ Client application initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Client application initialization failed:', error);
      this.state.error = error instanceof Error ? error.message : String(error);
      this.state.isLoading = false;
      this.state.healthStatus = 'unhealthy';
      return false;
    }
  }

  /**
   * Initialize client-side services
   */
  private async initializeClientServices(): Promise<void> {
    // Initialize client-side services only
    // No server dependencies here
    console.log('🔧 Initializing client services...');
    
    // Simulate initialization time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ Client services initialized');
  }

  /**
   * Get application state
   */
  public getState(): ClientApplicationState {
    return { ...this.state };
  }

  /**
   * Check application health (client-side only)
   */
  public async checkHealth(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // Client-side health checks
      if (!this.state.isInitialized) {
        return 'unhealthy';
      }

      // Check if we can reach the API
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-store'
      });
      
      if (response.ok) {
        this.state.healthStatus = 'healthy';
        return 'healthy';
      } else {
        this.state.healthStatus = 'unhealthy';
        return 'unhealthy';
      }

    } catch (error) {
      console.error('Health check failed:', error);
      this.state.healthStatus = 'unhealthy';
      return 'unhealthy';
    }
  }

  /**
   * Cleanup client resources
   */
  public async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up client application...');
      
      this.state.isInitialized = false;
      this.state.healthStatus = 'unknown';
      
      console.log('✅ Client cleanup complete');
    } catch (error) {
      console.error('❌ Client cleanup failed:', error);
    }
  }
}

// Convenience functions for client use
export async function initializeClientApplication(): Promise<boolean> {
  const bootstrap = ClientBootstrap.getInstance();
  return await bootstrap.initialize();
}

export function getClientApplicationState(): ClientApplicationState {
  const bootstrap = ClientBootstrap.getInstance();
  return bootstrap.getState();
}

export async function checkClientApplicationHealth(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
  const bootstrap = ClientBootstrap.getInstance();
  return await bootstrap.checkHealth();
}
