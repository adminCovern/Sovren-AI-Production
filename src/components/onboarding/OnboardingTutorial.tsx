/**
 * SOVREN AI ONBOARDING TUTORIAL SYSTEM
 * Interactive tutorial for new users
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  action?: 'click' | 'hover' | 'wait' | 'voice';
  duration?: number;
  voiceText?: string;
  nextTrigger?: 'auto' | 'manual' | 'action';
}

export interface OnboardingTutorialProps {
  isVisible: boolean;
  userTier: 'SMB' | 'ENTERPRISE';
  onComplete: () => void;
  onSkip: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isVisible,
  userTier,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);

  // Tutorial steps based on user tier
  const tutorialSteps: TutorialStep[] = userTier === 'SMB' ? [
    {
      id: 'welcome',
      title: 'Welcome to SOVREN AI',
      description: 'Your neural command center is now online. Let me introduce you to your Shadow Board executives.',
      voiceText: 'Welcome to SOVREN AI. Your neural command center is now online. I am SOVREN AI, your central orchestrator.',
      nextTrigger: 'auto',
      duration: 4000
    },
    {
      id: 'sovren-ai',
      title: 'Meet SOVREN AI',
      description: 'I am your central AI orchestrator. I coordinate all executive functions and provide strategic analysis.',
      target: '.sovren-ai-avatar',
      voiceText: 'I coordinate all executive functions and provide strategic analysis for your business.',
      nextTrigger: 'auto',
      duration: 3000
    },
    {
      id: 'shadow-board',
      title: 'Your Shadow Board',
      description: 'These are your 8 AI executives, each with specialized expertise and unique personalities.',
      target: '.executive-circle',
      voiceText: 'These are your 8 AI executives. Each has specialized expertise and a unique personality optimized for your industry.',
      nextTrigger: 'auto',
      duration: 4000
    },
    {
      id: 'cfo-intro',
      title: 'Meet Your CFO',
      description: 'Click on your CFO to see how executive interactions work.',
      target: '.executive-cfo',
      action: 'click',
      voiceText: 'Click on your CFO to see how executive interactions work.',
      nextTrigger: 'action'
    },
    {
      id: 'voice-synthesis',
      title: 'Voice Synthesis',
      description: 'Each executive has their own voice and communication style. Try speaking with your CFO.',
      voiceText: 'Each executive has their own voice and communication style, optimized for their role.',
      nextTrigger: 'auto',
      duration: 3000
    },
    {
      id: 'command-center',
      title: 'Command Center',
      description: 'Monitor system performance, executive activity, and business metrics in real-time.',
      target: '.metrics-panel',
      voiceText: 'Monitor system performance, executive activity, and business metrics in real-time.',
      nextTrigger: 'auto',
      duration: 3000
    },
    {
      id: 'crm-integration',
      title: 'CRM Integration',
      description: 'Connect your CRM system to give your executives access to customer data.',
      target: '.crm-integration-button',
      voiceText: 'Connect your CRM system to give your executives access to customer data and insights.',
      nextTrigger: 'manual'
    },
    {
      id: 'email-orchestration',
      title: 'Email Orchestration',
      description: 'Your executives can compose and send emails on your behalf with their unique styles.',
      voiceText: 'Your executives can compose and send emails on your behalf, each with their unique communication style.',
      nextTrigger: 'auto',
      duration: 3000
    },
    {
      id: 'complete',
      title: 'Tutorial Complete',
      description: 'You\'re ready to start using SOVREN AI. Your Shadow Board is standing by for your commands.',
      voiceText: 'Tutorial complete. You are ready to start using SOVREN AI. Your Shadow Board is standing by for your commands.',
      nextTrigger: 'manual'
    }
  ] : [
    // Enterprise tutorial steps (more advanced features)
    {
      id: 'welcome',
      title: 'Welcome to SOVREN AI Enterprise',
      description: 'Your enterprise neural command center is online with advanced capabilities.',
      voiceText: 'Welcome to SOVREN AI Enterprise. Your advanced neural command center is now online.',
      nextTrigger: 'auto',
      duration: 4000
    },
    {
      id: 'enterprise-features',
      title: 'Enterprise Features',
      description: 'Access advanced analytics, multi-team coordination, and enterprise integrations.',
      voiceText: 'You have access to advanced analytics, multi-team coordination, and enterprise integrations.',
      nextTrigger: 'auto',
      duration: 4000
    },
    // ... more enterprise-specific steps
  ];

  const currentStepData = tutorialSteps[currentStep];

  // Handle step progression
  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle voice synthesis
  const playVoice = async (text: string) => {
    if (!text) return;
    
    setIsPlaying(true);
    
    try {
      // Call TTS API for SOVREN AI voice
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: 'sovren-ai-neural',
          priority: 'high',
          format: 'wav'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.audioData) {
          // Play audio
          const audioBlob = new Blob([
            Uint8Array.from(atob(result.audioData), c => c.charCodeAt(0))
          ], { type: 'audio/wav' });
          
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          audio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
          };
          
          await audio.play();
        }
      }
    } catch (error) {
      console.error('Voice synthesis failed:', error);
      setIsPlaying(false);
    }
  };

  // Handle element highlighting
  useEffect(() => {
    if (currentStepData?.target) {
      setHighlightedElement(currentStepData.target);
      
      // Add highlight class to target element
      const element = document.querySelector(currentStepData.target);
      if (element) {
        element.classList.add('tutorial-highlight');
      }
    } else {
      setHighlightedElement(null);
    }

    // Cleanup previous highlights
    return () => {
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
    };
  }, [currentStepData]);

  // Auto-progression for timed steps
  useEffect(() => {
    if (currentStepData?.nextTrigger === 'auto' && currentStepData.duration) {
      const timer = setTimeout(() => {
        nextStep();
      }, currentStepData.duration);

      return () => clearTimeout(timer);
    }
  }, [currentStep, currentStepData]);

  // Play voice when step changes
  useEffect(() => {
    if (isVisible && currentStepData?.voiceText) {
      const timer = setTimeout(() => {
        playVoice(currentStepData.voiceText!);
      }, 500); // Small delay for smooth transition

      return () => clearTimeout(timer);
    }
  }, [currentStep, isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
      
      {/* Tutorial Panel */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-8 left-8 right-8 md:left-auto md:right-8 md:w-96 bg-gray-900/95 backdrop-blur-md border border-green-500/30 rounded-lg p-6 z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-mono text-sm">TUTORIAL</span>
            </div>
            <div className="text-gray-400 text-sm">
              {currentStep + 1} / {tutorialSteps.length}
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <h3 className="text-white font-semibold text-lg mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Voice Indicator */}
          {isPlaying && (
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-400 text-sm">SOVREN AI speaking...</span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-1 mb-4">
            <div 
              className="bg-green-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={previousStep}
                disabled={currentStep === 0}
                className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              
              {currentStepData.nextTrigger === 'manual' && (
                <button
                  onClick={nextStep}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  {currentStep === tutorialSteps.length - 1 ? 'Complete' : 'Next'}
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => playVoice(currentStepData.voiceText || currentStepData.description)}
                disabled={isPlaying}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                🔊 Replay
              </button>
              
              <button
                onClick={onSkip}
                className="px-3 py-1 text-sm bg-gray-600 text-gray-300 rounded hover:bg-gray-700 transition-colors"
              >
                Skip Tutorial
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Highlight Styles */}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 51;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          animation: tutorial-pulse 2s infinite;
        }
        
        @keyframes tutorial-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.3), 0 0 30px rgba(34, 197, 94, 0.5); }
        }
      `}</style>
    </>
  );
};
