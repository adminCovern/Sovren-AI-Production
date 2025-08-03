'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceSystemContext } from '@/components/providers/Providers';
import { CallSession } from '@/lib/voice/SIPClient';

interface ActiveCall {
  id: string;
  executive: string;
  contact: string;
  duration: number;
  status: 'active' | 'on-hold' | 'transferring';
  type: 'inbound' | 'outbound';
}

const mockCalls: ActiveCall[] = [
  {
    id: '1',
    executive: 'CEO',
    contact: 'John Smith - Acme Corp',
    duration: 0,
    status: 'active',
    type: 'inbound'
  }
];

export function ActiveCallsPanel() {
  const voiceSystem = useVoiceSystemContext();
  const [callDurations, setCallDurations] = useState<Map<string, number>>(new Map());

  // Update call durations every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDurations(prev => {
        const newDurations = new Map(prev);
        voiceSystem.activeCalls.forEach(call => {
          const currentDuration = Math.floor((Date.now() - call.startTime.getTime()) / 1000);
          newDurations.set(call.id, currentDuration);
        });
        return newDurations;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [voiceSystem.activeCalls]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/20';
      case 'on-hold': return 'text-yellow-400 bg-yellow-400/20';
      case 'transferring': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-neural-400 bg-neural-400/20';
    }
  };

  const handleEndCall = async (sessionId: string) => {
    try {
      await voiceSystem.endCall(sessionId);
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const handleHoldCall = (sessionId: string) => {
    // In a real implementation, this would pause/resume the call
    console.log('Hold/Resume call:', sessionId);
  };

  return (
    <div className="space-y-3">
      {voiceSystem.activeCalls.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-neural-400 text-sm">No active calls</div>
          <div className="text-xs text-neural-500 mt-1">All executives available</div>
        </div>
      ) : (
        voiceSystem.activeCalls.map((call) => (
          <div
            key={call.id}
            className="bg-neural-700/50 rounded-lg p-3 border border-neural-600/30"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-neural-100">
                    {call.executive.toUpperCase()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(call.state)}`}>
                    {call.state.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs text-neural-300 mb-2">
                  {call.remoteUri}
                </p>

                <div className="flex items-center space-x-2 text-xs">
                  <span className={`px-2 py-1 rounded ${
                    call.isInbound ? 'bg-blue-400/20 text-blue-400' : 'bg-purple-400/20 text-purple-400'
                  }`}>
                    {call.isInbound ? '📞 IN' : '📱 OUT'}
                  </span>
                  <span className="text-neural-400 font-mono">
                    {formatDuration(callDurations.get(call.id) || 0)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => handleHoldCall(call.id)}
                className="flex-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-xs py-2 px-3 rounded transition-colors"
              >
                ⏸ Hold
              </button>
              <button
                onClick={() => handleEndCall(call.id)}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs py-2 px-3 rounded transition-colors"
              >
                📞 End
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
