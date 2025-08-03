'use client';

import React from 'react';

export function SOVRENLogo() {
  return (
    <div className="flex items-center space-x-2">
      {/* Neural Network Icon */}
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 bg-gradient-to-br from-neural-400 to-neural-600 rounded-lg animate-pulse-glow" />
        <div className="absolute inset-1 bg-neural-900 rounded-md" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 relative">
            {/* Neural nodes */}
            <div className="absolute top-0 left-1 w-1 h-1 bg-neural-400 rounded-full animate-pulse" />
            <div className="absolute top-0 right-1 w-1 h-1 bg-neural-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="absolute bottom-0 left-1 w-1 h-1 bg-neural-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            <div className="absolute bottom-0 right-1 w-1 h-1 bg-neural-400 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-neural-300 rounded-full animate-pulse-glow" />
            
            {/* Neural connections */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 24 24">
              <path
                d="M4 4 L12 12 L20 4 M4 20 L12 12 L20 20"
                stroke="currentColor"
                strokeWidth="0.5"
                fill="none"
                className="text-neural-500 animate-pulse"
              />
            </svg>
          </div>
        </div>
      </div>
      
      {/* SOVREN Text */}
      <div className="flex flex-col">
        <span className="text-lg font-display font-bold text-neural-100 tracking-wider">
          SOVREN
        </span>
        <span className="text-xs text-neural-400 font-mono -mt-1">
          AI
        </span>
      </div>
    </div>
  );
}
