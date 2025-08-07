'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Zap, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  Settings,
  Users,
  Cpu,
  BarChart3,
  Target
} from 'lucide-react';

/**
 * B200 Auto-Scaling Dashboard
 * Real-time visualization of dynamic resource allocation and scaling decisions
 */

interface AutoScalingSystemStatus {
  status: {
    isRunning: boolean;
    lastScalingAction: string | null;
    metricsCount: number;
    activeExecutives: number;
    config: any;
  };
  config: {
    minGPUs: number;
    maxGPUs: number;
    targetUtilization: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownPeriod: number;
    evaluationInterval: number;
    latencyThreshold: number;
    queueThreshold: number;
    powerBudget: number;
  };
  capabilities: Record<string, boolean>;
  performanceIndicators: {
    systemHealth: string;
    scalingEfficiency: number;
    resourceUtilization: number;
    averageLatency: number;
    activeExecutives: number;
    totalWorkload: number;
  };
  currentMetrics: {
    timestamp: string;
    totalRequests: number;
    activeExecutives: number;
    gpuUtilization: number;
    memoryUtilization: number;
    powerUtilization: number;
    averageLatency: number;
    queueLength: number;
    throughput: number;
  } | null;
  executiveWorkloads: Record<string, any>;
  recentHistory: any[];
  recommendations: string[];
}

export default function B200AutoScalingDashboard({ userId }: { userId: string }) {
  const [systemStatus, setSystemStatus] = useState<AutoScalingSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch auto-scaling system status
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch(`/api/autoscaling?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setSystemStatus(result.autoScalingSystem);
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
    const interval = setInterval(fetchSystemStatus, 5000); // 5 second refresh
    return () => clearInterval(interval);
  }, [userId]);

  // Start auto-scaling
  const startAutoScaling = async () => {
    if (actionInProgress) return;

    setActionInProgress('start');
    try {
      const response = await fetch('/api/autoscaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          userId
        })
      });

      if (response.ok) {
        await fetchSystemStatus();
      } else {
        throw new Error('Failed to start auto-scaling');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start failed');
    } finally {
      setActionInProgress(null);
    }
  };

  // Stop auto-scaling
  const stopAutoScaling = async () => {
    if (actionInProgress) return;

    setActionInProgress('stop');
    try {
      const response = await fetch('/api/autoscaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          userId
        })
      });

      if (response.ok) {
        await fetchSystemStatus();
      } else {
        throw new Error('Failed to stop auto-scaling');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stop failed');
    } finally {
      setActionInProgress(null);
    }
  };

  // Force evaluation
  const forceEvaluation = async () => {
    if (actionInProgress) return;

    setActionInProgress('evaluate');
    try {
      const response = await fetch('/api/autoscaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force_evaluation',
          userId
        })
      });

      if (response.ok) {
        await fetchSystemStatus();
      } else {
        throw new Error('Failed to force evaluation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed');
    } finally {
      setActionInProgress(null);
    }
  };

  // Format numbers
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatPercentage = (value: number): string => {
    return `${formatNumber(value * 100)}%`;
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Auto-Scaling Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading auto-scaling dashboard: {error}
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
    return <div>No auto-scaling system data available</div>;
  }

  const { status, config, performanceIndicators, currentMetrics, executiveWorkloads, recommendations } = systemStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">B200 Auto-Scaling Dashboard</h1>
          <p className="text-gray-600">
            Dynamic resource allocation based on executive workload and demand
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={status.isRunning ? "default" : "secondary"}>
            {status.isRunning ? "Auto-Scaling Active" : "Auto-Scaling Stopped"}
          </Badge>
          {status.isRunning ? (
            <Button
              onClick={stopAutoScaling}
              disabled={!!actionInProgress}
              variant="outline"
            >
              {actionInProgress === 'stop' ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Auto-Scaling
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={startAutoScaling}
              disabled={!!actionInProgress}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionInProgress === 'start' ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Auto-Scaling
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPU Utilization</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics ? formatPercentage(currentMetrics.gpuUtilization) : 'N/A'}
            </div>
            <Progress 
              value={currentMetrics ? currentMetrics.gpuUtilization * 100 : 0} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Target: {formatPercentage(config.targetUtilization)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Executives</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceIndicators.activeExecutives}
            </div>
            <p className="text-xs text-muted-foreground">
              Total workload: {performanceIndicators.totalWorkload} requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics ? `${currentMetrics.averageLatency.toFixed(0)}ms` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Threshold: {config.latencyThreshold}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scaling Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(performanceIndicators.scalingEfficiency)}
            </div>
            <Progress 
              value={performanceIndicators.scalingEfficiency * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Auto-Scaling Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">GPU Range</div>
              <div className="font-medium">{config.minGPUs} - {config.maxGPUs} GPUs</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Scale Up Threshold</div>
              <div className="font-medium">{formatPercentage(config.scaleUpThreshold)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Scale Down Threshold</div>
              <div className="font-medium">{formatPercentage(config.scaleDownThreshold)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Cooldown Period</div>
              <div className="font-medium">{formatDuration(config.cooldownPeriod)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Workloads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Executive Workloads ({Object.keys(executiveWorkloads).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(executiveWorkloads).map(([executiveId, workload]: [string, any]) => (
              <div key={executiveId} className="p-3 border rounded-lg">
                <div className="font-medium capitalize">{executiveId.replace('-', ' ')}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <div>Requests: {workload.currentRequests}</div>
                  <div>GPU Usage: {formatPercentage(workload.gpuUtilization)}</div>
                  <div>Priority: {workload.priority}</div>
                </div>
                <Progress 
                  value={workload.gpuUtilization * 100} 
                  className="mt-2 h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Metrics */}
      {currentMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Current System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Total Requests</div>
                <div className="text-2xl font-bold">{currentMetrics.totalRequests}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Queue Length</div>
                <div className="text-2xl font-bold">{currentMetrics.queueLength}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Throughput</div>
                <div className="text-2xl font-bold">{currentMetrics.throughput.toFixed(1)}/min</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Power Usage</div>
                <div className="text-2xl font-bold">{formatPercentage(currentMetrics.powerUtilization)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Scaling Recommendations ({recommendations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{recommendation}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button
              onClick={forceEvaluation}
              disabled={!status.isRunning || !!actionInProgress}
              variant="outline"
            >
              {actionInProgress === 'evaluate' ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Force Evaluation
                </>
              )}
            </Button>
            <Button
              onClick={fetchSystemStatus}
              variant="outline"
            >
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
        <span className="ml-2">• Auto-refreshing every 5 seconds</span>
        {status.lastScalingAction && (
          <span className="ml-2">• Last scaling: {new Date(status.lastScalingAction).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
