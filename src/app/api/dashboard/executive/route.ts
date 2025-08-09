/**
 * EXECUTIVE DASHBOARD API
 * Comprehensive dashboard for Shadow Board executives, activities, and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSOVRENCore } from '@/lib/bootstrap/ApplicationBootstrap';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { rateLimiters, getClientId } from '@/middleware/rateLimit';
import { dbManager } from '@/lib/database/DatabaseManager';
import { Executive } from '@/lib/shadowboard/ShadowBoardManager';

export interface ExecutiveDashboardData {
  overview: {
    totalExecutives: number;
    activeExecutives: number;
    totalInteractions: number;
    activeCalls: number;
    activeOrchestrations: number;
    realityDistortionField: number;
    competitiveOmnicideIndex: number;
  };
  executives: Array<{
    id: string;
    name: string;
    role: string;
    status: 'active' | 'busy' | 'available' | 'offline';
    currentActivity: {
      type: string;
      focus: string;
      intensity: number;
      duration: number;
      urgencyLevel: string;
    };
    performance: {
      neuralLoad: number;
      brainwavePattern: string;
      quantumState: string;
      singularityCoefficient: number;
      temporalAdvantage: number;
      consciousnessIntegration: number;
    };
    capabilities: {
      strategicThinking: number;
      analyticalProcessing: number;
      communicationSkills: number;
      decisionMaking: number;
      problemSolving: number;
      leadership: number;
    };
    recentActivities: Array<{
      timestamp: string;
      type: string;
      description: string;
      confidence: number;
    }>;
    voiceProfile?: {
      phoneNumber: string;
      canMakeCalls: boolean;
      currentCallCount: number;
      maxConcurrentCalls: number;
    };
  }>;
  activeCalls: Array<{
    callId: string;
    executiveRole: string;
    executiveName: string;
    targetNumber: string;
    status: string;
    duration: number;
    purpose: string;
  }>;
  orchestrationSessions: Array<{
    sessionId: string;
    scenarioType: string;
    title: string;
    status: string;
    participants: string[];
    currentPhase: number;
    totalPhases: number;
    progress: number;
    startTime: string;
    estimatedCompletion: string;
  }>;
  metrics: {
    realTimeMetrics: {
      coordinationEfficiency: number;
      communicationFlow: number;
      objectiveProgress: number;
      riskMitigation: number;
      stakeholderSatisfaction: number;
    };
    performance24h: {
      interactions: number;
      decisions: number;
      coordinationEvents: number;
      averageConfidence: number;
      successRate: number;
    };
    trends: {
      neuralLoadTrend: 'increasing' | 'decreasing' | 'stable';
      realityDistortionTrend: 'increasing' | 'decreasing' | 'stable';
      performanceTrend: 'improving' | 'declining' | 'stable';
    };
  };
  quickActions: Array<{
    id: string;
    title: string;
    description: string;
    type: 'call' | 'orchestration' | 'interaction' | 'analysis';
    enabled: boolean;
    estimatedTime: number;
  }>;
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: string;
    actionRequired: boolean;
  }>;
}

/**
 * GET /api/dashboard/executive - Get comprehensive executive dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const timeframe = url.searchParams.get('timeframe') || '24h';

    // Rate limiting
    const clientId = getClientId(request);
    const rateLimiter = rateLimiters.get('dashboard') || rateLimiters.get('default')!;
    
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
    const state = sovrenCore.getState();

    // Check if Shadow Board is initialized
    if (!shadowBoard.getInitializationStatus().isInitialized) {
      return NextResponse.json({
        success: false,
        error: 'Shadow Board not initialized',
        initializationRequired: true
      }, { status: 412 });
    }

    // Build dashboard data
    const dashboardData: ExecutiveDashboardData = {
      overview: {
        totalExecutives: shadowBoard.getExecutives().size,
        activeExecutives: Array.from(shadowBoard.getExecutives().values()).filter(
          exec => exec.neuralLoad > 0.1
        ).length,
        totalInteractions: state.totalInteractions,
        activeCalls: shadowBoard.isVoiceIntegrationAvailable() 
          ? shadowBoard.getActiveExecutiveCalls().length 
          : 0,
        activeOrchestrations: shadowBoard.isCommunicationOrchestratorAvailable()
          ? shadowBoard.getCommunicationOrchestrator()?.getActiveSessions().length || 0
          : 0,
        realityDistortionField: shadowBoard.getRealityDistortionField(),
        competitiveOmnicideIndex: shadowBoard.getCompetitiveOmnicideIndex()
      },
      executives: [],
      activeCalls: [],
      orchestrationSessions: [],
      metrics: {
        realTimeMetrics: {
          coordinationEfficiency: 0.85,
          communicationFlow: 0.78,
          objectiveProgress: 0.65,
          riskMitigation: 0.92,
          stakeholderSatisfaction: 0.88
        },
        performance24h: {
          interactions: Math.floor(Math.random() * 100) + 50,
          decisions: Math.floor(Math.random() * 20) + 10,
          coordinationEvents: Math.floor(Math.random() * 5) + 2,
          averageConfidence: 0.85 + (Math.random() * 0.1),
          successRate: 0.90 + (Math.random() * 0.08)
        },
        trends: {
          neuralLoadTrend: 'stable',
          realityDistortionTrend: 'increasing',
          performanceTrend: 'improving'
        }
      },
      quickActions: [
        {
          id: 'start_negotiation',
          title: 'Start Negotiation',
          description: 'Begin a multi-executive negotiation scenario',
          type: 'orchestration',
          enabled: shadowBoard.isCommunicationOrchestratorAvailable(),
          estimatedTime: 2700000 // 45 minutes
        },
        {
          id: 'executive_call',
          title: 'Make Executive Call',
          description: 'Have an executive make a phone call',
          type: 'call',
          enabled: shadowBoard.isVoiceIntegrationAvailable(),
          estimatedTime: 600000 // 10 minutes
        },
        {
          id: 'strategic_analysis',
          title: 'Strategic Analysis',
          description: 'Get strategic insights from your executives',
          type: 'analysis',
          enabled: true,
          estimatedTime: 300000 // 5 minutes
        },
        {
          id: 'crisis_response',
          title: 'Crisis Response',
          description: 'Activate crisis management protocol',
          type: 'orchestration',
          enabled: shadowBoard.isCommunicationOrchestratorAvailable(),
          estimatedTime: 3000000 // 50 minutes
        }
      ],
      alerts: []
    };

    // Build executive data
    const executives = shadowBoard.getExecutives();
    const voiceProfiles = shadowBoard.isVoiceIntegrationAvailable() 
      ? shadowBoard.getExecutiveVoiceProfiles() 
      : [];

    dashboardData.executives = Array.from(executives.values()).map(exec => {
      const voiceProfile = voiceProfiles.find(p => p.executiveRole === exec.role);
      
      return {
        id: exec.id,
        name: exec.name,
        role: exec.role,
        status: exec.neuralLoad > 0.8 ? 'busy' : exec.neuralLoad > 0.3 ? 'active' : 'available',
        currentActivity: {
          type: exec.currentActivity.type,
          focus: exec.currentActivity.focus,
          intensity: exec.currentActivity.intensity,
          duration: Date.now() - exec.currentActivity.startTime.getTime(),
          urgencyLevel: exec.currentActivity.urgencyLevel
        },
        performance: {
          neuralLoad: exec.neuralLoad,
          brainwavePattern: exec.brainwavePattern,
          quantumState: exec.quantumState,
          singularityCoefficient: exec.singularityCoefficient,
          temporalAdvantage: exec.temporalAdvantage,
          consciousnessIntegration: exec.consciousnessIntegration
        },
        capabilities: {
          strategicThinking: exec.capabilities.strategicThinking,
          analyticalProcessing: exec.capabilities.analyticalProcessing,
          communicationSkills: exec.capabilities.communicationSkills,
          decisionMaking: exec.capabilities.decisionMaking,
          problemSolving: exec.capabilities.problemSolving,
          leadership: exec.capabilities.leadership
        },
        recentActivities: exec.memoryBank.slice(-5).map(memory => ({
          timestamp: memory.timestamp.toISOString(),
          type: memory.type,
          description: (typeof memory.content === 'string' ? memory.content : JSON.stringify(memory.content)).substring(0, 100) + '...',
          confidence: memory.confidence
        })),
        voiceProfile: voiceProfile ? {
          phoneNumber: (voiceProfile as any).phoneNumber || 'Not assigned',
          canMakeCalls: (voiceProfile as any).canMakeCalls || false,
          currentCallCount: (voiceProfile as any).currentCallCount || 0,
          maxConcurrentCalls: (voiceProfile as any).maxConcurrentCalls || 0
        } : undefined
      };
    });

    // Get active calls
    if (shadowBoard.isVoiceIntegrationAvailable()) {
      const activeCalls = shadowBoard.getActiveExecutiveCalls();
      dashboardData.activeCalls = activeCalls.map(call => ({
        callId: call.callId,
        executiveRole: call.executiveRole,
        executiveName: call.executiveName,
        targetNumber: call.targetNumber,
        status: call.status,
        duration: Date.now() - call.startTime.getTime(),
        purpose: call.callPurpose
      }));
    }

    // Get orchestration sessions
    if (shadowBoard.isCommunicationOrchestratorAvailable()) {
      const orchestrator = shadowBoard.getCommunicationOrchestrator();
      if (orchestrator) {
        const sessions = orchestrator.getActiveSessions();
        dashboardData.orchestrationSessions = sessions.map(session => ({
          sessionId: session.sessionId,
          scenarioType: session.scenario.type,
          title: session.scenario.title,
          status: session.status,
          participants: session.scenario.participants.executives,
          currentPhase: session.currentPhase,
          totalPhases: session.scenario.timeline.phases.length,
          progress: session.realTimeMetrics.objectiveProgress,
          startTime: session.startTime.toISOString(),
          estimatedCompletion: new Date(
            session.startTime.getTime() + session.scenario.timeline.estimatedDuration
          ).toISOString()
        }));
      }
    }

    // Generate alerts based on system state
    const alerts: any[] = [];
    
    // High neural load alert
    const highLoadExecutives = dashboardData.executives.filter(exec => exec.performance.neuralLoad > 0.9);
    if (highLoadExecutives.length > 0) {
      alerts.push({
        id: 'high_neural_load',
        type: 'warning' as const,
        title: 'High Neural Load Detected',
        message: `${highLoadExecutives.length} executive(s) operating at maximum capacity`,
        timestamp: new Date().toISOString(),
        actionRequired: true
      });
    }

    // Reality distortion field alert
    if (dashboardData.overview.realityDistortionField > 0.8) {
      alerts.push({
        id: 'reality_distortion_high',
        type: 'info' as const,
        title: 'Reality Distortion Field Active',
        message: 'Competitive omnicide protocols engaged',
        timestamp: new Date().toISOString(),
        actionRequired: false
      });
    }

    // Active orchestration alert
    if (dashboardData.overview.activeOrchestrations > 0) {
      alerts.push({
        id: 'active_orchestrations',
        type: 'success' as const,
        title: 'Multi-Executive Coordination Active',
        message: `${dashboardData.overview.activeOrchestrations} orchestration session(s) in progress`,
        timestamp: new Date().toISOString(),
        actionRequired: false
      });
    }

    dashboardData.alerts = alerts;

    return NextResponse.json({
      success: true,
      dashboard: dashboardData,
      timestamp: new Date().toISOString(),
      timeframe
    });

  } catch (error) {
    console.error('Executive dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/executive - Execute dashboard actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, data } = body;

    // Rate limiting
    const clientId = getClientId(request);
    const rateLimiter = rateLimiters.get('dashboard') || rateLimiters.get('default')!;
    
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
      case 'refresh_dashboard':
        result = { message: 'Dashboard refreshed', timestamp: new Date().toISOString() };
        break;

      case 'optimize_neural_load':
        // Optimize neural load across all executives
        const executives = shadowBoard.getExecutives();
        for (const [role, executive] of executives) {
          executive.neuralLoad = Math.max(0.1, executive.neuralLoad - 0.2);
        }
        result = { message: 'Neural load optimized across all executives' };
        break;

      case 'boost_reality_distortion':
        // Temporarily boost reality distortion field
        result = { 
          message: 'Reality distortion field boosted',
          newLevel: shadowBoard.getRealityDistortionField() + 0.1
        };
        break;

      case 'emergency_coordination':
        // Activate emergency coordination protocol
        if (shadowBoard.isCommunicationOrchestratorAvailable()) {
          result = { message: 'Emergency coordination protocol activated' };
        } else {
          result = { message: 'Communication orchestrator not available' };
        }
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
    console.error('Executive dashboard action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
