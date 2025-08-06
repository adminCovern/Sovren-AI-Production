/**
 * Server Startup Initialization
 * Initializes all critical systems when the server starts
 */

import { initializePhoneSystem } from '@/lib/telephony/initializePhoneSystem';

let isInitialized = false;

/**
 * Initialize all server systems
 */
export async function initializeServer(): Promise<boolean> {
  if (isInitialized) {
    console.log('⚠️ Server already initialized, skipping...');
    return true;
  }

  try {
    console.log('🚀 Starting SOVREN AI Server Initialization...');
    
    const startTime = Date.now();

    // Initialize Phone System
    console.log('📞 Initializing Phone System...');
    const phoneSystem = await initializePhoneSystem();
    
    if (!phoneSystem) {
      console.error('❌ Phone system initialization failed');
      // Don't fail server startup, but log the issue
    } else {
      console.log('✅ Phone system initialized successfully');
    }

    // Future: Initialize other systems here
    // - Voice synthesis system
    // - Shadow Board AI models
    // - Database connections
    // - Redis cache
    // - External integrations

    const initTime = Date.now() - startTime;
    console.log(`✅ SOVREN AI Server initialized in ${initTime}ms`);
    
    isInitialized = true;
    return true;

  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    return false;
  }
}

/**
 * Check if server is initialized
 */
export function isServerInitialized(): boolean {
  return isInitialized;
}

/**
 * Get server status
 */
export async function getServerStatus() {
  return {
    initialized: isInitialized,
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
}
