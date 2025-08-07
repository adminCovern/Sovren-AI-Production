/**
 * INDIVIDUAL EXECUTIVE API ENDPOINTS
 * Direct interaction with specific Shadow Board executives
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSOVRENCore } from '@/lib/bootstrap/ApplicationBootstrap';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { rateLimiters, getClientId } from '@/middleware/rateLimit';

export interface ExecutiveActionRequest {
  userId: string;
  action: 'speak' | 'analyze' | 'decide' | 'email' | 'call' | 'coordinate';
  message?: string;
  context?: {
    type: 'financial' | 'marketing' | 'technical' | 'legal' | 'strategic' | 'operational';
    urgency: 'low' | 'medium' | 'high' | 'critical';
    data?: any;
    recipients?: string[];
    deadline?: string;
  };
}

export interface ExecutiveActionResponse {
  success: boolean;
  executive: {
    id: string;
    name: string;
    role: string;
    status: string;
  };
  action: {
    type: string;
    result: string;
    confidence: number;
    processingTime: number;
    recommendations?: string[];
    nextSteps?: string[];
  };
  metadata: {
    timestamp: string;
    neuralLoad: number;
    dimensionalProcessing: boolean;
    quantumState: string;
  };
}

/**
 * GET /api/shadowboard/executive/[role] - Get specific executive details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    const { role } = params;
    const url = new URL(request.url);
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

    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();
    
    const executive = shadowBoard.getExecutive(role.toUpperCase());
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
        neuralSignature: executive.neuralSignature,
        psychologicalProfile: executive.psychologicalProfile,
        capabilities: executive.capabilities,
        currentActivity: executive.currentActivity,
        neuralLoad: executive.neuralLoad,
        brainwavePattern: executive.brainwavePattern,
        quantumState: executive.quantumState,
        realityDistortionIndex: executive.realityDistortionIndex,
        singularityCoefficient: executive.singularityCoefficient,
        temporalAdvantage: executive.temporalAdvantage,
        consciousnessIntegration: executive.consciousnessIntegration,
        recentMemories: executive.memoryBank.slice(-5),
        recentDecisions: executive.decisionHistory.slice(-3),
        performanceMetrics: executive.performanceMetrics
      }
    });

  } catch (error) {
    console.error(`Executive ${params.role} API GET error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shadowboard/executive/[role] - Interact with specific executive
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    const { role } = params;
    const body: ExecutiveActionRequest = await request.json();

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

    const sovrenCore = getSOVRENCore();
    const shadowBoard = sovrenCore.getShadowBoard();
    
    const executive = shadowBoard.getExecutive(role.toUpperCase());
    if (!executive) {
      return NextResponse.json(
        { error: `Executive with role '${role}' not found` },
        { status: 404 }
      );
    }

    const startTime = Date.now();

    // Process the action based on type
    let actionResult;
    switch (body.action) {
      case 'speak':
        actionResult = await handleExecutiveSpeak(shadowBoard, role.toUpperCase(), body);
        break;
      
      case 'analyze':
        actionResult = await handleExecutiveAnalyze(shadowBoard, role.toUpperCase(), body);
        break;
      
      case 'decide':
        actionResult = await handleExecutiveDecide(shadowBoard, role.toUpperCase(), body);
        break;
      
      case 'email':
        actionResult = await handleExecutiveEmail(shadowBoard, role.toUpperCase(), body);
        break;
      
      case 'call':
        actionResult = await handleExecutiveCall(shadowBoard, role.toUpperCase(), body);
        break;
      
      case 'coordinate':
        actionResult = await handleExecutiveCoordinate(shadowBoard, role.toUpperCase(), body);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const processingTime = Date.now() - startTime;

    const response: ExecutiveActionResponse = {
      success: true,
      executive: {
        id: executive.id,
        name: executive.name,
        role: executive.role,
        status: executive.currentActivity.type
      },
      action: {
        type: body.action,
        result: actionResult.result,
        confidence: actionResult.confidence,
        processingTime,
        recommendations: actionResult.recommendations,
        nextSteps: actionResult.nextSteps
      },
      metadata: {
        timestamp: new Date().toISOString(),
        neuralLoad: executive.neuralLoad,
        dimensionalProcessing: executive.singularityCoefficient > 0.8,
        quantumState: executive.quantumState
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error(`Executive ${params.role} API POST error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle executive speak action
 */
async function handleExecutiveSpeak(shadowBoard: any, role: string, request: ExecutiveActionRequest) {
  const response = await shadowBoard.processExecutiveInteraction(
    role,
    request.message || 'Please provide your perspective on the current situation.',
    request.context || { type: 'strategic', urgency: 'medium' }
  );

  return {
    result: response.message,
    confidence: response.confidence,
    recommendations: response.suggestedActions,
    nextSteps: ['Review executive response', 'Consider recommendations', 'Take action if needed']
  };
}

/**
 * Handle executive analyze action
 */
async function handleExecutiveAnalyze(shadowBoard: any, role: string, request: ExecutiveActionRequest) {
  const analysisContext = {
    type: request.context?.type || 'strategic',
    urgency: request.context?.urgency || 'medium',
    relatedData: request.context?.data
  };

  const response = await shadowBoard.processExecutiveInteraction(
    role,
    `Please analyze: ${request.message}`,
    analysisContext
  );

  return {
    result: response.message,
    confidence: response.confidence,
    recommendations: response.suggestedActions,
    nextSteps: ['Review analysis', 'Validate findings', 'Implement recommendations']
  };
}

/**
 * Handle executive decide action
 */
async function handleExecutiveDecide(shadowBoard: any, role: string, request: ExecutiveActionRequest) {
  const decisionContext = {
    type: request.context?.type || 'strategic',
    urgency: request.context?.urgency || 'high',
    relatedData: request.context?.data
  };

  const response = await shadowBoard.processExecutiveInteraction(
    role,
    `Please make a decision on: ${request.message}`,
    decisionContext
  );

  return {
    result: response.message,
    confidence: response.confidence,
    recommendations: response.suggestedActions,
    nextSteps: ['Execute decision', 'Monitor outcomes', 'Adjust if necessary']
  };
}

/**
 * Handle executive email action
 */
async function handleExecutiveEmail(shadowBoard: any, role: string, request: ExecutiveActionRequest) {
  // This would integrate with the email system
  const emailContext = {
    type: 'communication',
    urgency: request.context?.urgency || 'medium',
    recipients: request.context?.recipients
  };

  const response = await shadowBoard.processExecutiveInteraction(
    role,
    `Draft email: ${request.message}`,
    emailContext
  );

  return {
    result: `Email drafted: ${response.message}`,
    confidence: response.confidence,
    recommendations: ['Review email content', 'Verify recipients', 'Schedule send time'],
    nextSteps: ['Send email', 'Track responses', 'Follow up as needed']
  };
}

/**
 * Handle executive call action
 */
async function handleExecutiveCall(shadowBoard: any, role: string, request: ExecutiveActionRequest) {
  // This would integrate with the telephony system
  const callContext = {
    type: 'communication',
    urgency: request.context?.urgency || 'high',
    relatedData: request.context?.data
  };

  const response = await shadowBoard.processExecutiveInteraction(
    role,
    `Prepare for call: ${request.message}`,
    callContext
  );

  return {
    result: `Call preparation: ${response.message}`,
    confidence: response.confidence,
    recommendations: ['Review call objectives', 'Prepare talking points', 'Schedule call'],
    nextSteps: ['Initiate call', 'Execute agenda', 'Document outcomes']
  };
}

/**
 * Handle executive coordinate action
 */
async function handleExecutiveCoordinate(shadowBoard: any, role: string, request: ExecutiveActionRequest) {
  const coordinationContext = {
    type: 'coordination',
    urgency: request.context?.urgency || 'medium',
    relatedData: request.context?.data
  };

  const response = await shadowBoard.processExecutiveInteraction(
    role,
    `Coordinate on: ${request.message}`,
    coordinationContext
  );

  return {
    result: response.message,
    confidence: response.confidence,
    recommendations: response.suggestedActions,
    nextSteps: ['Align with other executives', 'Execute coordination plan', 'Monitor progress']
  };
}
