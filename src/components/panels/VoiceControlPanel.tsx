'use client';

import React, { useState } from 'react';
import { useVoiceSystemContext } from '@/components/providers/Providers';

export function VoiceControlPanel() {
  const voiceSystem = useVoiceSystemContext();
  const [selectedExecutive, setSelectedExecutive] = useState('ceo');
  const [callTarget, setCallTarget] = useState('');
  const [speechText, setSpeechText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMakeCall = async () => {
    if (!callTarget.trim()) return;
    
    setIsLoading(true);
    try {
      const sessionId = await voiceSystem.makeCall(callTarget, selectedExecutive);
      console.log('Call initiated:', sessionId);
    } catch (error) {
      console.error('Failed to make call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!speechText.trim()) return;
    
    setIsLoading(true);
    try {
      await voiceSystem.speakAsExecutive(selectedExecutive, speechText, 'normal');
      setSpeechText('');
    } catch (error) {
      console.error('Failed to synthesize speech:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoCall = async () => {
    setIsLoading(true);
    try {
      // Simulate a demo call
      const demoUri = 'sip:demo@sovren.ai';
      const sessionId = await voiceSystem.makeCall(demoUri, selectedExecutive, 
        `Hello, this is ${selectedExecutive.toUpperCase()} from SOVREN AI. This is a demonstration of our neural voice system.`
      );
      console.log('Demo call initiated:', sessionId);
    } catch (error) {
      console.error('Failed to make demo call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickMessages = [
    'Neural pathways are active and ready for processing.',
    'All systems operational. Standing by for executive commands.',
    'SOVREN AI Executive Command Center is fully online.',
    'Ready to transcend conventional business operations.',
    'Quantum processing cores are synchronized and optimal.'
  ];

  return (
    <div className="space-y-4">
      {/* System Status */}
      <div className="bg-neural-700/30 rounded-lg p-3 border border-neural-600/30">
        <h4 className="text-sm font-medium text-neural-200 mb-2">Voice System Status</h4>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-neural-400">Initialized:</span>
            <span className={voiceSystem.isInitialized ? 'text-green-400' : 'text-red-400'}>
              {voiceSystem.isInitialized ? '✓ Online' : '✗ Offline'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neural-400">SIP Status:</span>
            <span className={`${
              voiceSystem.status.sipStatus === 'connected' ? 'text-green-400' : 
              voiceSystem.status.sipStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {voiceSystem.status.sipStatus.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neural-400">Synthesis:</span>
            <span className={`${
              voiceSystem.status.synthesisStatus === 'ready' ? 'text-green-400' : 
              voiceSystem.status.synthesisStatus === 'loading' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {voiceSystem.status.synthesisStatus.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neural-400">Active Calls:</span>
            <span className="text-neural-200">{voiceSystem.status.activeCalls}</span>
          </div>
        </div>
      </div>

      {/* Executive Selection */}
      <div>
        <label className="block text-xs text-neural-400 mb-2">Select Executive</label>
        <select
          value={selectedExecutive}
          onChange={(e) => setSelectedExecutive(e.target.value)}
          className="w-full bg-neural-700/50 border border-neural-600/30 rounded px-3 py-2 text-sm text-neural-200 focus:outline-none focus:border-neural-400"
        >
          {voiceSystem.executives.map((exec) => (
            <option key={exec.id} value={exec.id}>
              {exec.role} - {exec.name}
            </option>
          ))}
        </select>
      </div>

      {/* Voice Synthesis */}
      <div>
        <label className="block text-xs text-neural-400 mb-2">Voice Synthesis</label>
        <div className="space-y-2">
          <textarea
            value={speechText}
            onChange={(e) => setSpeechText(e.target.value)}
            placeholder="Enter text for the executive to speak..."
            className="w-full bg-neural-700/50 border border-neural-600/30 rounded px-3 py-2 text-sm text-neural-200 placeholder-neural-500 focus:outline-none focus:border-neural-400 resize-none"
            rows={3}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleSpeak}
              disabled={!speechText.trim() || isLoading || !voiceSystem.isInitialized}
              className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 disabled:bg-neural-700/30 disabled:text-neural-500 text-blue-400 text-xs py-2 px-3 rounded transition-colors"
            >
              {isLoading ? '🔄 Speaking...' : '🎤 Speak'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Messages */}
      <div>
        <label className="block text-xs text-neural-400 mb-2">Quick Messages</label>
        <div className="space-y-1">
          {quickMessages.map((message, index) => (
            <button
              key={index}
              onClick={() => setSpeechText(message)}
              className="w-full text-left bg-neural-700/30 hover:bg-neural-600/30 text-xs text-neural-300 p-2 rounded transition-colors"
            >
              {message}
            </button>
          ))}
        </div>
      </div>

      {/* Call Controls */}
      <div>
        <label className="block text-xs text-neural-400 mb-2">Call Controls</label>
        <div className="space-y-2">
          <input
            type="text"
            value={callTarget}
            onChange={(e) => setCallTarget(e.target.value)}
            placeholder="sip:user@domain.com"
            className="w-full bg-neural-700/50 border border-neural-600/30 rounded px-3 py-2 text-sm text-neural-200 placeholder-neural-500 focus:outline-none focus:border-neural-400"
          />
          <div className="flex space-x-2">
            <button
              onClick={handleMakeCall}
              disabled={!callTarget.trim() || isLoading || !voiceSystem.isInitialized}
              className="flex-1 bg-green-600/20 hover:bg-green-600/30 disabled:bg-neural-700/30 disabled:text-neural-500 text-green-400 text-xs py-2 px-3 rounded transition-colors"
            >
              {isLoading ? '🔄 Calling...' : '📞 Call'}
            </button>
            <button
              onClick={handleDemoCall}
              disabled={isLoading || !voiceSystem.isInitialized}
              className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 disabled:bg-neural-700/30 disabled:text-neural-500 text-purple-400 text-xs py-2 px-3 rounded transition-colors"
            >
              {isLoading ? '🔄 Demo...' : '🎭 Demo'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {voiceSystem.error && (
        <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-3">
          <div className="text-xs text-red-400 font-medium mb-1">System Error</div>
          <div className="text-xs text-red-300">{voiceSystem.error}</div>
        </div>
      )}

      {/* Available Executives */}
      <div>
        <label className="block text-xs text-neural-400 mb-2">
          Available Executives ({voiceSystem.availableExecutives.length}/8)
        </label>
        <div className="grid grid-cols-2 gap-1">
          {voiceSystem.executives.map((exec) => {
            const isAvailable = voiceSystem.availableExecutives.some(ae => ae.id === exec.id);
            return (
              <div
                key={exec.id}
                className={`text-xs p-2 rounded ${
                  isAvailable 
                    ? 'bg-green-600/20 text-green-400' 
                    : 'bg-red-600/20 text-red-400'
                }`}
              >
                <div className="font-medium">{exec.role}</div>
                <div className="text-xs opacity-75">
                  {isAvailable ? 'Available' : 'Busy'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
