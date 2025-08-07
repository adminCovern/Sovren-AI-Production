import { NextRequest, NextResponse } from 'next/server';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { b200ResourceMonitor } from '@/lib/monitoring/B200ResourceMonitor';
import { rateLimiters } from '@/lib/security/RateLimiters';

/**
 * B200 Resource Monitoring Dashboard API
 * Provides real-time GPU metrics, executive workloads, and performance data
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

    // Get query parameters
    const metricsType = request.nextUrl.searchParams.get('type') || 'current';
    const gpuId = request.nextUrl.searchParams.get('gpuId');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');

    // Handle different metric requests
    switch (metricsType) {
      case 'current':
        const currentMetrics = await b200ResourceMonitor.getCurrentMetrics();
        return NextResponse.json({
          success: true,
          data: currentMetrics,
          timestamp: new Date().toISOString()
        });

      case 'history':
        if (!gpuId) {
          return NextResponse.json(
            { error: 'gpuId required for history request' },
            { status: 400 }
          );
        }
        const history = b200ResourceMonitor.getGPUHistory(parseInt(gpuId), limit);
        return NextResponse.json({
          success: true,
          data: {
            gpuId: parseInt(gpuId),
            history,
            count: history.length
          },
          timestamp: new Date().toISOString()
        });

      case 'alerts':
        const currentData = await b200ResourceMonitor.getCurrentMetrics();
        return NextResponse.json({
          success: true,
          data: {
            alerts: currentData.alerts,
            count: currentData.alerts.length
          },
          timestamp: new Date().toISOString()
        });

      case 'executives':
        const executiveData = await b200ResourceMonitor.getCurrentMetrics();
        return NextResponse.json({
          success: true,
          data: {
            executiveWorkloads: executiveData.executiveWorkloads,
            activeExecutives: executiveData.executiveWorkloads.length
          },
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid metrics type. Use: current, history, alerts, executives' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('B200 Dashboard API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get B200 metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Start/stop monitoring
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
    const { action, userId } = body;

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

    // Handle monitoring actions
    switch (action) {
      case 'start':
        await b200ResourceMonitor.startMonitoring();
        return NextResponse.json({
          success: true,
          message: 'B200 monitoring started',
          timestamp: new Date().toISOString()
        });

      case 'stop':
        b200ResourceMonitor.stopMonitoring();
        return NextResponse.json({
          success: true,
          message: 'B200 monitoring stopped',
          timestamp: new Date().toISOString()
        });

      case 'acknowledge_alert':
        const { alertId } = body;
        if (!alertId) {
          return NextResponse.json(
            { error: 'Missing alertId for acknowledge action' },
            { status: 400 }
          );
        }
        b200ResourceMonitor.acknowledgeAlert(alertId);
        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged',
          alertId,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, acknowledge_alert' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('B200 Dashboard POST error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process B200 monitoring action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check for B200 monitoring system
 */
export async function HEAD(request: NextRequest) {
  try {
    const currentMetrics = await b200ResourceMonitor.getCurrentMetrics();
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-B200-Monitoring': currentMetrics.isMonitoring ? 'active' : 'inactive',
        'X-Active-GPUs': currentMetrics.clusterMetrics?.activeGPUs?.toString() || '0',
        'X-Active-Executives': currentMetrics.clusterMetrics?.activeExecutives?.toString() || '0',
        'X-Alerts-Count': currentMetrics.alerts?.length?.toString() || '0',
        'X-Service-Status': 'operational'
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
