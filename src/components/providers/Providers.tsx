'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useVoiceSystem, VoiceSystemHook } from '@/hooks/useVoiceSystem';
import { SOVRENAICore } from '@/lib/sovren/SOVRENAICore';
import { initializeApplication, getSOVRENCore, checkApplicationHealth } from '@/lib/bootstrap/ApplicationBootstrap';

interface ProvidersProps {
  children: React.ReactNode;
}

interface ApplicationContextType {
  sovrenCore: SOVRENAICore | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
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
  const [sovrenCore, setSovrenCore] = useState<SOVRENAICore | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize the application with dependency injection
        const core = await initializeApplication();

        if (mounted) {
          setSovrenCore(core);
          setIsInitialized(true);
          setHealthStatus('healthy');
        }
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
          setError(errorMessage);
          setHealthStatus('unhealthy');
          console.error('Application initialization failed:', err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeApp();

    // Health check interval
    const healthCheckInterval = setInterval(async () => {
      if (mounted && isInitialized) {
        try {
          const health = await checkApplicationHealth();
          setHealthStatus(health.status);
        } catch (err) {
          setHealthStatus('unhealthy');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      mounted = false;
      clearInterval(healthCheckInterval);
    };
  }, []);

  const contextValue: ApplicationContextType = {
    sovrenCore,
    isInitialized,
    isLoading,
    error,
    healthStatus
  };

  return (
    <ApplicationContext.Provider value={contextValue}>
      {children}
    </ApplicationContext.Provider>
  );
}

function VoiceSystemProvider({ children }: { children: React.ReactNode }) {
  const { sovrenCore, isInitialized } = useApplicationContext();

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
