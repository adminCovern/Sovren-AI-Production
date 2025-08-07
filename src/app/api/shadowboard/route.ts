/**
 * SHADOW BOARD API ENDPOINTS
 * Complete API for Shadow Board executive management and interaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSOVRENCore } from '@/lib/bootstrap/ApplicationBootstrap';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { rateLimiters, getClientId } from '@/middleware/rateLimit';

export interface ShadowBoardStatusResponse {
  success: boolean;
  shadowBoard: {
    isInitialized: boolean;
    executiveCount: number;
    executives: Array<{
      id: string;
      name: string;
      role: string;
      status: string;
      availability: string;
      currentActivity?: string;
    }>;
    capabilities: {
      neuralProcessing: boolean;
      shadowBoardOrchestration: boolean;
      voiceSynthesis: boolean;
      crmIntegration: boolean;
      emailOrchestration: boolean;
    };
    metrics: {
      totalInteractions: number;
      activeExecutives: number;
      realityDistortionField: number;
      competitiveOmnicideIndex: number;
    };
  };
}

export interface ExecutiveInteractionRequest {
  executiveRole: string;
  message: string;
  context?: {
    type: 'email' | 'call' | 'meeting' | 'decision' | 'analysis';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    relatedData?: any;
  };
}

export interface ExecutiveInteractionResponse {
  success: boolean;
  executive: {
    id: string;
    name: string;
    role: string;
  };
  response: {
    message: string;
    type: 'text' | 'voice' | 'action';
    confidence: number;
    reasoning?: string;
    suggestedActions?: string[];
  };
  metadata: {
    processingTime: number;
    neuralLoad: number;
    dimensionalProcessing: boolean;
  };
}

/**
 * GET /api/shadowboard - Get Shadow Board status and executives
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';
    const userId = url.searchParams.get('userId');

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

    switch (action) {
      case 'status':
        return await handleGetShadowBoardStatus(userId);
      
      case 'executives':
        return await handleGetExecutives(userId);
      
      case 'executive':
        const role = url.searchParams.get('role');
        if (!role) {
          return NextResponse.json({ error: 'role parameter required' }, { status: 400 });
        }
        return await handleGetExecutive(userId, role);
      
      case 'metrics':
        return await handleGetMetrics(userId);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Shadow Board API GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shadowboard - Interact with Shadow Board executives
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId } = body;

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

    switch (action) {
      case 'interact':
        return await handleExecutiveInteraction(body as ExecutiveInteractionRequest & { userId: string });
      
      case 'initialize':
        return await handleInitializeShadowBoard(body);
      
      case 'coordinate':
        return await handleExecutiveCoordination(body);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Shadow Board API POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle getting Shadow Board status
 */
async function handleGetShadowBoardStatus(userId: string): Promise<NextResponse> {
  try {
    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();
    const capabilities = sovrenCore.getCapabilities();
    const state = sovrenCore.getState();

    const executives = Array.from(shadowBoard.getExecutives().values()).map(exec => ({
      id: exec.id,
      name: exec.name,
      role: exec.role,
      status: exec.currentActivity.type,
      availability: exec.neuralLoad < 0.8 ? 'available' : 'busy',
      currentActivity: exec.currentActivity.focus
    }));

    const response: ShadowBoardStatusResponse = {
      success: true,
      shadowBoard: {
        isInitialized: shadowBoard.getInitializationStatus().isInitialized,
        executiveCount: executives.length,
        executives,
        capabilities,
        metrics: {
          totalInteractions: state.totalInteractions,
          activeExecutives: state.activeExecutives,
          realityDistortionField: shadowBoard.getRealityDistortionField(),
          competitiveOmnicideIndex: shadowBoard.getCompetitiveOmnicideIndex()
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get Shadow Board status:', error);
    return NextResponse.json(
      { error: 'Failed to get Shadow Board status' },
      { status: 500 }
    );
  }
}

/**
 * Handle getting all executives
 */
async function handleGetExecutives(userId: string): Promise<NextResponse> {
  try {
    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();
    
    const executives = Array.from(shadowBoard.getExecutives().values()).map(exec => ({
      id: exec.id,
      name: exec.name,
      role: exec.role,
      voiceModel: exec.voiceModel,
      capabilities: exec.capabilities,
      psychologicalProfile: exec.psychologicalProfile,
      currentActivity: exec.currentActivity,
      neuralLoad: exec.neuralLoad,
      brainwavePattern: exec.brainwavePattern,
      quantumState: exec.quantumState,
      realityDistortionIndex: exec.realityDistortionIndex,
      singularityCoefficient: exec.singularityCoefficient,
      temporalAdvantage: exec.temporalAdvantage,
      consciousnessIntegration: exec.consciousnessIntegration
    }));

    return NextResponse.json({
      success: true,
      executives
    });

  } catch (error) {
    console.error('Failed to get executives:', error);
    return NextResponse.json(
      { error: 'Failed to get executives' },
      { status: 500 }
    );
  }
}

/**
 * Handle getting specific executive
 */
async function handleGetExecutive(userId: string, role: string): Promise<NextResponse> {
  try {
    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();
    
    const executive = shadowBoard.getExecutive(role);
    if (!executive) {
      return NextResponse.json(
        { error: `Executive with role '${role}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      executive: {
        id: executive.id,
        name: executive.name,
        role: executive.role,
        voiceModel: executive.voiceModel,
        capabilities: executive.capabilities,
        psychologicalProfile: executive.psychologicalProfile,
        currentActivity: executive.currentActivity,
        neuralLoad: executive.neuralLoad,
        brainwavePattern: executive.brainwavePattern,
        quantumState: executive.quantumState,
        realityDistortionIndex: executive.realityDistortionIndex,
        singularityCoefficient: executive.singularityCoefficient,
        temporalAdvantage: executive.temporalAdvantage,
        consciousnessIntegration: executive.consciousnessIntegration,
        memoryBank: executive.memoryBank.slice(-10), // Last 10 memories
        decisionHistory: executive.decisionHistory.slice(-5), // Last 5 decisions
        performanceMetrics: executive.performanceMetrics
      }
    });

  } catch (error) {
    console.error('Failed to get executive:', error);
    return NextResponse.json(
      { error: 'Failed to get executive' },
      { status: 500 }
    );
  }
}

/**
 * Handle getting Shadow Board metrics
 */
async function handleGetMetrics(userId: string): Promise<NextResponse> {
  try {
    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();
    const state = sovrenCore.getState();

    const metrics = {
      realityDistortionField: shadowBoard.getRealityDistortionField(),
      competitiveOmnicideIndex: shadowBoard.getCompetitiveOmnicideIndex(),
      temporalDominanceLevel: shadowBoard.getTemporalDominanceLevel(),
      consciousnessIntegrationDepth: shadowBoard.getConsciousnessIntegrationDepth(),
      totalInteractions: state.totalInteractions,
      activeExecutives: state.activeExecutives,
      averageResponseTime: state.averageResponseTime,
      successRate: state.successRate
    };

    return NextResponse.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('Failed to get metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get metrics' },
      { status: 500 }
    );
  }
}

/**
 * Handle executive interaction
 */
async function handleExecutiveInteraction(request: ExecutiveInteractionRequest & { userId: string }): Promise<NextResponse> {
  try {
    const { userId, executiveRole, message, context } = request;
    
    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();
    
    const executive = shadowBoard.getExecutive(executiveRole);
    if (!executive) {
      return NextResponse.json(
        { error: `Executive with role '${executiveRole}' not found` },
        { status: 404 }
      );
    }

    const startTime = Date.now();
    
    // Process the interaction through the executive
    const response = await shadowBoard.processExecutiveInteraction(
      executiveRole,
      message,
      context || { type: 'analysis', urgency: 'medium' }
    );

    const processingTime = Date.now() - startTime;

    const interactionResponse: ExecutiveInteractionResponse = {
      success: true,
      executive: {
        id: executive.id,
        name: executive.name,
        role: executive.role
      },
      response: {
        message: response.message,
        type: response.type || 'text',
        confidence: response.confidence || 0.95,
        reasoning: response.reasoning,
        suggestedActions: response.suggestedActions
      },
      metadata: {
        processingTime,
        neuralLoad: executive.neuralLoad,
        dimensionalProcessing: response.dimensionalProcessing || false
      }
    };

    return NextResponse.json(interactionResponse);

  } catch (error) {
    console.error('Failed to process executive interaction:', error);
    return NextResponse.json(
      { error: 'Failed to process executive interaction' },
      { status: 500 }
    );
  }
}

/**
 * Handle Shadow Board initialization
 */
async function handleInitializeShadowBoard(body: any): Promise<NextResponse> {
  try {
    const { userId, subscriptionTier = 'sovren_proof' } = body;
    
    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();
    
    await shadowBoard.initializeForSMB(userId, subscriptionTier);
    
    return NextResponse.json({
      success: true,
      message: 'Shadow Board initialized successfully',
      executives: Array.from(shadowBoard.getExecutives().keys())
    });

  } catch (error) {
    console.error('Failed to initialize Shadow Board:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Shadow Board' },
      { status: 500 }
    );
  }
}

/**
 * Handle executive coordination
 */
async function handleExecutiveCoordination(body: any): Promise<NextResponse> {
  try {
    const { userId, executives, scenario, objective } = body;
    
    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();
    
    const coordinationResult = await shadowBoard.coordinateExecutives(
      executives,
      scenario,
      objective
    );
    
    return NextResponse.json({
      success: true,
      coordination: coordinationResult
    });

  } catch (error) {
    console.error('Failed to coordinate executives:', error);
    return NextResponse.json(
      { error: 'Failed to coordinate executives' },
      { status: 500 }
    );
  }
}
