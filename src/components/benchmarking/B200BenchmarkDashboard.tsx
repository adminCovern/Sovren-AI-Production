'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Zap, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  Activity,
  Cpu,
  Play,
  RefreshCw,
  Award
} from 'lucide-react';

/**
 * B200 Performance Benchmarking Dashboard
 * Comprehensive performance measurement and comparison visualization
 */

interface BenchmarkSystemStatus {
  status: string;
  capabilities: {
    llmInference: boolean;
    voiceSynthesis: boolean;
    executiveCoordination: boolean;
    resourceManagement: boolean;
    performanceComparison: boolean;
    realTimeMetrics: boolean;
  };
  systemMetrics: {
    totalSuites: number;
    completedSuites: number;
    runningSuites: number;
    totalTests: number;
    completedTests: number;
    averagePerformanceGain: number;
    maxPerformanceGain: number;
    lastBenchmark: string | null;
  };
  benchmarkCategories: Array<{
    category: string;
    description: string;
    suiteId: string;
    estimatedDuration: number;
    tests: number;
  }>;
  recentResults: any[];
  performanceSummary: {
    totalTests: number;
    averageGain: number;
    maxGain: number;
    minGain: number;
    componentBreakdown: Record<string, any>;
  };
}

export default function B200BenchmarkDashboard({ userId }: { userId: string }) {
  const [systemStatus, setSystemStatus] = useState<BenchmarkSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningBenchmark, setRunningBenchmark] = useState<string | null>(null);
  const [benchmarkProgress, setBenchmarkProgress] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch benchmark system status
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch(`/api/benchmark?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setSystemStatus(result.benchmarkSystem);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch system status');
      }
    } catch (err) {
      console.error('System status fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 10000); // 10 second refresh
    return () => clearInterval(interval);
  }, [userId]);

  // Run benchmark suite
  const runBenchmarkSuite = async (suiteId: string, suiteName: string) => {
    if (runningBenchmark) return;

    setRunningBenchmark(suiteId);
    setBenchmarkProgress(0);

    try {
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_suite',
          userId,
          suiteId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Benchmark suite completed: ${suiteName}`, result);
        setBenchmarkProgress(100);
        await fetchSystemStatus(); // Refresh status
      } else {
        throw new Error('Benchmark suite failed');
      }
    } catch (err) {
      console.error('Benchmark error:', err);
      setError(err instanceof Error ? err.message : 'Benchmark failed');
    } finally {
      setRunningBenchmark(null);
      setBenchmarkProgress(0);
    }
  };

  // Run all benchmark suites
  const runAllBenchmarks = async () => {
    if (runningBenchmark) return;

    setRunningBenchmark('all');
    setBenchmarkProgress(0);

    try {
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_all_suites',
          userId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ All benchmark suites completed', result);
        setBenchmarkProgress(100);
        await fetchSystemStatus();
      } else {
        throw new Error('All benchmarks failed');
      }
    } catch (err) {
      console.error('All benchmarks error:', err);
      setError(err instanceof Error ? err.message : 'All benchmarks failed');
    } finally {
      setRunningBenchmark(null);
      setBenchmarkProgress(0);
    }
  };

  // Format numbers
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatPerformanceGain = (gain: number): string => {
    return `${formatNumber(gain, 1)}x`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Benchmark Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading benchmark dashboard: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchSystemStatus}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!systemStatus) {
    return <div>No benchmark system data available</div>;
  }

  const { systemMetrics, benchmarkCategories, recentResults, performanceSummary } = systemStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">B200 Performance Benchmarking</h1>
          <p className="text-gray-600">
            Comprehensive performance measurement vs placeholder implementations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={systemStatus.status === 'operational' ? "default" : "secondary"}>
            {systemStatus.status === 'operational' ? "System Operational" : "System Offline"}
          </Badge>
          <Button
            onClick={runAllBenchmarks}
            disabled={!!runningBenchmark}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {runningBenchmark === 'all' ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running All...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Benchmarks
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Performance Gain</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPerformanceGain(systemMetrics.averagePerformanceGain)}
            </div>
            <p className="text-xs text-muted-foreground">
              vs placeholder implementations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maximum Gain</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatPerformanceGain(systemMetrics.maxPerformanceGain)}
            </div>
            <p className="text-xs text-muted-foreground">
              Best performance improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tests</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics.completedTests}/{systemMetrics.totalTests}
            </div>
            <Progress 
              value={(systemMetrics.completedTests / systemMetrics.totalTests) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Benchmark Suites</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics.completedSuites}/{systemMetrics.totalSuites}
            </div>
            <p className="text-xs text-muted-foreground">
              {systemMetrics.runningSuites} currently running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Running Benchmark Progress */}
      {runningBenchmark && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Running Benchmark: {runningBenchmark === 'all' ? 'All Suites' : runningBenchmark}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={benchmarkProgress} className="mb-2" />
            <p className="text-sm text-gray-600">
              {benchmarkProgress === 0 ? 'Initializing...' : 
               benchmarkProgress === 100 ? 'Completed!' : 
               `Progress: ${benchmarkProgress}%`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* System Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Cpu className="h-5 w-5 mr-2" />
            Benchmark Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(systemStatus.capabilities).map(([capability, enabled]) => (
              <div key={capability} className="flex items-center space-x-2">
                {enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm capitalize">
                  {capability.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Benchmark Categories ({benchmarkCategories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benchmarkCategories.map((category) => (
              <div key={category.suiteId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{category.category}</div>
                  <Badge variant="outline">
                    {category.tests} tests
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {category.description}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>
                    <Clock className="h-3 w-3 inline mr-1" />
                    ~{formatDuration(category.estimatedDuration)}
                  </span>
                  <span>
                    <Zap className="h-3 w-3 inline mr-1" />
                    B200 Optimized
                  </span>
                </div>
                <Button
                  onClick={() => runBenchmarkSuite(category.suiteId, category.category)}
                  disabled={!!runningBenchmark}
                  className="w-full"
                  size="sm"
                  variant={runningBenchmark === category.suiteId ? "secondary" : "default"}
                >
                  {runningBenchmark === category.suiteId ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-2" />
                      Run Benchmark
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      {performanceSummary.totalTests > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {formatPerformanceGain(performanceSummary.averageGain)}
                </div>
                <div className="text-sm text-gray-600">Average Gain</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {formatPerformanceGain(performanceSummary.maxGain)}
                </div>
                <div className="text-sm text-gray-600">Maximum Gain</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {performanceSummary.totalTests}
                </div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </div>
            </div>

            {/* Component Breakdown */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">Performance by Component</h4>
              <div className="space-y-2">
                {Object.entries(performanceSummary.componentBreakdown).map(([component, data]: [string, any]) => (
                  <div key={component} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="capitalize">{component.replace('_', ' ')}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{data.tests} tests</span>
                      <Badge variant="outline">
                        {formatPerformanceGain(data.averageGain)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Benchmark Results ({recentResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentResults.slice(0, 5).map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{result.testName}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {result.component.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatPerformanceGain(result.performanceGain)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
        <span className="ml-2">• Auto-refreshing every 10 seconds</span>
      </div>
    </div>
  );
}
