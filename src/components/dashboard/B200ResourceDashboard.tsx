'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Thermometer, 
  Zap, 
  Users, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

/**
 * B200 Resource Monitoring Dashboard
 * Real-time visualization of GPU metrics, executive workloads, and performance alerts
 */

interface B200GPUMetrics {
  gpuId: number;
  name: string;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  memoryUtilization: number;
  temperature: number;
  powerUsage: number;
  powerLimit: number;
  clockSpeed: number;
  tensorCoreUtilization: number;
  fp8Operations: number;
  nvlinkUtilization: number;
  timestamp: Date;
}

interface ExecutiveWorkload {
  executiveRole: string;
  executiveName: string;
  gpuId: number;
  allocationId: string;
  memoryAllocated: number;
  currentTask: string;
  taskStartTime: Date;
  estimatedCompletion: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  utilizationPercent: number;
  operationsPerSecond: number;
  modelType: 'llm' | 'tts' | 'analysis';
  quantization: 'fp8' | 'fp16' | 'int8';
}

interface B200ClusterMetrics {
  totalGPUs: number;
  activeGPUs: number;
  totalMemory: number;
  usedMemory: number;
  totalPower: number;
  usedPower: number;
  averageUtilization: number;
  averageTemperature: number;
  nvlinkThroughput: number;
  fp8ThroughputTOPS: number;
  activeExecutives: number;
  queuedTasks: number;
  timestamp: Date;
}

interface B200PerformanceAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'temperature' | 'memory' | 'utilization' | 'power' | 'error';
  gpuId?: number;
  executiveRole?: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface DashboardData {
  gpuMetrics: B200GPUMetrics[];
  clusterMetrics: B200ClusterMetrics;
  executiveWorkloads: ExecutiveWorkload[];
  alerts: B200PerformanceAlert[];
  isMonitoring: boolean;
}

export default function B200ResourceDashboard({ userId }: { userId: string }) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard/b200?userId=${userId}&type=current`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Auto-refresh effect
  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 2000); // 2 second refresh
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchDashboardData, autoRefresh]);

  // Start/stop monitoring
  const toggleMonitoring = async () => {
    try {
      const action = dashboardData?.isMonitoring ? 'stop' : 'start';
      const response = await fetch('/api/dashboard/b200', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId })
      });

      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Toggle monitoring error:', err);
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/dashboard/b200', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge_alert', alertId, userId })
      });

      if (response.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      console.error('Acknowledge alert error:', err);
    }
  };

  // Format numbers
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatBytes = (bytes: number): string => {
    return `${formatNumber(bytes)} GB`;
  };

  const formatOpsPerSec = (ops: number): string => {
    if (ops >= 1e12) return `${formatNumber(ops / 1e12)} TOPS`;
    if (ops >= 1e9) return `${formatNumber(ops / 1e9)} GOPS`;
    if (ops >= 1e6) return `${formatNumber(ops / 1e6)} MOPS`;
    return `${formatNumber(ops / 1e3)} KOPS`;
  };

  // Get severity color
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading B200 Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading dashboard: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDashboardData}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return <div>No dashboard data available</div>;
  }

  const { gpuMetrics, clusterMetrics, executiveWorkloads, alerts } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">B200 Resource Dashboard</h1>
          <p className="text-gray-600">
            Real-time monitoring of NVIDIA B200 Blackwell GPUs
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={dashboardData.isMonitoring ? "default" : "secondary"}>
            {dashboardData.isMonitoring ? "Monitoring Active" : "Monitoring Stopped"}
          </Badge>
          <Button
            onClick={toggleMonitoring}
            variant={dashboardData.isMonitoring ? "destructive" : "default"}
          >
            {dashboardData.isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
          >
            Auto Refresh: {autoRefresh ? "ON" : "OFF"}
          </Button>
        </div>
      </div>

      {/* Cluster Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active GPUs</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clusterMetrics.activeGPUs}/{clusterMetrics.totalGPUs}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber((clusterMetrics.activeGPUs / clusterMetrics.totalGPUs) * 100)}% active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(clusterMetrics.usedMemory)}/{formatBytes(clusterMetrics.totalMemory)}
            </div>
            <Progress 
              value={(clusterMetrics.usedMemory / clusterMetrics.totalMemory) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Power Usage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clusterMetrics.usedPower}W/{clusterMetrics.totalPower}W
            </div>
            <Progress 
              value={(clusterMetrics.usedPower / clusterMetrics.totalPower) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FP8 Throughput</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(clusterMetrics.fp8ThroughputTOPS)} TOPS
            </div>
            <p className="text-xs text-muted-foreground">
              {clusterMetrics.activeExecutives} executives active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-sm opacity-75">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                        {alert.gpuId !== undefined && ` • GPU ${alert.gpuId}`}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* GPU Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {gpuMetrics.map((gpu) => (
          <Card key={gpu.gpuId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>GPU {gpu.gpuId}</span>
                <Badge variant={gpu.utilization > 80 ? "default" : "secondary"}>
                  {gpu.utilization}% Util
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Memory</div>
                  <div className="font-medium">
                    {formatBytes(gpu.memoryUsed)}/{formatBytes(gpu.memoryTotal)}
                  </div>
                  <Progress value={gpu.memoryUtilization} className="mt-1" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Temperature</div>
                  <div className="font-medium flex items-center">
                    <Thermometer className="h-4 w-4 mr-1" />
                    {formatNumber(gpu.temperature)}°C
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Power</div>
                  <div className="font-medium">
                    {gpu.powerUsage}W/{gpu.powerLimit}W
                  </div>
                  <Progress value={(gpu.powerUsage / gpu.powerLimit) * 100} className="mt-1" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tensor Cores</div>
                  <div className="font-medium">{gpu.tensorCoreUtilization}%</div>
                  <Progress value={gpu.tensorCoreUtilization} className="mt-1" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Clock Speed</div>
                  <div className="font-medium">{gpu.clockSpeed} MHz</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">FP8 Ops</div>
                  <div className="font-medium">{formatOpsPerSec(gpu.fp8Operations)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Executive Workloads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Executive Workloads ({executiveWorkloads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {executiveWorkloads.map((workload) => (
              <div
                key={workload.allocationId}
                className="p-4 border rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">{workload.executiveName}</div>
                    <div className="text-sm text-gray-600">{workload.executiveRole}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(workload.priority)}>
                      {workload.priority}
                    </Badge>
                    <Badge variant="outline">
                      GPU {workload.gpuId}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Current Task</div>
                    <div className="font-medium">{workload.currentTask}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Memory</div>
                    <div className="font-medium">{formatBytes(workload.memoryAllocated)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Utilization</div>
                    <div className="font-medium">{formatNumber(workload.utilizationPercent)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Operations</div>
                    <div className="font-medium">{formatOpsPerSec(workload.operationsPerSecond)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
        {dashboardData.isMonitoring && (
          <span className="ml-2">• Auto-refreshing every 2 seconds</span>
        )}
      </div>
    </div>
  );
}
