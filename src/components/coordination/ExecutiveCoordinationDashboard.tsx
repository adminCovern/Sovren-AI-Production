'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Network, 
  Zap, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  Activity,
  Cpu,
  BarChart3
} from 'lucide-react';

/**
 * Executive Coordination Dashboard
 * Real-time visualization of multi-executive coordination and NVLink fabric utilization
 */

interface CoordinationSystemStatus {
  status: string;
  capabilities: {
    nvlinkFabric: boolean;
    parallelProcessing: boolean;
    consensusBuilding: boolean;
    hierarchicalCoordination: boolean;
    sequentialCoordination: boolean;
  };
  systemMetrics: {
    fabricUtilization: number;
    averageLatency: number;
    activeExecutives: number;
    totalBandwidth: number;
    coordinationSuccess: number;
    averageConsensus: number;
  };
  fabricMetrics: {
    totalBandwidth: number;
    utilizedBandwidth: number;
    averageLatency: number;
    activeConnections: number;
    throughputEfficiency: number;
    coordinationSessions: number;
  };
  executives: Record<string, any>;
  availableScenarios: any[];
  recentActivity: {
    totalCoordinations: number;
    activeCoordinations: number;
    lastCoordination: string | null;
  };
}

export default function ExecutiveCoordinationDashboard({ userId }: { userId: string }) {
  const [systemStatus, setSystemStatus] = useState<CoordinationSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<any>(null);
  const [coordinationInProgress, setCoordinationInProgress] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch coordination system status
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch(`/api/coordination?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setSystemStatus(result.coordinationSystem);
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

  // Execute coordination scenario
  const executeCoordination = async (scenario: any) => {
    if (coordinationInProgress) return;

    setCoordinationInProgress(true);
    setSelectedScenario(scenario);

    try {
      const response = await fetch('/api/coordination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'coordinate',
          userId,
          scenario: {
            scenarioId: `coord-${Date.now()}`,
            ...scenario,
            priority: 'high'
          },
          context: {
            timestamp: new Date().toISOString(),
            requestedBy: userId
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Coordination result:', result);
        await fetchSystemStatus(); // Refresh status
      } else {
        throw new Error('Coordination failed');
      }
    } catch (err) {
      console.error('Coordination error:', err);
      setError(err instanceof Error ? err.message : 'Coordination failed');
    } finally {
      setCoordinationInProgress(false);
      setSelectedScenario(null);
    }
  };

  // Format numbers
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatBandwidth = (bandwidth: number): string => {
    return `${formatNumber(bandwidth)} GB/s`;
  };

  const formatLatency = (latency: number): string => {
    return `${formatNumber(latency)} μs`;
  };

  const formatPercentage = (value: number): string => {
    return `${formatNumber(value * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Coordination Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading coordination dashboard: {error}
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
    return <div>No coordination system data available</div>;
  }

  const { systemMetrics, fabricMetrics, executives, availableScenarios, recentActivity } = systemStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Executive Coordination Dashboard</h1>
          <p className="text-gray-600">
            Multi-GPU executive coordination with NVLink 5.0 fabric optimization
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={systemStatus.status === 'operational' ? "default" : "secondary"}>
            {systemStatus.status === 'operational' ? "System Operational" : "System Offline"}
          </Badge>
          <Button
            onClick={fetchSystemStatus}
            variant="outline"
          >
            Refresh Status
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NVLink Utilization</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(systemMetrics.fabricUtilization)}
            </div>
            <Progress value={systemMetrics.fabricUtilization * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatBandwidth(fabricMetrics.utilizedBandwidth)} / {formatBandwidth(fabricMetrics.totalBandwidth)}
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
              {systemMetrics.activeExecutives}/{Object.keys(executives).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {fabricMetrics.coordinationSessions} active sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatLatency(systemMetrics.averageLatency)}
            </div>
            <p className="text-xs text-muted-foreground">
              NVLink 5.0 fabric
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(systemMetrics.coordinationSuccess)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg consensus: {formatPercentage(systemMetrics.averageConsensus)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Cpu className="h-5 w-5 mr-2" />
            System Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

      {/* Executive Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Shadow Board Executives ({Object.keys(executives).length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(executives).map(([id, executive]: [string, any]) => (
              <div key={id} className="p-3 border rounded-lg">
                <div className="font-medium">{executive.name}</div>
                <div className="text-sm text-gray-600">{executive.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Priority: {executive.priority}/10
                </div>
                <div className="text-xs text-gray-500">
                  Weight: {formatPercentage(executive.decisionWeight)}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {executive.expertise.slice(0, 2).map((skill: string) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Coordination Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Coordination Scenarios ({availableScenarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableScenarios.map((scenario, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium capitalize">
                    {scenario.type.replace('_', ' ')}
                  </div>
                  <Badge variant="outline">
                    {scenario.coordinationPattern}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {scenario.description}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>
                    <Clock className="h-3 w-3 inline mr-1" />
                    {scenario.estimatedDuration} min
                  </span>
                  <span>
                    <Users className="h-3 w-3 inline mr-1" />
                    {scenario.requiredExecutives.length} executives
                  </span>
                </div>
                <Button
                  onClick={() => executeCoordination(scenario)}
                  disabled={coordinationInProgress}
                  className="w-full"
                  size="sm"
                >
                  {coordinationInProgress && selectedScenario?.type === scenario.type
                    ? 'Coordinating...'
                    : 'Execute Coordination'
                  }
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {recentActivity.totalCoordinations}
              </div>
              <div className="text-sm text-gray-600">Total Coordinations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {recentActivity.activeCoordinations}
              </div>
              <div className="text-sm text-gray-600">Active Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {fabricMetrics.activeConnections}
              </div>
              <div className="text-sm text-gray-600">NVLink Connections</div>
            </div>
          </div>
          {recentActivity.lastCoordination && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Last Coordination:</div>
              <div className="font-medium">{recentActivity.lastCoordination}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}
        <span className="ml-2">• Auto-refreshing every 5 seconds</span>
      </div>
    </div>
  );
}
