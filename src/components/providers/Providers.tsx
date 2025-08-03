'use client';

import React, { createContext, useContext } from 'react';
import { useVoiceSystem, VoiceSystemHook } from '@/hooks/useVoiceSystem';

interface ProvidersProps {
  children: React.ReactNode;
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

function VoiceSystemProvider({ children }: { children: React.ReactNode }) {
  const voiceSystem = useVoiceSystem({
    autoInitialize: true,
    config: {
      // Override default config if needed
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
    <VoiceSystemProvider>
      {children}
    </VoiceSystemProvider>
  );
}
