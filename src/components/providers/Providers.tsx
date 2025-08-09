'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useVoiceSystem, VoiceSystemHook } from '@/hooks/useVoiceSystem';
import {
  initializeClientApplication,
  getClientApplicationState,
  checkClientApplicationHealth,
  ClientApplicationState
} from '@/lib/bootstrap/ClientBootstrap';

interface ProvidersProps {
  children: React.ReactNode;
}

interface ApplicationContextType extends ClientApplicationState {
  // Client-side application context
}

// Application Context
const ApplicationContext = createContext<ApplicationContextType | null>(null);

export function useApplicationContext(): ApplicationContextType {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplicationContext must be used within ApplicationProvider');
  }
  return context;
}

// Voice System Context
const VoiceSystemContext = createContext<VoiceSystemHook | null>(null);

export function useVoiceSystemContext(): VoiceSystemHook {
  const context = useContext(VoiceSystemContext);
  if (!context) {
    throw new Error('useVoiceSystemContext must be used within VoiceSystemProvider');
  }
  return context;
}

function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ClientApplicationState>({
    isInitialized: false,
    isLoading: true,
    error: null,
    healthStatus: 'unknown'
  });

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing client application...');

        // Initialize the client application (no server dependencies)
        const success = await initializeClientApplication();

        if (mounted) {
          if (success) {
            const clientState = getClientApplicationState();
            setState(clientState);
            console.log('✅ Client application initialized successfully');
          } else {
            setState(prev => ({
              ...prev,
              error: 'Failed to initialize client application',
              healthStatus: 'unhealthy',
              isLoading: false
            }));
          }
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
          console.error('❌ Client initialization failed:', errorMessage);
          setState(prev => ({
            ...prev,
            error: errorMessage,
            healthStatus: 'unhealthy',
            isLoading: false
          }));
        }
      }
    };

    initializeApp();

    // Health check interval
    const healthCheckInterval = setInterval(async () => {
      if (mounted && state.isInitialized) {
        try {
          const health = await checkClientApplicationHealth();
          setState(prev => ({ ...prev, healthStatus: health }));
        } catch (err) {
          setState(prev => ({ ...prev, healthStatus: 'unhealthy' }));
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      mounted = false;
      clearInterval(healthCheckInterval);
    };
  }, []);

  const contextValue: ApplicationContextType = state;

  return (
    <ApplicationContext.Provider value={contextValue}>
      {children}
    </ApplicationContext.Provider>
  );
}

function VoiceSystemProvider({ children }: { children: React.ReactNode }) {
  const { isInitialized } = useApplicationContext();

  const voiceSystem = useVoiceSystem({
    autoInitialize: isInitialized,
    config: {
      synthesis: {
        enabled: true,
        modelsPath: '/voice-models',
        cacheSize: 50
      }
    }
  });

  return (
    <VoiceSystemContext.Provider value={voiceSystem}>
      {children}
    </VoiceSystemContext.Provider>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ApplicationProvider>
      <VoiceSystemProvider>
        {children}
      </VoiceSystemProvider>
    </ApplicationProvider>
  );
}
