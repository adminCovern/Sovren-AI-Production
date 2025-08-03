'use client';

import React, { useState, useEffect } from 'react';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeExecutives: number;
  activeCalls: number;
  neuralActivity: number;
}

export function SystemStatus() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpuUsage: 23,
    memoryUsage: 45,
    activeExecutives: 8,
    activeCalls: 0,
    neuralActivity: 87
  });

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpuUsage: Math.max(10, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(20, Math.min(80, prev.memoryUsage + (Math.random() - 0.5) * 8)),
        activeExecutives: 8, // Always 8 executives
        activeCalls: Math.max(0, Math.min(5, prev.activeCalls + Math.floor((Math.random() - 0.7) * 2))),
        neuralActivity: Math.max(60, Math.min(100, prev.neuralActivity + (Math.random() - 0.5) * 15))
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center space-x-6 bg-neural-800/50 backdrop-blur-sm rounded-lg px-4 py-2">
      {/* CPU Usage */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        <span className="text-xs text-neural-300 font-mono">
          CPU: {metrics.cpuUsage.toFixed(0)}%
        </span>
      </div>
      
      {/* Memory Usage */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-xs text-neural-300 font-mono">
          MEM: {metrics.memoryUsage.toFixed(0)}%
        </span>
      </div>
      
      {/* Active Executives */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-xs text-neural-300 font-mono">
          EXEC: {metrics.activeExecutives}/8
        </span>
      </div>
      
      {/* Active Calls */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full animate-pulse ${
          metrics.activeCalls > 0 ? 'bg-orange-400' : 'bg-neural-600'
        }`} />
        <span className="text-xs text-neural-300 font-mono">
          CALLS: {metrics.activeCalls}
        </span>
      </div>
      
      {/* Neural Activity */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-neural-400 rounded-full animate-pulse-glow" />
        <span className="text-xs text-neural-300 font-mono">
          NEURAL: {metrics.neuralActivity.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
