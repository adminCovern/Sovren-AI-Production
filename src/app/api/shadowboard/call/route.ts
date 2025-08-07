/**
 * SHADOW BOARD EXECUTIVE CALLING API
 * Allows users to make calls through their Shadow Board executives
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSOVRENCore } from '@/lib/bootstrap/ApplicationBootstrap';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { rateLimiters, getClientId } from '@/middleware/rateLimit';

export interface ExecutiveCallRequest {
  userId: string;
  executiveRole: string;
  targetNumber: string;
  callPurpose: 'sales' | 'support' | 'negotiation' | 'follow-up' | 'meeting' | 'emergency';
  message?: string;
  context?: {
    customerName?: string;
    dealValue?: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    expectedDuration?: number;
    followUpRequired?: boolean;
    notes?: string;
  };
}

export interface ExecutiveCallResponse {
  success: boolean;
  callId: string;
  executive: {
    name: string;
    role: string;
    phoneNumber: string;
  };
  call: {
    targetNumber: string;
    purpose: string;
    status: string;
    initiatedAt: string;
    estimatedDuration?: number;
  };
  voiceProfile: {
    voiceModel: string;
    characteristics: any;
  };
}

export interface CallControlRequest {
  userId: string;
  callId: string;
  action: 'speak' | 'end' | 'transfer' | 'hold' | 'record';
  data?: {
    message?: string;
    transferTo?: string;
    notes?: string;
  };
}

/**
 * POST /api/shadowboard/call - Make a call through a Shadow Board executive
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExecutiveCallRequest = await request.json();

    // Rate limiting
    const clientId = getClientId(request);
    const rateLimiter = rateLimiters.get('shadowboard') || rateLimiters.get('default')!;
    
    if (!rateLimiter.check(clientId)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Authentication check
    if (!body.userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const isAuthenticated = await authSystem.validateSession(body.userId);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validation
    if (!body.executiveRole || !body.targetNumber || !body.callPurpose) {
      return NextResponse.json({ 
        error: 'executiveRole, targetNumber, and callPurpose are required' 
      }, { status: 400 });
    }

    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();

    // Check if voice integration is available
    if (!shadowBoard.isVoiceIntegrationAvailable()) {
      return NextResponse.json({ 
        error: 'Voice integration not available. Please contact support.' 
      }, { status: 503 });
    }

    // Get executive
    const executive = shadowBoard.getExecutive(body.executiveRole.toUpperCase());
    if (!executive) {
      return NextResponse.json({ 
        error: `Executive with role '${body.executiveRole}' not found` 
      }, { status: 404 });
    }

    // Get executive voice profile
    const voiceProfiles = shadowBoard.getExecutiveVoiceProfiles();
    const voiceProfile = voiceProfiles.find(p => p.executiveRole === body.executiveRole.toUpperCase());
    
    if (!voiceProfile) {
      return NextResponse.json({ 
        error: `Voice profile not found for executive '${body.executiveRole}'` 
      }, { status: 404 });
    }

    if (!voiceProfile.canMakeCalls) {
      return NextResponse.json({ 
        error: `Executive '${body.executiveRole}' cannot make calls` 
      }, { status: 403 });
    }

    // Check if executive is available
    if (voiceProfile.currentCallCount >= voiceProfile.maxConcurrentCalls) {
      return NextResponse.json({ 
        error: `Executive '${body.executiveRole}' is currently at maximum call capacity` 
      }, { status: 429 });
    }

    try {
      // Initiate the call
      const callId = await shadowBoard.makeExecutiveCall(
        body.executiveRole.toUpperCase(),
        body.targetNumber,
        body.callPurpose,
        body.message,
        body.context
      );

      const response: ExecutiveCallResponse = {
        success: true,
        callId,
        executive: {
          name: executive.name,
          role: executive.role,
          phoneNumber: voiceProfile.phoneNumber
        },
        call: {
          targetNumber: body.targetNumber,
          purpose: body.callPurpose,
          status: 'initiating',
          initiatedAt: new Date().toISOString(),
          estimatedDuration: body.context?.expectedDuration
        },
        voiceProfile: {
          voiceModel: voiceProfile.voiceModelId,
          characteristics: voiceProfile.voiceCharacteristics
        }
      };

      return NextResponse.json(response);

    } catch (error) {
      console.error('Failed to initiate executive call:', error);
      return NextResponse.json({ 
        error: 'Failed to initiate call' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Shadow Board call API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/shadowboard/call - Control an active call
 */
export async function PUT(request: NextRequest) {
  try {
    const body: CallControlRequest = await request.json();

    // Rate limiting
    const clientId = getClientId(request);
    const rateLimiter = rateLimiters.get('shadowboard') || rateLimiters.get('default')!;
    
    if (!rateLimiter.check(clientId)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Authentication check
    if (!body.userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const isAuthenticated = await authSystem.validateSession(body.userId);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validation
    if (!body.callId || !body.action) {
      return NextResponse.json({ 
        error: 'callId and action are required' 
      }, { status: 400 });
    }

    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();

    // Check if voice integration is available
    if (!shadowBoard.isVoiceIntegrationAvailable()) {
      return NextResponse.json({ 
        error: 'Voice integration not available' 
      }, { status: 503 });
    }

    // Get active calls
    const activeCalls = shadowBoard.getActiveExecutiveCalls();
    const call = activeCalls.find(c => c.callId === body.callId);

    if (!call) {
      return NextResponse.json({ 
        error: 'Call not found or no longer active' 
      }, { status: 404 });
    }

    try {
      let result;
      
      switch (body.action) {
        case 'speak':
          if (!body.data?.message) {
            return NextResponse.json({ 
              error: 'message required for speak action' 
            }, { status: 400 });
          }
          
          await shadowBoard.executiveSpeak(body.callId, body.data.message);
          result = { 
            action: 'speak', 
            message: body.data.message,
            timestamp: new Date().toISOString()
          };
          break;

        case 'end':
          // End call logic would go here
          result = { 
            action: 'end', 
            callId: body.callId,
            endedAt: new Date().toISOString(),
            notes: body.data?.notes
          };
          break;

        case 'hold':
          // Hold call logic would go here
          result = { 
            action: 'hold', 
            callId: body.callId,
            heldAt: new Date().toISOString()
          };
          break;

        case 'record':
          // Start/stop recording logic would go here
          result = { 
            action: 'record', 
            callId: body.callId,
            recordingStarted: new Date().toISOString()
          };
          break;

        case 'transfer':
          if (!body.data?.transferTo) {
            return NextResponse.json({ 
              error: 'transferTo required for transfer action' 
            }, { status: 400 });
          }
          
          // Transfer call logic would go here
          result = { 
            action: 'transfer', 
            callId: body.callId,
            transferTo: body.data.transferTo,
            transferredAt: new Date().toISOString()
          };
          break;

        default:
          return NextResponse.json({ 
            error: 'Invalid action' 
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        callId: body.callId,
        result
      });

    } catch (error) {
      console.error('Failed to control call:', error);
      return NextResponse.json({ 
        error: 'Failed to control call' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Shadow Board call control API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shadowboard/call - Get active calls and call history
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const callId = url.searchParams.get('callId');

    // Rate limiting
    const clientId = getClientId(request);
    const rateLimiter = rateLimiters.get('shadowboard') || rateLimiters.get('default')!;
    
    if (!rateLimiter.check(clientId)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Authentication check
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const isAuthenticated = await authSystem.validateSession(userId);
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();

    // Check if voice integration is available
    if (!shadowBoard.isVoiceIntegrationAvailable()) {
      return NextResponse.json({ 
        error: 'Voice integration not available' 
      }, { status: 503 });
    }

    if (callId) {
      // Get specific call
      const activeCalls = shadowBoard.getActiveExecutiveCalls();
      const call = activeCalls.find(c => c.callId === callId);

      if (!call) {
        return NextResponse.json({ 
          error: 'Call not found' 
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        call
      });

    } else {
      // Get all active calls
      const activeCalls = shadowBoard.getActiveExecutiveCalls();
      const voiceProfiles = shadowBoard.getExecutiveVoiceProfiles();

      return NextResponse.json({
        success: true,
        activeCalls,
        voiceProfiles: voiceProfiles.map(profile => ({
          executiveRole: profile.executiveRole,
          executiveName: profile.executiveName,
          phoneNumber: profile.phoneNumber,
          canMakeCalls: profile.canMakeCalls,
          canReceiveCalls: profile.canReceiveCalls,
          currentCallCount: profile.currentCallCount,
          maxConcurrentCalls: profile.maxConcurrentCalls,
          isVoiceModelLoaded: profile.isVoiceModelLoaded
        }))
      });
    }

  } catch (error) {
    console.error('Shadow Board call GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
