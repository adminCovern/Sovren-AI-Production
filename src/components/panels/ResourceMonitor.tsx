'use client';

import React, { useState, useEffect } from 'react';

interface ResourceMetrics {
  cpu: number;
  memory: number;
  gpu: number;
  network: number;
  storage: number;
}

interface ExecutiveLoad {
  name: string;
  load: number;
  status: 'idle' | 'processing' | 'busy' | 'overloaded';
}

export function ResourceMonitor() {
  const [metrics, setMetrics] = useState<ResourceMetrics>({
    cpu: 23,
    memory: 45,
    gpu: 67,
    network: 12,
    storage: 34
  });

  const [executiveLoads, setExecutiveLoads] = useState<ExecutiveLoad[]>([
    { name: 'CEO', load: 45, status: 'processing' },
    { name: 'CFO', load: 23, status: 'idle' },
    { name: 'CTO', load: 78, status: 'busy' },
    { name: 'CMO', load: 56, status: 'processing' },
    { name: 'COO', load: 34, status: 'idle' },
    { name: 'CHRO', load: 67, status: 'processing' },
    { name: 'CLO', load: 12, status: 'idle' },
    { name: 'CSO', load: 89, status: 'busy' }
  ]);

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(80, prev.memory + (Math.random() - 0.5) * 8)),
        gpu: Math.max(30, Math.min(95, prev.gpu + (Math.random() - 0.5) * 12)),
        network: Math.max(5, Math.min(50, prev.network + (Math.random() - 0.5) * 15)),
        storage: Math.max(20, Math.min(70, prev.storage + (Math.random() - 0.5) * 5))
      }));

      setExecutiveLoads(prev => prev.map(exec => {
        const newLoad = Math.max(0, Math.min(100, exec.load + (Math.random() - 0.5) * 20));
        let status: ExecutiveLoad['status'] = 'idle';
        
        if (newLoad > 80) status = 'overloaded';
        else if (newLoad > 60) status = 'busy';
        else if (newLoad > 30) status = 'processing';
        else status = 'idle';

        return { ...exec, load: newLoad, status };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'text-green-400';
      case 'processing': return 'text-blue-400';
      case 'busy': return 'text-yellow-400';
      case 'overloaded': return 'text-red-400';
      default: return 'text-neural-400';
    }
  };

  const getLoadBarColor = (load: number) => {
    if (load > 80) return 'bg-red-400';
    if (load > 60) return 'bg-yellow-400';
    if (load > 30) return 'bg-blue-400';
    return 'bg-green-400';
  };

  return (
    <div className="space-y-4">
      {/* System Resources */}
      <div>
        <h4 className="text-sm font-medium text-neural-200 mb-3">System Resources</h4>
        <div className="space-y-2">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-neural-300 capitalize w-16">
                {key}:
              </span>
              <div className="flex-1 mx-2">
                <div className="w-full bg-neural-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getLoadBarColor(value)}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-neural-400 font-mono w-8 text-right">
                {value.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Executive Load Distribution */}
      <div>
        <h4 className="text-sm font-medium text-neural-200 mb-3">Executive Load</h4>
        <div className="space-y-2">
          {executiveLoads.map((exec) => (
            <div key={exec.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2 w-16">
                <span className="text-xs text-neural-300">
                  {exec.name}:
                </span>
              </div>
              <div className="flex-1 mx-2">
                <div className="w-full bg-neural-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getLoadBarColor(exec.load)}`}
                    style={{ width: `${exec.load}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-neural-400 font-mono w-8 text-right">
                  {exec.load.toFixed(0)}%
                </span>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(exec.status).replace('text-', 'bg-')}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neural-700/50">
        <div className="text-center">
          <div className="text-xs text-neural-400">Avg Load</div>
          <div className="text-sm font-mono text-neural-200">
            {(executiveLoads.reduce((sum, exec) => sum + exec.load, 0) / executiveLoads.length).toFixed(0)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-neural-400">Active</div>
          <div className="text-sm font-mono text-neural-200">
            {executiveLoads.filter(exec => exec.status !== 'idle').length}/8
          </div>
        </div>
      </div>
    </div>
  );
}
