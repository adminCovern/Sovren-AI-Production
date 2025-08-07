import { NextRequest, NextResponse } from 'next/server';
import { authSystem } from '@/lib/auth/AuthenticationSystem';
import { b200PerformanceBenchmark } from '@/lib/benchmarking/B200PerformanceBenchmark';
import { rateLimiters } from '@/lib/security/RateLimiters';

/**
 * B200 Performance Benchmarking API
 * Provides comprehensive performance measurement and comparison capabilities
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
    const { action, userId, suiteId, testId } = body;

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

    // Handle different benchmark actions
    switch (action) {
      case 'initialize':
        await b200PerformanceBenchmark.initialize();
        return NextResponse.json({
          success: true,
          message: 'Benchmark system initialized',
          timestamp: new Date().toISOString()
        });

      case 'run_suite':
        if (!suiteId) {
          return NextResponse.json(
            { error: 'Missing suiteId for run_suite action' },
            { status: 400 }
          );
        }

        console.log(`🚀 Starting benchmark suite: ${suiteId}`);
        
        const suiteResult = await b200PerformanceBenchmark.runBenchmarkSuite(suiteId);
        
        return NextResponse.json({
          success: true,
          suite: {
            suiteId: suiteResult.suiteId,
            name: suiteResult.name,
            status: suiteResult.status,
            totalTests: suiteResult.totalTests,
            completedTests: suiteResult.completedTests,
            overallGain: suiteResult.overallGain,
            startTime: suiteResult.startTime,
            endTime: suiteResult.endTime,
            duration: suiteResult.endTime && suiteResult.startTime ? 
              suiteResult.endTime.getTime() - suiteResult.startTime.getTime() : 0
          },
          timestamp: new Date().toISOString()
        });

      case 'run_all_suites':
        console.log('🚀 Running all benchmark suites...');
        
        const allSuites = b200PerformanceBenchmark.getBenchmarkSuites();
        const allResults = [];
        
        for (const [id, suite] of allSuites.entries()) {
          try {
            const result = await b200PerformanceBenchmark.runBenchmarkSuite(id);
            allResults.push({
              suiteId: result.suiteId,
              name: result.name,
              status: result.status,
              overallGain: result.overallGain,
              completedTests: result.completedTests,
              totalTests: result.totalTests
            });
          } catch (error) {
            console.error(`❌ Suite ${id} failed:`, error);
            allResults.push({
              suiteId: id,
              name: suite.name,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
        
        return NextResponse.json({
          success: true,
          results: allResults,
          totalSuites: allResults.length,
          successfulSuites: allResults.filter(r => r.status === 'completed').length,
          timestamp: new Date().toISOString()
        });

      case 'get_results':
        const results = b200PerformanceBenchmark.getBenchmarkResults();
        const summary = b200PerformanceBenchmark.getPerformanceSummary();
        
        return NextResponse.json({
          success: true,
          results: Object.fromEntries(results),
          summary,
          timestamp: new Date().toISOString()
        });

      case 'get_suites':
        const suites = b200PerformanceBenchmark.getBenchmarkSuites();
        
        return NextResponse.json({
          success: true,
          suites: Object.fromEntries(suites),
          totalSuites: suites.size,
          timestamp: new Date().toISOString()
        });

      case 'cleanup':
        await b200PerformanceBenchmark.cleanup();
        return NextResponse.json({
          success: true,
          message: 'Benchmark system cleaned up',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Use: initialize, run_suite, run_all_suites, get_results, get_suites, cleanup` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Benchmark API error:', error);
    return NextResponse.json(
      { 
        error: 'Benchmark request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get benchmark system status and available suites
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

    // Get comprehensive benchmark system status
    const suites = b200PerformanceBenchmark.getBenchmarkSuites();
    const results = b200PerformanceBenchmark.getBenchmarkResults();
    const summary = b200PerformanceBenchmark.getPerformanceSummary();

    // Calculate system metrics
    const systemMetrics = {
      totalSuites: suites.size,
      completedSuites: Array.from(suites.values()).filter(s => s.status === 'completed').length,
      runningSuites: Array.from(suites.values()).filter(s => s.status === 'running').length,
      totalTests: Array.from(suites.values()).reduce((sum, s) => sum + s.totalTests, 0),
      completedTests: results.size,
      averagePerformanceGain: summary.averageGain || 0,
      maxPerformanceGain: summary.maxGain || 0,
      lastBenchmark: results.size > 0 ? 
        Array.from(results.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp : null
    };

    // Available benchmark categories
    const benchmarkCategories = [
      {
        category: 'LLM Inference',
        description: 'B200-accelerated language model inference performance',
        suiteId: 'llm_inference_suite',
        estimatedDuration: 135, // seconds
        tests: 3
      },
      {
        category: 'Voice Synthesis',
        description: 'B200-accelerated voice synthesis performance',
        suiteId: 'voice_synthesis_suite',
        estimatedDuration: 90,
        tests: 3
      },
      {
        category: 'Executive Coordination',
        description: 'NVLink-optimized multi-executive coordination',
        suiteId: 'coordination_suite',
        estimatedDuration: 145,
        tests: 3
      },
      {
        category: 'Resource Management',
        description: 'B200 resource allocation and optimization',
        suiteId: 'resource_management_suite',
        estimatedDuration: 65,
        tests: 2
      }
    ];

    return NextResponse.json({
      success: true,
      benchmarkSystem: {
        status: 'operational',
        capabilities: {
          llmInference: true,
          voiceSynthesis: true,
          executiveCoordination: true,
          resourceManagement: true,
          performanceComparison: true,
          realTimeMetrics: true
        },
        systemMetrics,
        benchmarkCategories,
        recentResults: Array.from(results.values())
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10), // Last 10 results
        performanceSummary: summary
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Benchmark status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get benchmark status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check for benchmark system
 */
export async function HEAD(request: NextRequest) {
  try {
    const suites = b200PerformanceBenchmark.getBenchmarkSuites();
    const results = b200PerformanceBenchmark.getBenchmarkResults();
    const summary = b200PerformanceBenchmark.getPerformanceSummary();
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Benchmark-System': 'operational',
        'X-Total-Suites': suites.size.toString(),
        'X-Completed-Tests': results.size.toString(),
        'X-Average-Gain': summary.averageGain ? summary.averageGain.toFixed(2) : '0',
        'X-Max-Gain': summary.maxGain ? summary.maxGain.toFixed(2) : '0',
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
