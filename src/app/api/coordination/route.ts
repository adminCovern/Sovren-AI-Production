import { NextRequest, NextResponse } from 'next/server';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { multiExecutiveCoordinator, CoordinationScenario } from '@/lib/coordination/MultiExecutiveCoordinator';
import { nvlinkFabricCoordinator } from '@/lib/coordination/NVLinkFabricCoordinator';
import { rateLimiters } from '@/lib/security/RateLimiters';

/**
 * Multi-Executive Coordination API
 * Handles complex executive coordination scenarios with NVLink optimization
 */

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    const rateLimitResult = rateLimiters.checkLimit('api', clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimitResult.resetTime },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, userId, scenario, context } = body;

    // Validate required fields
    if (!action || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, userId' },
        { status: 400 }
      );
    }

    // Authenticate user
    const isAuthenticated = await authSystem.validateSession(userId);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Handle different coordination actions
    switch (action) {
      case 'coordinate':
        if (!scenario) {
          return NextResponse.json(
            { error: 'Missing scenario for coordination' },
            { status: 400 }
          );
        }

        console.log(`🤝 Starting executive coordination: ${scenario.type}`);
        
        const coordinationResult = await multiExecutiveCoordinator.coordinateExecutiveResponse(
          scenario as CoordinationScenario,
          context || {}
        );

        return NextResponse.json({
          success: true,
          result: {
            scenarioId: coordinationResult.scenarioId,
            coordinationType: coordinationResult.coordinationType,
            finalDecision: coordinationResult.finalDecision,
            consensus: coordinationResult.consensus,
            confidence: coordinationResult.confidence,
            executionPlan: coordinationResult.executionPlan,
            totalProcessingTime: coordinationResult.totalProcessingTime,
            nvlinkUtilization: coordinationResult.nvlinkUtilization,
            executiveCount: coordinationResult.executiveResponses.size,
            executiveResponses: Array.from(coordinationResult.executiveResponses.entries()).map(
              ([id, response]) => ({
                executiveId: id,
                confidence: response.confidence,
                processingTime: response.processingTime,
                recommendations: response.recommendations
              })
            )
          },
          timestamp: new Date().toISOString()
        });

      case 'optimize_placement':
        const { executives } = body;
        if (!executives || !Array.isArray(executives)) {
          return NextResponse.json(
            { error: 'Missing or invalid executives array' },
            { status: 400 }
          );
        }

        const placement = await nvlinkFabricCoordinator.optimizeExecutivePlacement(executives);
        
        return NextResponse.json({
          success: true,
          placement: Object.fromEntries(placement),
          fabricMetrics: nvlinkFabricCoordinator.getFabricMetrics(),
          timestamp: new Date().toISOString()
        });

      case 'get_fabric_status':
        const fabricMetrics = nvlinkFabricCoordinator.getFabricMetrics();
        const fabricTopology = nvlinkFabricCoordinator.getFabricTopology();
        const activeSessions = nvlinkFabricCoordinator.getActiveSessions();

        return NextResponse.json({
          success: true,
          fabricStatus: {
            metrics: fabricMetrics,
            topology: Object.fromEntries(fabricTopology),
            activeSessions: Object.fromEntries(activeSessions),
            isOptimized: fabricMetrics.throughputEfficiency > 0.7
          },
          timestamp: new Date().toISOString()
        });

      case 'get_coordination_history':
        const history = multiExecutiveCoordinator.getCoordinationHistory();
        const activeCoordinations = multiExecutiveCoordinator.getActiveCoordinations();

        return NextResponse.json({
          success: true,
          coordinationData: {
            history: history.slice(-20), // Last 20 coordinations
            active: Object.fromEntries(activeCoordinations),
            totalCoordinations: history.length,
            averageProcessingTime: history.length > 0 ? 
              history.reduce((sum, c) => sum + c.totalProcessingTime, 0) / history.length : 0
          },
          timestamp: new Date().toISOString()
        });

      case 'get_executive_roles':
        const executiveRoles = multiExecutiveCoordinator.getExecutiveRoles();
        
        return NextResponse.json({
          success: true,
          executives: Object.fromEntries(executiveRoles),
          totalExecutives: executiveRoles.size,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use: coordinate, optimize_placement, get_fabric_status, get_coordination_history, get_executive_roles` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Coordination API error:', error);
    return NextResponse.json(
      { 
        error: 'Coordination request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get coordination system status and capabilities
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    const rateLimitResult = rateLimiters.checkLimit('api', clientIP);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimitResult.resetTime },
        { status: 429 }
      );
    }

    // Get user ID from query params
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Authenticate user
    const isAuthenticated = await authSystem.validateSession(userId);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get comprehensive coordination system status
    const fabricMetrics = nvlinkFabricCoordinator.getFabricMetrics();
    const executiveRoles = multiExecutiveCoordinator.getExecutiveRoles();
    const coordinationHistory = multiExecutiveCoordinator.getCoordinationHistory();
    const activeCoordinations = multiExecutiveCoordinator.getActiveCoordinations();

    // Calculate system performance metrics
    const systemMetrics = {
      fabricUtilization: fabricMetrics.throughputEfficiency,
      averageLatency: fabricMetrics.averageLatency,
      activeExecutives: fabricMetrics.executiveDistribution.size,
      totalBandwidth: fabricMetrics.totalBandwidth,
      coordinationSuccess: coordinationHistory.length > 0 ? 
        coordinationHistory.filter(c => c.confidence > 0.7).length / coordinationHistory.length : 1.0,
      averageConsensus: coordinationHistory.length > 0 ?
        coordinationHistory.reduce((sum, c) => sum + c.consensus, 0) / coordinationHistory.length : 0
    };

    // Define available coordination scenarios
    const availableScenarios = [
      {
        type: 'financial_analysis',
        description: 'Comprehensive financial analysis and planning',
        requiredExecutives: ['cfo', 'sovren-ai'],
        optionalExecutives: ['coo', 'cso'],
        coordinationPattern: 'hierarchical',
        estimatedDuration: 15
      },
      {
        type: 'strategic_planning',
        description: 'Long-term strategic planning and vision setting',
        requiredExecutives: ['cso', 'cfo', 'cmo', 'cto'],
        optionalExecutives: ['sovren-ai'],
        coordinationPattern: 'consensus',
        estimatedDuration: 30
      },
      {
        type: 'crisis_management',
        description: 'Emergency response and crisis management',
        requiredExecutives: ['sovren-ai', 'cfo', 'clo', 'coo'],
        optionalExecutives: ['cmo', 'cto', 'chro'],
        coordinationPattern: 'hierarchical',
        estimatedDuration: 10
      },
      {
        type: 'market_analysis',
        description: 'Market research and competitive analysis',
        requiredExecutives: ['cmo', 'cso'],
        optionalExecutives: ['cfo', 'cto'],
        coordinationPattern: 'parallel',
        estimatedDuration: 20
      },
      {
        type: 'technical_review',
        description: 'Technical architecture and innovation review',
        requiredExecutives: ['cto', 'sovren-ai'],
        optionalExecutives: ['cfo', 'coo'],
        coordinationPattern: 'sequential',
        estimatedDuration: 25
      },
      {
        type: 'legal_compliance',
        description: 'Legal compliance and risk assessment',
        requiredExecutives: ['clo', 'cfo'],
        optionalExecutives: ['chro', 'coo'],
        coordinationPattern: 'hierarchical',
        estimatedDuration: 20
      },
      {
        type: 'operational_planning',
        description: 'Operational efficiency and process optimization',
        requiredExecutives: ['coo', 'cto'],
        optionalExecutives: ['chro', 'cfo'],
        coordinationPattern: 'parallel',
        estimatedDuration: 18
      }
    ];

    return NextResponse.json({
      success: true,
      coordinationSystem: {
        status: 'operational',
        capabilities: {
          nvlinkFabric: true,
          parallelProcessing: true,
          consensusBuilding: true,
          hierarchicalCoordination: true,
          sequentialCoordination: true
        },
        systemMetrics,
        fabricMetrics,
        executives: Object.fromEntries(executiveRoles),
        availableScenarios,
        recentActivity: {
          totalCoordinations: coordinationHistory.length,
          activeCoordinations: activeCoordinations.size,
          lastCoordination: coordinationHistory.length > 0 ? 
            coordinationHistory[coordinationHistory.length - 1].scenarioId : null
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Coordination status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get coordination status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check for coordination system
 */
export async function HEAD(request: NextRequest) {
  try {
    const fabricMetrics = nvlinkFabricCoordinator.getFabricMetrics();
    const activeCoordinations = multiExecutiveCoordinator.getActiveCoordinations();
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Coordination-System': 'operational',
        'X-NVLink-Utilization': fabricMetrics.throughputEfficiency.toString(),
        'X-Active-Coordinations': activeCoordinations.size.toString(),
        'X-Total-Bandwidth': `${fabricMetrics.totalBandwidth}GB/s`,
        'X-Average-Latency': `${fabricMetrics.averageLatency}μs`,
        'X-Service-Status': 'healthy'
      }
    });

  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Service-Status': 'error',
        'X-Error': error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}
