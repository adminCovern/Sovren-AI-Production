/**
 * SHADOW BOARD ORCHESTRATION API
 * Multi-executive communication orchestration for complex business scenarios
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSOVRENCore } from '@/lib/bootstrap/ApplicationBootstrap';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { rateLimiters, getClientId } from '@/middleware/rateLimit';
import { CommunicationScenario } from '@/lib/shadowboard/ExecutiveCommunicationOrchestrator';

export interface StartOrchestrationRequest {
  userId: string;
  scenario: CommunicationScenario;
}

export interface OrchestrationActionRequest {
  userId: string;
  sessionId: string;
  action: 'execute_phase' | 'executive_communication' | 'complete_scenario' | 'pause_scenario';
  data?: {
    phaseIndex?: number;
    instructions?: string;
    executiveRole?: string;
    communicationType?: 'speak' | 'listen' | 'decide' | 'coordinate';
    content?: string;
    targetAudience?: string[];
    outcomes?: string[];
  };
}

export interface OrchestrationResponse {
  success: boolean;
  sessionId?: string;
  session?: any;
  activeSessions?: any[];
  message?: string;
}

/**
 * POST /api/shadowboard/orchestration - Start or control orchestration scenarios
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

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

    // Check if communication orchestrator is available
    if (!shadowBoard.isCommunicationOrchestratorAvailable()) {
      return NextResponse.json({ 
        error: 'Communication orchestrator not available. Please initialize Shadow Board first.' 
      }, { status: 503 });
    }

    const orchestrator = shadowBoard.getCommunicationOrchestrator()!;

    switch (action) {
      case 'start_scenario':
        return await handleStartScenario(body as StartOrchestrationRequest, orchestrator);
      
      case 'execute_phase':
      case 'executive_communication':
      case 'complete_scenario':
      case 'pause_scenario':
        return await handleOrchestrationAction(body as OrchestrationActionRequest, orchestrator);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Shadow Board orchestration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shadowboard/orchestration - Get orchestration sessions and templates
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const sessionId = url.searchParams.get('sessionId');
    const action = url.searchParams.get('action') || 'sessions';

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

    // Check if communication orchestrator is available
    if (!shadowBoard.isCommunicationOrchestratorAvailable()) {
      return NextResponse.json({ 
        error: 'Communication orchestrator not available' 
      }, { status: 503 });
    }

    const orchestrator = shadowBoard.getCommunicationOrchestrator()!;

    switch (action) {
      case 'sessions':
        return await handleGetSessions(orchestrator, sessionId);
      
      case 'templates':
        return await handleGetTemplates();
      
      case 'status':
        return await handleGetOrchestrationStatus(orchestrator);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Shadow Board orchestration GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle starting a new orchestration scenario
 */
async function handleStartScenario(
  request: StartOrchestrationRequest,
  orchestrator: any
): Promise<NextResponse> {
  try {
    // Validate scenario
    if (!request.scenario) {
      return NextResponse.json({ 
        error: 'scenario is required' 
      }, { status: 400 });
    }

    if (!request.scenario.participants?.executives?.length) {
      return NextResponse.json({ 
        error: 'scenario must include at least one executive' 
      }, { status: 400 });
    }

    // Start the scenario
    const sessionId = await orchestrator.startCommunicationScenario(request.scenario);

    const response: OrchestrationResponse = {
      success: true,
      sessionId,
      message: `Started orchestration scenario: ${request.scenario.title}`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to start orchestration scenario:', error);
    return NextResponse.json({ 
      error: 'Failed to start orchestration scenario' 
    }, { status: 500 });
  }
}

/**
 * Handle orchestration actions
 */
async function handleOrchestrationAction(
  request: OrchestrationActionRequest,
  orchestrator: any
): Promise<NextResponse> {
  try {
    if (!request.sessionId) {
      return NextResponse.json({ 
        error: 'sessionId is required' 
      }, { status: 400 });
    }

    let result;
    
    switch (request.action) {
      case 'execute_phase':
        if (request.data?.phaseIndex === undefined) {
          return NextResponse.json({ 
            error: 'phaseIndex is required for execute_phase action' 
          }, { status: 400 });
        }
        
        await orchestrator.executePhaseCoordination(
          request.sessionId,
          request.data.phaseIndex,
          request.data.instructions
        );
        
        result = { message: `Executed phase ${request.data.phaseIndex}` };
        break;

      case 'executive_communication':
        if (!request.data?.executiveRole || !request.data?.communicationType || !request.data?.content) {
          return NextResponse.json({ 
            error: 'executiveRole, communicationType, and content are required' 
          }, { status: 400 });
        }
        
        await orchestrator.handleExecutiveCommunication(
          request.sessionId,
          request.data.executiveRole,
          request.data.communicationType,
          request.data.content,
          request.data.targetAudience
        );
        
        result = { 
          message: `${request.data.executiveRole} ${request.data.communicationType}: ${request.data.content.substring(0, 50)}...` 
        };
        break;

      case 'complete_scenario':
        await orchestrator.completeScenario(request.sessionId, request.data?.outcomes);
        result = { message: 'Scenario completed successfully' };
        break;

      case 'pause_scenario':
        // Pause scenario logic would go here
        result = { message: 'Scenario paused' };
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }

    const response: OrchestrationResponse = {
      success: true,
      sessionId: request.sessionId,
      message: result.message
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to execute orchestration action:', error);
    return NextResponse.json({ 
      error: 'Failed to execute orchestration action' 
    }, { status: 500 });
  }
}

/**
 * Handle getting orchestration sessions
 */
async function handleGetSessions(
  orchestrator: any,
  sessionId?: string | null
): Promise<NextResponse> {
  try {
    if (sessionId) {
      // Get specific session
      const session = orchestrator.getSession(sessionId);
      
      if (!session) {
        return NextResponse.json({ 
          error: 'Session not found' 
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        session
      });

    } else {
      // Get all active sessions
      const activeSessions = orchestrator.getActiveSessions();

      return NextResponse.json({
        success: true,
        activeSessions
      });
    }

  } catch (error) {
    console.error('Failed to get orchestration sessions:', error);
    return NextResponse.json({ 
      error: 'Failed to get orchestration sessions' 
    }, { status: 500 });
  }
}

/**
 * Handle getting scenario templates
 */
async function handleGetTemplates(): Promise<NextResponse> {
  try {
    const templates = {
      negotiation: {
        type: 'negotiation',
        title: 'Business Negotiation',
        description: 'Multi-phase negotiation with strategic coordination',
        recommendedExecutives: ['CMO', 'CFO', 'CLO'],
        estimatedDuration: 2700000, // 45 minutes
        phases: [
          'Opening & Rapport Building',
          'Value Proposition',
          'Financial Discussion',
          'Legal & Risk Review',
          'Closing & Next Steps'
        ]
      },
      crisis_management: {
        type: 'crisis_management',
        title: 'Crisis Management',
        description: 'Rapid response coordination for crisis situations',
        recommendedExecutives: ['CLO', 'CMO', 'CFO', 'CTO'],
        estimatedDuration: 3000000, // 50 minutes
        phases: [
          'Situation Assessment',
          'Immediate Response',
          'Stakeholder Communication',
          'Recovery Planning'
        ]
      },
      strategic_planning: {
        type: 'strategic_planning',
        title: 'Strategic Planning Session',
        description: 'Comprehensive strategic planning with all executives',
        recommendedExecutives: ['CFO', 'CMO', 'CTO', 'CLO'],
        estimatedDuration: 3600000, // 60 minutes
        phases: [
          'Current State Analysis',
          'Market Opportunity Assessment',
          'Strategic Options Development',
          'Resource Planning',
          'Implementation Roadmap'
        ]
      },
      client_presentation: {
        type: 'presentation',
        title: 'Client Presentation',
        description: 'Coordinated client presentation with multiple executives',
        recommendedExecutives: ['CMO', 'CTO', 'CFO'],
        estimatedDuration: 1800000, // 30 minutes
        phases: [
          'Introduction & Agenda',
          'Solution Overview',
          'Technical Deep Dive',
          'Financial Benefits',
          'Q&A & Next Steps'
        ]
      }
    };

    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Failed to get scenario templates:', error);
    return NextResponse.json({ 
      error: 'Failed to get scenario templates' 
    }, { status: 500 });
  }
}

/**
 * Handle getting orchestration status
 */
async function handleGetOrchestrationStatus(
  orchestrator: any
): Promise<NextResponse> {
  try {
    const activeSessions = orchestrator.getActiveSessions();
    
    const status = {
      isActive: activeSessions.length > 0,
      activeSessionCount: activeSessions.length,
      totalExecutivesInvolved: new Set(
        activeSessions.flatMap((session: any) =>
          session.scenario.participants.executives
        )
      ).size,
      averageCoordinationEfficiency: activeSessions.length > 0
        ? activeSessions.reduce((sum: number, session: any) =>
            sum + session.realTimeMetrics.coordinationEfficiency, 0
          ) / activeSessions.length
        : 0,
      scenarioTypes: activeSessions.map((session: any) => session.scenario.type)
    };

    return NextResponse.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Failed to get orchestration status:', error);
    return NextResponse.json({ 
      error: 'Failed to get orchestration status' 
    }, { status: 500 });
  }
}
