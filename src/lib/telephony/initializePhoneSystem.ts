/**
 * Phone System Initialization
 * Sets up the complete SOVREN AI phone system on server startup
 */

import { PhoneSystemManager, PhoneSystemConfig } from './PhoneSystemManager';

let phoneSystemManager: PhoneSystemManager | null = null;

/**
 * Initialize the phone system with environment configuration
 */
export async function initializePhoneSystem(): Promise<PhoneSystemManager | null> {
  try {
    console.log('🚀 Initializing SOVREN AI Phone System...');

    // Validate environment variables
    const requiredEnvVars = [
      'SKYETEL_API_KEY',
      'SKYETEL_API_SECRET',
      'SKYETEL_API_URL',
      'SIP_DOMAIN',
      'FREESWITCH_HOST',
      'FREESWITCH_ESL_PORT',
      'FREESWITCH_ESL_PASSWORD'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    // Build configuration from environment
    const config: PhoneSystemConfig = {
      skyetel: {
        apiKey: process.env.SKYETEL_API_KEY!,
        apiSecret: process.env.SKYETEL_API_SECRET!,
        baseUrl: process.env.SKYETEL_API_URL!,
        sipDomain: process.env.SIP_DOMAIN!
      },
      freeswitch: {
        host: process.env.FREESWITCH_HOST!,
        port: parseInt(process.env.FREESWITCH_PORT || '5060'),
        eslPort: parseInt(process.env.FREESWITCH_ESL_PORT!),
        eslPassword: process.env.FREESWITCH_ESL_PASSWORD!,
        sipDomain: process.env.SIP_DOMAIN!
      }
    };

    // Create phone system manager
    phoneSystemManager = new PhoneSystemManager(config);

    // Initialize the system
    const initialized = await phoneSystemManager.initialize();
    
    if (!initialized) {
      throw new Error('Phone system initialization failed');
    }

    // Load existing user allocations
    await phoneSystemManager.loadUserAllocations();

    // Set up graceful shutdown
    setupGracefulShutdown();

    console.log('✅ SOVREN AI Phone System initialized successfully');
    
    // Log system status
    const status = await phoneSystemManager.getSystemStatus();
    console.log('📊 Phone System Status:', {
      activeUsers: status.activeUsers,
      totalPhoneNumbers: status.totalPhoneNumbers,
      skyetelConnected: status.skyetelConnected,
      freeswitchConnected: status.freeswitchConnected
    });

    return phoneSystemManager;

  } catch (error) {
    console.error('❌ Failed to initialize phone system:', error);
    return null;
  }
}

/**
 * Get the initialized phone system manager
 */
export function getPhoneSystemManager(): PhoneSystemManager | null {
  return phoneSystemManager;
}

/**
 * Set up graceful shutdown handlers
 */
function setupGracefulShutdown(): void {
  const shutdownHandler = async (signal: string) => {
    console.log(`📞 Received ${signal}, shutting down phone system gracefully...`);
    
    if (phoneSystemManager) {
      await phoneSystemManager.shutdown();
      phoneSystemManager = null;
    }
    
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));
  process.on('SIGUSR2', () => shutdownHandler('SIGUSR2')); // For nodemon
}

/**
 * Health check for phone system
 */
export async function phoneSystemHealthCheck(): Promise<{
  healthy: boolean;
  status: any;
  error?: string;
}> {
  try {
    if (!phoneSystemManager) {
      return {
        healthy: false,
        status: null,
        error: 'Phone system not initialized'
      };
    }

    const status = await phoneSystemManager.getSystemStatus();
    
    const healthy = status.skyetelConnected && status.freeswitchConnected;

    return {
      healthy,
      status,
      error: healthy ? undefined : 'One or more phone system components are disconnected'
    };

  } catch (error) {
    return {
      healthy: false,
      status: null,
      error: error instanceof Error ? error.message : 'Unknown health check error'
    };
  }
}

/**
 * Provision phone numbers for a new user
 */
export async function provisionUserPhoneNumbers(
  userId: string,
  subscriptionTier: 'sovren_proof' | 'sovren_proof_plus',
  geography: string,
  userEmail: string,
  companyName: string
) {
  if (!phoneSystemManager) {
    throw new Error('Phone system not initialized');
  }

  return await phoneSystemManager.provisionUserPhoneNumbers(
    userId,
    subscriptionTier,
    geography,
    userEmail,
    companyName
  );
}

/**
 * Make an outbound call
 */
export async function makeOutboundCall(
  userId: string,
  executiveRole: string,
  toNumber: string,
  fromNumber?: string
) {
  if (!phoneSystemManager) {
    throw new Error('Phone system not initialized');
  }

  return await phoneSystemManager.makeOutboundCall({
    userId,
    executiveRole,
    toNumber,
    fromNumber
  });
}

/**
 * Get user's phone numbers
 */
export function getUserPhoneNumbers(userId: string): string[] {
  if (!phoneSystemManager) {
    return [];
  }

  return phoneSystemManager.getUserPhoneNumbers(userId);
}

/**
 * Get active calls for user
 */
export function getActiveCallsForUser(userId: string) {
  if (!phoneSystemManager) {
    return [];
  }

  return phoneSystemManager.getActiveCallsForUser(userId);
}

/**
 * Release user's phone numbers
 */
export async function releaseUserPhoneNumbers(userId: string): Promise<boolean> {
  if (!phoneSystemManager) {
    return false;
  }

  return await phoneSystemManager.releaseUserPhoneNumbers(userId);
}
