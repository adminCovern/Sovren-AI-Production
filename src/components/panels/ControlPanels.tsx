'use client';

import React, { useState } from 'react';
import { ApprovalQueue } from './ApprovalQueue';
import { ActiveCallsPanel } from './ActiveCallsPanel';
import { ResourceMonitor } from './ResourceMonitor';
import { VoiceControlPanel } from './VoiceControlPanel';

export function ControlPanels() {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const panels = [
    { id: 'voice', name: 'Voice Control', icon: '🎤', component: VoiceControlPanel },
    { id: 'calls', name: 'Active Calls', icon: '📞', component: ActiveCallsPanel },
    { id: 'approvals', name: 'Approvals', icon: '⚡', component: ApprovalQueue },
    { id: 'resources', name: 'Resources', icon: '📊', component: ResourceMonitor }
  ];

  return (
    <>
      {/* Panel Toggle Buttons */}
      <div className="absolute top-20 right-4 z-30 flex flex-col space-y-2">
        {panels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => setActivePanel(activePanel === panel.id ? null : panel.id)}
            className={`w-12 h-12 rounded-lg backdrop-blur-sm border transition-all duration-200 ${
              activePanel === panel.id
                ? 'bg-neural-600/80 border-neural-400 text-neural-100'
                : 'bg-neural-800/60 border-neural-700/50 text-neural-400 hover:bg-neural-700/60 hover:text-neural-300'
            }`}
            title={panel.name}
          >
            <span className="text-lg">{panel.icon}</span>
          </button>
        ))}
      </div>

      {/* Active Panel */}
      {activePanel && (
        <div className="absolute top-20 right-20 z-20 w-80 max-h-96 bg-neural-800/90 backdrop-blur-sm rounded-lg border border-neural-700/50 shadow-xl">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-neural-100">
                {panels.find(p => p.id === activePanel)?.name}
              </h3>
              <button
                onClick={() => setActivePanel(null)}
                className="text-neural-400 hover:text-neural-200 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {(() => {
                const Panel = panels.find(p => p.id === activePanel)?.component;
                return Panel ? <Panel /> : null;
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
