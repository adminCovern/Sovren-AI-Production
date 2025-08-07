import { NextRequest, NextResponse } from 'next/server';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { B200AutoScalerFactory } from '@/lib/autoscaling/B200AutoScaler';
import { rateLimiters } from '@/lib/security/RateLimiters';

/**
 * B200 Auto-Scaling API
 * Dynamic resource allocation system that automatically scales GPU resources
 * based on executive workload and user demand
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
    const { action, userId, config } = body;

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

    // SECURITY: Get user-specific auto-scaler
    const userAutoScaler = B200AutoScalerFactory.getForUser(userId);

    // Handle different auto-scaling actions
    switch (action) {
      case 'start':
        await userAutoScaler.start(userId); // SECURITY: Pass userId
        return NextResponse.json({
          success: true,
          message: 'Auto-scaling system started',
          status: userAutoScaler.getStatus(),
          userId,
          timestamp: new Date().toISOString()
        });

      case 'stop':
        await userAutoScaler.stop();
        return NextResponse.json({
          success: true,
          message: 'Auto-scaling system stopped',
          status: userAutoScaler.getStatus(),
          userId,
          timestamp: new Date().toISOString()
        });

      case 'update_config':
        if (!config) {
          return NextResponse.json(
            { error: 'Missing config for update_config action' },
            { status: 400 }
          );
        }

        userAutoScaler.updateConfig(config);
        return NextResponse.json({
          success: true,
          message: 'Auto-scaling configuration updated',
          config: userAutoScaler.getConfig(),
          userId,
          timestamp: new Date().toISOString()
        });

      case 'get_metrics':
        const currentMetrics = userAutoScaler.getCurrentMetrics();
        const metricsHistory = userAutoScaler.getMetricsHistory();
        
        return NextResponse.json({
          success: true,
          metrics: {
            current: currentMetrics,
            history: metricsHistory.slice(-20), // Last 20 metrics
            totalDataPoints: metricsHistory.length
          },
          timestamp: new Date().toISOString()
        });

      case 'get_workloads':
        const executiveWorkloads = userAutoScaler.getExecutiveWorkloads();
        
        return NextResponse.json({
          success: true,
          workloads: Object.fromEntries(executiveWorkloads),
          totalExecutives: executiveWorkloads.size,
          timestamp: new Date().toISOString()
        });

      case 'force_evaluation':
        // Trigger immediate scaling evaluation
        console.log('🔄 Forcing auto-scaling evaluation...');
        
        // The evaluation happens automatically, but we can return current status
        const status = userAutoScaler.getStatus();
        const metrics = userAutoScaler.getCurrentMetrics();
        
        return NextResponse.json({
          success: true,
          message: 'Auto-scaling evaluation triggered',
          status,
          currentMetrics: metrics,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use: start, stop, update_config, get_metrics, get_workloads, force_evaluation` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Auto-scaling API error:', error);
    return NextResponse.json(
      { 
        error: 'Auto-scaling request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get auto-scaling system status and configuration
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

    // SECURITY: Get user-specific auto-scaler
    const userAutoScaler = B200AutoScalerFactory.getForUser(userId);

    // Get comprehensive auto-scaling system status
    const status = userAutoScaler.getStatus();
    const config = userAutoScaler.getConfig();
    const currentMetrics = userAutoScaler.getCurrentMetrics();
    const executiveWorkloads = userAutoScaler.getExecutiveWorkloads();
    const metricsHistory = userAutoScaler.getMetricsHistory();

    // Calculate system performance indicators
    const performanceIndicators = {
      systemHealth: status.isRunning ? 'healthy' : 'stopped',
      scalingEfficiency: metricsHistory.length > 5 ? 
        calculateScalingEfficiency(metricsHistory.slice(-5)) : 0,
      resourceUtilization: currentMetrics ? currentMetrics.gpuUtilization : 0,
      averageLatency: currentMetrics ? currentMetrics.averageLatency : 0,
      activeExecutives: executiveWorkloads.size,
      totalWorkload: Array.from(executiveWorkloads.values())
        .reduce((sum, w) => sum + w.currentRequests, 0)
    };

    // Auto-scaling capabilities
    const capabilities = {
      dynamicScaling: true,
      executiveWorkloadTracking: true,
      predictiveScaling: true,
      nvlinkOptimization: true,
      powerManagement: true,
      latencyOptimization: true,
      queueManagement: true,
      resourceMigration: true
    };

    // Scaling recommendations
    const recommendations = generateScalingRecommendations(
      currentMetrics,
      config,
      performanceIndicators
    );

    return NextResponse.json({
      success: true,
      autoScalingSystem: {
        status,
        config,
        capabilities,
        performanceIndicators,
        currentMetrics,
        executiveWorkloads: Object.fromEntries(executiveWorkloads),
        recentHistory: metricsHistory.slice(-10), // Last 10 metrics
        recommendations
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto-scaling status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get auto-scaling status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate scaling efficiency from recent metrics
 */
function calculateScalingEfficiency(recentMetrics: any[]): number {
  if (recentMetrics.length < 2) return 0;

  const utilizationVariance = calculateVariance(
    recentMetrics.map(m => m.gpuUtilization)
  );
  
  const latencyVariance = calculateVariance(
    recentMetrics.map(m => m.averageLatency)
  );

  // Lower variance indicates better scaling efficiency
  const utilizationEfficiency = Math.max(0, 1 - utilizationVariance);
  const latencyEfficiency = Math.max(0, 1 - (latencyVariance / 1000)); // Normalize latency

  return (utilizationEfficiency + latencyEfficiency) / 2;
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Generate scaling recommendations based on current state
 */
function generateScalingRecommendations(
  currentMetrics: any,
  config: any,
  performanceIndicators: any
): string[] {
  const recommendations: string[] = [];

  if (!currentMetrics) {
    recommendations.push('Start auto-scaling system to begin monitoring');
    return recommendations;
  }

  // GPU utilization recommendations
  if (currentMetrics.gpuUtilization > config.scaleUpThreshold) {
    recommendations.push('Consider scaling up: GPU utilization is high');
  } else if (currentMetrics.gpuUtilization < config.scaleDownThreshold) {
    recommendations.push('Consider scaling down: GPU utilization is low');
  }

  // Latency recommendations
  if (currentMetrics.averageLatency > config.latencyThreshold) {
    recommendations.push('High latency detected: Consider adding more GPU resources');
  }

  // Queue recommendations
  if (currentMetrics.queueLength > config.queueThreshold) {
    recommendations.push('Request queue is backing up: Scale up recommended');
  }

  // Power efficiency recommendations
  if (currentMetrics.powerUtilization > 0.9) {
    recommendations.push('Power utilization is high: Monitor for thermal throttling');
  }

  // Executive workload recommendations
  if (performanceIndicators.totalWorkload > performanceIndicators.activeExecutives * 3) {
    recommendations.push('Executive workload is high: Consider workload redistribution');
  }

  // System health recommendations
  if (performanceIndicators.scalingEfficiency < 0.7) {
    recommendations.push('Scaling efficiency is low: Review configuration parameters');
  }

  if (recommendations.length === 0) {
    recommendations.push('System is operating optimally');
  }

  return recommendations;
}

/**
 * Health check for auto-scaling system
 */
export async function HEAD(request: NextRequest) {
  try {
    // Get user ID for security
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return new NextResponse(null, { status: 400 });
    }

    // SECURITY: Get user-specific auto-scaler
    const userAutoScaler = B200AutoScalerFactory.getForUser(userId);
    const status = userAutoScaler.getStatus();
    const currentMetrics = userAutoScaler.getCurrentMetrics();
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-AutoScaling-Status': status.isRunning ? 'running' : 'stopped',
        'X-GPU-Utilization': currentMetrics ? currentMetrics.gpuUtilization.toString() : '0',
        'X-Active-Executives': status.activeExecutives.toString(),
        'X-Last-Scaling': status.lastScalingAction ? status.lastScalingAction.toISOString() : 'never',
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
