'use client';

import React from 'react';

export function LoadingScreen() {
  return (
    <div className="absolute inset-0 bg-neural-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* SOVREN Logo Animation */}
        <div className="mb-8">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-neural-400 to-neural-600 rounded-xl animate-pulse-glow" />
            <div className="absolute inset-2 bg-neural-900 rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 relative">
                {/* Animated neural network */}
                <div className="absolute top-0 left-2 w-2 h-2 bg-neural-400 rounded-full animate-pulse" />
                <div className="absolute top-0 right-2 w-2 h-2 bg-neural-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="absolute bottom-0 left-2 w-2 h-2 bg-neural-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                <div className="absolute bottom-0 right-2 w-2 h-2 bg-neural-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-neural-300 rounded-full animate-pulse-glow" />
                
                {/* Connecting lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
                  <path
                    d="M8 8 L24 24 L40 8 M8 40 L24 24 L40 40"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                    className="text-neural-500 animate-pulse"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Loading Text */}
        <div className="space-y-4">
          <h2 className="text-2xl font-display text-neural-100 tracking-wider animate-pulse-glow">
            SOVREN AI
          </h2>
          <p className="text-neural-300 font-mono text-sm">
            Initializing Executive Command Center...
          </p>
          
          {/* Loading Progress */}
          <div className="w-64 mx-auto">
            <div className="flex justify-between text-xs text-neural-400 mb-2">
              <span>Neural Pathways</span>
              <span>Loading...</span>
            </div>
            <div className="w-full bg-neural-800 rounded-full h-1">
              <div className="bg-gradient-to-r from-neural-400 to-neural-600 h-1 rounded-full animate-pulse" style={{ width: '75%' }} />
            </div>
          </div>
          
          {/* Voice Wave Animation */}
          <div className="flex justify-center space-x-1 mt-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-neural-400 animate-voice-wave rounded-full"
                style={{
                  height: `${Math.random() * 20 + 10}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
