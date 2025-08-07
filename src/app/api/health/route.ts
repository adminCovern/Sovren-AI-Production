/**
 * Health Check API Endpoint
 * Provides system health status including phone system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerStatus, initializeServer } from '@/lib/server/startup';
import { phoneSystemHealthCheck } from '@/lib/telephony/initializePhoneSystem';

export async function GET(request: NextRequest) {
  try {
    // Initialize server if not already done
    await initializeServer();

    // Get overall server status
    const serverStatus = await getServerStatus();

    // Get phone system health
    const phoneHealth = await phoneSystemHealthCheck();

    // Determine overall health
    const overallHealth = phoneHealth.healthy;

    const response = {
      healthy: overallHealth,
      timestamp: new Date().toISOString(),
      server: serverStatus,
      phoneSystem: {
        healthy: phoneHealth.healthy,
        status: phoneHealth.status,
        error: phoneHealth.error
      },
      services: {
        database: true, // Would check actual database connection
        redis: true,    // Would check actual Redis connection
        phoneSystem: phoneHealth.healthy
      }
    };

    return NextResponse.json(response, {
      status: overallHealth ? 200 : 503
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
