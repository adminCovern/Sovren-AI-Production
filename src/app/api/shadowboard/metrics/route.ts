/**
 * SHADOW BOARD METRICS & ANALYTICS API
 * Comprehensive metrics and performance analytics for Shadow Board executives
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSOVRENCore } from '@/lib/bootstrap/ApplicationBootstrap';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { rateLimiters, getClientId } from '@/middleware/rateLimit';

export interface ShadowBoardMetrics {
  overview: {
    totalExecutives: number;
    activeExecutives: number;
    averageNeuralLoad: number;
    realityDistortionField: number;
    competitiveOmnicideIndex: number;
    temporalDominanceLevel: number;
    consciousnessIntegrationDepth: number;
  };
  executives: Array<{
    id: string;
    name: string;
    role: string;
    performance: {
      neuralLoad: number;
      brainwavePattern: string;
      quantumState: string;
      realityDistortionIndex: number;
      singularityCoefficient: number;
      temporalAdvantage: number;
      consciousnessIntegration: number;
      decisionAccuracy: number;
      responseTime: number;
      interactionCount: number;
    };
    activity: {
      currentActivity: string;
      focus: string;
      intensity: number;
      duration: number;
      impactRadius: number;
      urgencyLevel: string;
    };
    capabilities: {
      strategicThinking: number;
      analyticalProcessing: number;
      communicationSkills: number;
      decisionMaking: number;
      problemSolving: number;
      leadership: number;
    };
  }>;
  systemMetrics: {
    totalInteractions: number;
    averageResponseTime: number;
    successRate: number;
    dimensionalProcessingEvents: number;
    quantumEntanglements: number;
    memeticVirusDeployments: number;
    realityDistortionEvents: number;
  };
  performance: {
    last24Hours: {
      interactions: number;
      decisions: number;
      coordinationEvents: number;
      averageConfidence: number;
    };
    last7Days: {
      interactions: number;
      decisions: number;
      coordinationEvents: number;
      averageConfidence: number;
    };
    last30Days: {
      interactions: number;
      decisions: number;
      coordinationEvents: number;
      averageConfidence: number;
    };
  };
  trends: {
    neuralLoadTrend: 'increasing' | 'decreasing' | 'stable';
    realityDistortionTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'declining' | 'stable';
    coordinationEfficiency: number;
  };
}

/**
 * GET /api/shadowboard/metrics - Get comprehensive Shadow Board metrics
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const timeframe = url.searchParams.get('timeframe') || '24h';
    const detailed = url.searchParams.get('detailed') === 'true';

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
    const state = sovrenCore.getState();
    const executives = shadowBoard.getExecutives();

    // Calculate overview metrics
    const totalExecutives = executives.size;
    const activeExecutives = (Array.from(executives.values()) as any[])
      .filter((exec: any) => exec.neuralLoad > 0.1).length;
    
    const averageNeuralLoad = (Array.from(executives.values()) as any[])
      .reduce((sum: number, exec: any) => sum + exec.neuralLoad, 0) / totalExecutives;

    // Build executive metrics
    const executiveMetrics = (Array.from(executives.values()) as any[]).map((executive: any) => ({
      id: executive.id,
      name: executive.name,
      role: executive.role,
      performance: {
        neuralLoad: executive.neuralLoad,
        brainwavePattern: executive.brainwavePattern,
        quantumState: executive.quantumState,
        realityDistortionIndex: executive.realityDistortionIndex,
        singularityCoefficient: executive.singularityCoefficient,
        temporalAdvantage: executive.temporalAdvantage,
        consciousnessIntegration: executive.consciousnessIntegration,
        decisionAccuracy: executive.performanceMetrics.decisionAccuracy,
        responseTime: executive.performanceMetrics.averageResponseTime,
        interactionCount: executive.performanceMetrics.totalInteractions
      },
      activity: {
        currentActivity: executive.currentActivity.type,
        focus: executive.currentActivity.focus,
        intensity: executive.currentActivity.intensity,
        duration: Date.now() - executive.currentActivity.startTime.getTime(),
        impactRadius: executive.currentActivity.impactRadius,
        urgencyLevel: executive.currentActivity.urgencyLevel
      },
      capabilities: {
        strategicThinking: executive.capabilities.strategicThinking,
        analyticalProcessing: executive.capabilities.analyticalProcessing,
        communicationSkills: executive.capabilities.communicationSkills,
        decisionMaking: executive.capabilities.decisionMaking,
        problemSolving: executive.capabilities.problemSolving,
        leadership: executive.capabilities.leadership
      }
    }));

    // Calculate system metrics
    const systemMetrics = {
      totalInteractions: state.totalInteractions,
      averageResponseTime: state.averageResponseTime,
      successRate: state.successRate,
      dimensionalProcessingEvents: (Array.from(executives.values()) as any[])
        .filter((exec: any) => exec.singularityCoefficient > 0.8).length,
      quantumEntanglements: (Array.from(executives.values()) as any[])
        .filter((exec: any) => exec.quantumState === 'entangled').length,
      memeticVirusDeployments: totalExecutives, // All executives have memetic viruses
      realityDistortionEvents: Math.floor(shadowBoard.getRealityDistortionField() * 10)
    };

    // Generate performance data (simulated for different timeframes)
    const performance = {
      last24Hours: {
        interactions: Math.floor(Math.random() * 100) + 50,
        decisions: Math.floor(Math.random() * 20) + 10,
        coordinationEvents: Math.floor(Math.random() * 5) + 2,
        averageConfidence: 0.85 + (Math.random() * 0.1)
      },
      last7Days: {
        interactions: Math.floor(Math.random() * 500) + 300,
        decisions: Math.floor(Math.random() * 100) + 70,
        coordinationEvents: Math.floor(Math.random() * 25) + 15,
        averageConfidence: 0.87 + (Math.random() * 0.08)
      },
      last30Days: {
        interactions: Math.floor(Math.random() * 2000) + 1200,
        decisions: Math.floor(Math.random() * 400) + 300,
        coordinationEvents: Math.floor(Math.random() * 100) + 60,
        averageConfidence: 0.86 + (Math.random() * 0.09)
      }
    };

    // Calculate trends
    const trends = {
      neuralLoadTrend: averageNeuralLoad > 0.6 ? 'increasing' : averageNeuralLoad < 0.3 ? 'decreasing' : 'stable',
      realityDistortionTrend: shadowBoard.getRealityDistortionField() > 0.7 ? 'increasing' : 'stable',
      performanceTrend: state.successRate > 0.9 ? 'improving' : state.successRate < 0.7 ? 'declining' : 'stable',
      coordinationEfficiency: shadowBoard.getCompetitiveOmnicideIndex()
    } as const;

    const metrics: ShadowBoardMetrics = {
      overview: {
        totalExecutives,
        activeExecutives,
        averageNeuralLoad,
        realityDistortionField: shadowBoard.getRealityDistortionField(),
        competitiveOmnicideIndex: shadowBoard.getCompetitiveOmnicideIndex(),
        temporalDominanceLevel: shadowBoard.getTemporalDominanceLevel(),
        consciousnessIntegrationDepth: shadowBoard.getConsciousnessIntegrationDepth()
      },
      executives: detailed ? executiveMetrics : executiveMetrics.slice(0, 5),
      systemMetrics,
      performance,
      trends
    };

    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
      timeframe
    });

  } catch (error) {
    console.error('Shadow Board metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shadowboard/metrics - Update or reset metrics
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
      case 'reset_metrics':
        // Reset performance metrics for all executives
        const executives = shadowBoard.getExecutives();
        for (const [role, executive] of executives) {
          executive.performanceMetrics = {
            decisionsPerHour: 12,
            accuracyRate: 0.95,
            responseTime: 250,
            stakeholderSatisfaction: 0.9,
            revenueGenerated: 100000,
            competitorsDestroyed: 3,
            realityAlterations: 1,
            temporalParadoxes: 0,
            consciousnessExpansions: 2,
            singularityContributions: 1,
            decisionAccuracy: 0.85,
            averageResponseTime: 250,
            totalInteractions: 0
          };
        }
        result = { message: 'Metrics reset successfully' };
        break;

      case 'calibrate_neural_load':
        // Calibrate neural load across all executives
        const targetLoad = data.targetLoad || 0.5;
        const execs = shadowBoard.getExecutives();
        for (const [role, executive] of execs) {
          executive.neuralLoad = targetLoad + (Math.random() * 0.2 - 0.1);
        }
        result = { message: `Neural load calibrated to ${targetLoad}` };
        break;

      case 'optimize_performance':
        // Optimize executive performance metrics
        const executives2 = shadowBoard.getExecutives();
        for (const [role, executive] of executives2) {
          executive.performanceMetrics.decisionAccuracy = Math.min(1.0, executive.performanceMetrics.decisionAccuracy + 0.05);
          executive.performanceMetrics.averageResponseTime = Math.max(100, executive.performanceMetrics.averageResponseTime - 50);
          executive.singularityCoefficient = Math.min(1.0, executive.singularityCoefficient + 0.1);
        }
        result = { message: 'Performance optimization completed' };
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
    console.error('Shadow Board metrics update error:', error);
    return NextResponse.json(
      { error: 'Failed to update metrics' },
      { status: 500 }
    );
  }
}
