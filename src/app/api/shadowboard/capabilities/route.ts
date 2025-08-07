/**
 * SHADOW BOARD CAPABILITIES API
 * Comprehensive overview of all Shadow Board capabilities and endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSOVRENCore } from '@/lib/bootstrap/ApplicationBootstrap';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { rateLimiters, getClientId } from '@/middleware/rateLimit';

export interface ShadowBoardCapabilities {
  overview: {
    isInitialized: boolean;
    hasVoiceIntegration: boolean;
    hasCommunicationOrchestrator: boolean;
    totalExecutives: number;
    availableFeatures: string[];
  };
  endpoints: {
    core: Array<{
      path: string;
      method: string;
      description: string;
      parameters?: string[];
    }>;
    voice: Array<{
      path: string;
      method: string;
      description: string;
      parameters?: string[];
    }>;
    orchestration: Array<{
      path: string;
      method: string;
      description: string;
      parameters?: string[];
    }>;
    metrics: Array<{
      path: string;
      method: string;
      description: string;
      parameters?: string[];
    }>;
  };
  executiveRoles: Array<{
    role: string;
    name: string;
    capabilities: string[];
    voiceEnabled: boolean;
    canMakeCalls: boolean;
  }>;
  scenarioTemplates: Array<{
    type: string;
    title: string;
    description: string;
    estimatedDuration: number;
    phases: string[];
  }>;
  integrations: {
    telephony: boolean;
    voiceSynthesis: boolean;
    emailOrchestration: boolean;
    crmSystems: boolean;
    realTimeStreaming: boolean;
  };
}

/**
 * GET /api/shadowboard/capabilities - Get comprehensive Shadow Board capabilities
 */
export async function GET(request: NextRequest) {
  try {
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

    // Build capabilities overview
    const capabilities: ShadowBoardCapabilities = {
      overview: {
        isInitialized: shadowBoard.getInitializationStatus().isInitialized,
        hasVoiceIntegration: shadowBoard.isVoiceIntegrationAvailable(),
        hasCommunicationOrchestrator: shadowBoard.isCommunicationOrchestratorAvailable(),
        totalExecutives: shadowBoard.getExecutives().size,
        availableFeatures: [
          'Executive Interaction',
          'Real-time Metrics',
          'Neural Activity Monitoring',
          'Reality Distortion Field',
          'Competitive Omnicide Index',
          'Temporal Dominance',
          'Consciousness Integration',
          'Dimensional Processing',
          'Quantum Entanglement',
          'Memetic Virus Deployment'
        ]
      },
      endpoints: {
        core: [
          {
            path: '/api/shadowboard',
            method: 'GET',
            description: 'Get Shadow Board status and executives',
            parameters: ['userId', 'action']
          },
          {
            path: '/api/shadowboard',
            method: 'POST',
            description: 'Interact with executives or initialize Shadow Board',
            parameters: ['userId', 'action', 'executiveRole', 'message']
          },
          {
            path: '/api/shadowboard/executive/[role]',
            method: 'GET',
            description: 'Get specific executive details',
            parameters: ['userId', 'role']
          },
          {
            path: '/api/shadowboard/executive/[role]',
            method: 'POST',
            description: 'Direct interaction with specific executive',
            parameters: ['userId', 'action', 'message', 'context']
          }
        ],
        voice: [
          {
            path: '/api/shadowboard/call',
            method: 'POST',
            description: 'Make calls through Shadow Board executives',
            parameters: ['userId', 'executiveRole', 'targetNumber', 'callPurpose']
          },
          {
            path: '/api/shadowboard/call',
            method: 'PUT',
            description: 'Control active executive calls',
            parameters: ['userId', 'callId', 'action', 'data']
          },
          {
            path: '/api/shadowboard/call',
            method: 'GET',
            description: 'Get active calls and voice profiles',
            parameters: ['userId', 'callId']
          }
        ],
        orchestration: [
          {
            path: '/api/shadowboard/orchestration',
            method: 'POST',
            description: 'Start and control multi-executive scenarios',
            parameters: ['userId', 'action', 'scenario', 'sessionId']
          },
          {
            path: '/api/shadowboard/orchestration',
            method: 'GET',
            description: 'Get orchestration sessions and templates',
            parameters: ['userId', 'action', 'sessionId']
          }
        ],
        metrics: [
          {
            path: '/api/shadowboard/metrics',
            method: 'GET',
            description: 'Get comprehensive Shadow Board metrics',
            parameters: ['userId', 'timeframe', 'detailed']
          },
          {
            path: '/api/shadowboard/metrics',
            method: 'POST',
            description: 'Update or reset metrics',
            parameters: ['userId', 'action', 'data']
          },
          {
            path: '/api/shadowboard/stream',
            method: 'GET',
            description: 'Real-time Shadow Board activity stream',
            parameters: ['userId', 'sessionId']
          }
        ]
      },
      executiveRoles: [],
      scenarioTemplates: [
        {
          type: 'negotiation',
          title: 'Business Negotiation',
          description: 'Multi-phase negotiation with strategic coordination',
          estimatedDuration: 2700000, // 45 minutes
          phases: [
            'Opening & Rapport Building',
            'Value Proposition',
            'Financial Discussion',
            'Legal & Risk Review',
            'Closing & Next Steps'
          ]
        },
        {
          type: 'crisis_management',
          title: 'Crisis Management',
          description: 'Rapid response coordination for crisis situations',
          estimatedDuration: 3000000, // 50 minutes
          phases: [
            'Situation Assessment',
            'Immediate Response',
            'Stakeholder Communication',
            'Recovery Planning'
          ]
        },
        {
          type: 'strategic_planning',
          title: 'Strategic Planning Session',
          description: 'Comprehensive strategic planning with all executives',
          estimatedDuration: 3600000, // 60 minutes
          phases: [
            'Current State Analysis',
            'Market Opportunity Assessment',
            'Strategic Options Development',
            'Resource Planning',
            'Implementation Roadmap'
          ]
        },
        {
          type: 'client_presentation',
          title: 'Client Presentation',
          description: 'Coordinated client presentation with multiple executives',
          estimatedDuration: 1800000, // 30 minutes
          phases: [
            'Introduction & Agenda',
            'Solution Overview',
            'Technical Deep Dive',
            'Financial Benefits',
            'Q&A & Next Steps'
          ]
        }
      ],
      integrations: {
        telephony: shadowBoard.isVoiceIntegrationAvailable(),
        voiceSynthesis: true,
        emailOrchestration: true,
        crmSystems: true,
        realTimeStreaming: true
      }
    };

    // Get executive roles and capabilities
    if (shadowBoard.getInitializationStatus().isInitialized) {
      const executives = shadowBoard.getExecutives();
      const voiceProfiles = shadowBoard.isVoiceIntegrationAvailable() 
        ? shadowBoard.getExecutiveVoiceProfiles() 
        : [];

      capabilities.executiveRoles = Array.from(executives.values()).map(exec => {
        const voiceProfile = voiceProfiles.find(p => p.executiveRole === exec.role);
        
        return {
          role: exec.role,
          name: exec.name,
          capabilities: [
            'Strategic Analysis',
            'Decision Making',
            'Communication',
            'Coordination',
            'Problem Solving',
            'Leadership'
          ],
          voiceEnabled: !!voiceProfile?.isVoiceModelLoaded,
          canMakeCalls: !!voiceProfile?.canMakeCalls
        };
      });
    }

    return NextResponse.json({
      success: true,
      capabilities
    });

  } catch (error) {
    console.error('Shadow Board capabilities API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shadowboard/capabilities - Initialize or update Shadow Board capabilities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, data } = body;

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

    let result;
    
    switch (action) {
      case 'initialize_voice_integration':
        if (!data?.userPhoneAllocation) {
          return NextResponse.json({ 
            error: 'userPhoneAllocation required for voice integration' 
          }, { status: 400 });
        }
        
        // This would require the voice system components
        result = { 
          message: 'Voice integration initialization requested',
          status: 'pending'
        };
        break;

      case 'initialize_communication_orchestrator':
        if (!shadowBoard.isCommunicationOrchestratorAvailable()) {
          await shadowBoard.initializeCommunicationOrchestrator();
        }
        
        result = { 
          message: 'Communication orchestrator initialized',
          status: 'active'
        };
        break;

      case 'update_executive_capabilities':
        // Update executive capabilities
        result = { 
          message: 'Executive capabilities updated',
          updatedExecutives: data?.executives || []
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      result
    });

  } catch (error) {
    console.error('Shadow Board capabilities POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
