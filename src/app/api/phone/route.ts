/**
 * Phone System API Endpoints
 * Handles phone system operations, call management, and status monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getPhoneSystemManager, 
  phoneSystemHealthCheck,
  makeOutboundCall,
  getUserPhoneNumbers,
  getActiveCallsForUser,
  releaseUserPhoneNumbers
} from '@/lib/telephony/initializePhoneSystem';

/**
 * GET /api/phone - Get phone system status and user phone info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    switch (action) {
      case 'health':
        return await handleHealthCheck();
      
      case 'user-numbers':
        if (!userId) {
          return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }
        return await handleGetUserNumbers(userId);
      
      case 'active-calls':
        if (!userId) {
          return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }
        return await handleGetActiveCalls(userId);
      
      case 'system-status':
        return await handleSystemStatus();
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Phone API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/phone - Make outbound calls and manage phone operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'make-call':
        return await handleMakeCall(body);
      
      case 'release-numbers':
        return await handleReleaseNumbers(body);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Phone API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle health check request
 */
async function handleHealthCheck() {
  const healthCheck = await phoneSystemHealthCheck();
  
  return NextResponse.json({
    healthy: healthCheck.healthy,
    status: healthCheck.status,
    error: healthCheck.error,
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle get user phone numbers
 */
async function handleGetUserNumbers(userId: string) {
  const phoneNumbers = getUserPhoneNumbers(userId);
  const phoneSystemManager = getPhoneSystemManager();
  
  if (!phoneSystemManager) {
    return NextResponse.json({ error: 'Phone system not initialized' }, { status: 503 });
  }

  const allocation = phoneSystemManager.getUserPhoneAllocation(userId);
  
  return NextResponse.json({
    userId,
    phoneNumbers,
    allocation: allocation ? {
      sovrenAI: allocation.phoneNumbers.sovrenAI,
      executives: allocation.phoneNumbers.executives,
      areaCode: allocation.areaCode,
      geography: allocation.geography,
      subscriptionTier: allocation.subscriptionTier,
      monthlyRate: allocation.monthlyRate,
      provisionedAt: allocation.provisionedAt
    } : null
  });
}

/**
 * Handle get active calls
 */
async function handleGetActiveCalls(userId: string) {
  const activeCalls = getActiveCallsForUser(userId);
  
  return NextResponse.json({
    userId,
    activeCalls: activeCalls.map(call => ({
      callId: call.callId,
      executiveRole: call.executiveRole,
      phoneNumber: call.phoneNumber,
      callerNumber: call.callerNumber,
      startTime: call.startTime,
      status: call.status,
      duration: call.duration
    }))
  });
}

/**
 * Handle system status request
 */
async function handleSystemStatus() {
  const phoneSystemManager = getPhoneSystemManager();
  
  if (!phoneSystemManager) {
    return NextResponse.json({ error: 'Phone system not initialized' }, { status: 503 });
  }

  const status = await phoneSystemManager.getSystemStatus();
  
  return NextResponse.json({
    ...status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}

/**
 * Handle make outbound call
 */
async function handleMakeCall(body: any) {
  const { userId, executiveRole, toNumber, fromNumber } = body;

  // Validate required fields
  if (!userId || !executiveRole || !toNumber) {
    return NextResponse.json({
      error: 'Missing required fields: userId, executiveRole, toNumber'
    }, { status: 400 });
  }

  // Validate phone number format
  const phoneRegex = /^\+?1?[0-9]{10}$/;
  if (!phoneRegex.test(toNumber.replace(/\D/g, ''))) {
    return NextResponse.json({
      error: 'Invalid phone number format'
    }, { status: 400 });
  }

  try {
    const callId = await makeOutboundCall(userId, executiveRole, toNumber, fromNumber);
    
    if (!callId) {
      return NextResponse.json({
        error: 'Failed to initiate call'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      callId,
      userId,
      executiveRole,
      toNumber,
      fromNumber,
      initiatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to make outbound call:', error);
    return NextResponse.json({
      error: 'Failed to initiate call'
    }, { status: 500 });
  }
}

/**
 * Handle release user phone numbers
 */
async function handleReleaseNumbers(body: any) {
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({
      error: 'Missing required field: userId'
    }, { status: 400 });
  }

  try {
    const released = await releaseUserPhoneNumbers(userId);
    
    return NextResponse.json({
      success: released,
      userId,
      releasedAt: released ? new Date().toISOString() : null,
      error: released ? null : 'Failed to release phone numbers'
    });

  } catch (error) {
    console.error('Failed to release phone numbers:', error);
    return NextResponse.json({
      error: 'Failed to release phone numbers'
    }, { status: 500 });
  }
}

/**
 * PUT /api/phone - Update phone system configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Future: Handle phone system configuration updates
    // For now, return not implemented
    
    return NextResponse.json({
      error: 'Configuration updates not yet implemented'
    }, { status: 501 });

  } catch (error) {
    console.error('Phone API PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/phone - Delete phone system resources
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const released = await releaseUserPhoneNumbers(userId);
    
    return NextResponse.json({
      success: released,
      userId,
      releasedAt: released ? new Date().toISOString() : null
    });

  } catch (error) {
    console.error('Phone API DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
