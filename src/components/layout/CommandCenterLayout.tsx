'use client';

import React, { Suspense } from 'react';
import { Header } from './Header';
import { CommandBridge } from '../3d/CommandBridge';
import { ControlPanels } from '../panels/ControlPanels';
import { LoadingScreen } from '../ui/LoadingScreen';

export function CommandCenterLayout() {
  return (
    <div className="relative h-full w-full bg-neural-900 overflow-hidden">
      {/* Header with system status and user profile */}
      <Header />
      
      {/* Main 3D Command Bridge Scene */}
      <div className="relative flex-1 h-full">
        <Suspense fallback={<LoadingScreen />}>
          <CommandBridge />
        </Suspense>
        
        {/* Overlay Control Panels */}
        <ControlPanels />
      </div>
      
      {/* Neural Activity Indicator */}
      <div className="absolute bottom-4 left-4 z-50">
        <div className="flex items-center space-x-2 bg-neural-800/80 backdrop-blur-sm rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-neural-400 rounded-full animate-pulse-glow" />
          <span className="text-neural-300 text-sm font-mono">
            NEURAL PATHWAYS ACTIVE
          </span>
        </div>
      </div>
      
      {/* System Status Indicator */}
      <div className="absolute bottom-4 right-4 z-50">
        <div className="flex items-center space-x-2 bg-neural-800/80 backdrop-blur-sm rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-neural-300 text-sm font-mono">
            SOVREN AI ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}
