'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceSystemManager, VoiceSystemConfig, VoiceSystemStatus } from '@/lib/voice/VoiceSystemManager';
import { CallSession } from '@/lib/voice/SIPClient';
import { ExecutiveProfile } from '@/lib/voice/ExecutiveVoiceRouter';

export interface UseVoiceSystemOptions {
  autoInitialize?: boolean;
  config?: Partial<VoiceSystemConfig>;
}

export interface VoiceSystemHook {
  // System state
  isInitialized: boolean;
  status: VoiceSystemStatus;
  error: string | null;
  
  // Call management
  activeCalls: CallSession[];
  makeCall: (targetUri: string, executiveId: string, message?: string) => Promise<string>;
  endCall: (sessionId: string) => Promise<void>;
  
  // Executive management
  executives: ExecutiveProfile[];
  availableExecutives: ExecutiveProfile[];
  setExecutiveAvailability: (executiveId: string, availability: ExecutiveProfile['availability']) => void;
  updateExecutivePosition: (executiveId: string, x: number, y: number, z: number) => void;
  
  // Voice synthesis
  speakAsExecutive: (executiveId: string, text: string, priority?: 'low' | 'normal' | 'high') => Promise<void>;
  
  // System control
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
  
  // Event handlers
  onCallStarted: (callback: (session: CallSession) => void) => void;
  onCallEnded: (callback: (session: CallSession) => void) => void;
  onExecutiveAssigned: (callback: (data: any) => void) => void;
  onAudioActivity: (callback: (data: any) => void) => void;
}

const defaultConfig: VoiceSystemConfig = {
  sip: {
    uri: 'sip:sovren@localhost',
    transportOptions: {
      server: 'wss://localhost:8089/ws',
      connectionTimeout: 30000,
      maxReconnectionAttempts: 5,
      reconnectionTimeout: 10000
    },
    authorizationUsername: 'sovren',
    authorizationPassword: 'neural-war-terminal',
    displayName: 'SOVREN AI Executive Command Center'
  },
  audio: {
    sampleRate: 48000,
    bufferSize: 4096,
    enableNoiseReduction: true,
    enableEchoCancellation: true,
    enableAutoGainControl: true,
    spatialAudioEnabled: true
  },
  synthesis: {
    enabled: true,
    modelsPath: '/voice-models',
    cacheSize: 100
  },
  recording: {
    enabled: true,
    format: 'wav',
    quality: 'high'
  },
  transcription: {
    enabled: true,
    language: 'en-US',
    realTime: true
  }
};

export function useVoiceSystem(options: UseVoiceSystemOptions = {}): VoiceSystemHook {
  const { autoInitialize = false, config: userConfig = {} } = options;
  
  // Merge user config with defaults
  const config = { ...defaultConfig, ...userConfig };
  
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState<VoiceSystemStatus>({
    isInitialized: false,
    sipStatus: 'disconnected',
    audioStatus: 'inactive',
    synthesisStatus: 'disabled',
    activeCalls: 0,
    availableExecutives: 8,
    systemLoad: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [activeCalls, setActiveCalls] = useState<CallSession[]>([]);
  const [executives, setExecutives] = useState<ExecutiveProfile[]>([]);
  const [availableExecutives, setAvailableExecutives] = useState<ExecutiveProfile[]>([]);
  
  // Voice system manager instance
  const voiceSystemRef = useRef<VoiceSystemManager | null>(null);
  const eventCallbacksRef = useRef<Map<string, Function[]>>(new Map());

  // Initialize voice system
  const initialize = useCallback(async () => {
    if (voiceSystemRef.current || isInitialized) {
      return;
    }

    try {
      setError(null);
      
      // Create voice system manager
      const voiceSystem = new VoiceSystemManager(config);
      voiceSystemRef.current = voiceSystem;

      // Set up event listeners
      voiceSystem.on('systemReady', (systemStatus: VoiceSystemStatus) => {
        setIsInitialized(true);
        setStatus(systemStatus);
        setExecutives(voiceSystem.getExecutiveProfiles());
        setAvailableExecutives(voiceSystem.getAvailableExecutives());
      });

      voiceSystem.on('statusChanged', (systemStatus: VoiceSystemStatus) => {
        setStatus(systemStatus);
        setActiveCalls(voiceSystem.getActiveCalls());
        setAvailableExecutives(voiceSystem.getAvailableExecutives());
      });

      voiceSystem.on('callStarted', (session: CallSession) => {
        setActiveCalls(voiceSystem.getActiveCalls());
        // Trigger user callbacks
        const callbacks = eventCallbacksRef.current.get('callStarted') || [];
        callbacks.forEach(callback => callback(session));
      });

      voiceSystem.on('callEnded', (session: CallSession) => {
        setActiveCalls(voiceSystem.getActiveCalls());
        // Trigger user callbacks
        const callbacks = eventCallbacksRef.current.get('callEnded') || [];
        callbacks.forEach(callback => callback(session));
      });

      voiceSystem.on('executiveAssigned', (data: any) => {
        setAvailableExecutives(voiceSystem.getAvailableExecutives());
        // Trigger user callbacks
        const callbacks = eventCallbacksRef.current.get('executiveAssigned') || [];
        callbacks.forEach(callback => callback(data));
      });

      voiceSystem.on('audioActivity', (data: any) => {
        // Trigger user callbacks
        const callbacks = eventCallbacksRef.current.get('audioActivity') || [];
        callbacks.forEach(callback => callback(data));
      });

      voiceSystem.on('error', (errorData: any) => {
        console.error('Voice System Error:', errorData);
        setError(`${errorData.component}: ${errorData.error.message || errorData.error}`);
      });

      // Initialize the system
      await voiceSystem.initialize();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to initialize voice system:', err);
    }
  }, [config, isInitialized]);

  // Shutdown voice system
  const shutdown = useCallback(async () => {
    if (!voiceSystemRef.current) {
      return;
    }

    try {
      await voiceSystemRef.current.shutdown();
      voiceSystemRef.current = null;
      setIsInitialized(false);
      setActiveCalls([]);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to shutdown voice system:', err);
    }
  }, []);

  // Make a call
  const makeCall = useCallback(async (targetUri: string, executiveId: string, message?: string): Promise<string> => {
    if (!voiceSystemRef.current) {
      throw new Error('Voice system not initialized');
    }
    return await voiceSystemRef.current.makeCall(targetUri, executiveId, message);
  }, []);

  // End a call
  const endCall = useCallback(async (sessionId: string): Promise<void> => {
    if (!voiceSystemRef.current) {
      throw new Error('Voice system not initialized');
    }
    await voiceSystemRef.current.endCall(sessionId);
  }, []);

  // Set executive availability
  const setExecutiveAvailability = useCallback((executiveId: string, availability: ExecutiveProfile['availability']) => {
    if (!voiceSystemRef.current) {
      return;
    }
    voiceSystemRef.current.setExecutiveAvailability(executiveId, availability);
  }, []);

  // Update executive position for spatial audio
  const updateExecutivePosition = useCallback((executiveId: string, x: number, y: number, z: number) => {
    if (!voiceSystemRef.current) {
      return;
    }
    voiceSystemRef.current.updateExecutivePosition(executiveId, x, y, z);
  }, []);

  // Speak as executive
  const speakAsExecutive = useCallback(async (executiveId: string, text: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<void> => {
    if (!voiceSystemRef.current) {
      throw new Error('Voice system not initialized');
    }
    await voiceSystemRef.current.speakAsExecutive(executiveId, text, priority);
  }, []);

  // Event handler registration
  const onCallStarted = useCallback((callback: (session: CallSession) => void) => {
    if (!eventCallbacksRef.current.has('callStarted')) {
      eventCallbacksRef.current.set('callStarted', []);
    }
    eventCallbacksRef.current.get('callStarted')!.push(callback);
  }, []);

  const onCallEnded = useCallback((callback: (session: CallSession) => void) => {
    if (!eventCallbacksRef.current.has('callEnded')) {
      eventCallbacksRef.current.set('callEnded', []);
    }
    eventCallbacksRef.current.get('callEnded')!.push(callback);
  }, []);

  const onExecutiveAssigned = useCallback((callback: (data: any) => void) => {
    if (!eventCallbacksRef.current.has('executiveAssigned')) {
      eventCallbacksRef.current.set('executiveAssigned', []);
    }
    eventCallbacksRef.current.get('executiveAssigned')!.push(callback);
  }, []);

  const onAudioActivity = useCallback((callback: (data: any) => void) => {
    if (!eventCallbacksRef.current.has('audioActivity')) {
      eventCallbacksRef.current.set('audioActivity', []);
    }
    eventCallbacksRef.current.get('audioActivity')!.push(callback);
  }, []);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoInitialize && !isInitialized && !voiceSystemRef.current) {
      initialize();
    }
  }, [autoInitialize, isInitialized, initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceSystemRef.current) {
        voiceSystemRef.current.shutdown().catch(console.error);
      }
    };
  }, []);

  return {
    // System state
    isInitialized,
    status,
    error,
    
    // Call management
    activeCalls,
    makeCall,
    endCall,
    
    // Executive management
    executives,
    availableExecutives,
    setExecutiveAvailability,
    updateExecutivePosition,
    
    // Voice synthesis
    speakAsExecutive,
    
    // System control
    initialize,
    shutdown,
    
    // Event handlers
    onCallStarted,
    onCallEnded,
    onExecutiveAssigned,
    onAudioActivity
  };
}
