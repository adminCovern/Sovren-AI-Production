'use client';

import React from 'react';
import { SOVRENLogo } from '../ui/SOVRENLogo';
import { UserProfile } from '../ui/UserProfile';
import { SystemStatus } from '../ui/SystemStatus';

export function Header() {
  return (
    <header className="relative z-40 flex items-center justify-between px-6 py-4 bg-neural-900/95 backdrop-blur-sm border-b border-neural-700/50">
      {/* Left: SOVREN Logo */}
      <div className="flex items-center space-x-4">
        <SOVRENLogo />
        <div className="hidden md:block">
          <h1 className="text-xl font-display text-neural-100 tracking-wider">
            EXECUTIVE COMMAND CENTER
          </h1>
          <p className="text-xs text-neural-400 font-mono">
            Neural War Terminal v1.0
          </p>
        </div>
      </div>
      
      {/* Center: System Status */}
      <div className="flex-1 flex justify-center">
        <SystemStatus />
      </div>
      
      {/* Right: User Profile */}
      <div className="flex items-center space-x-4">
        <UserProfile />
      </div>
    </header>
  );
}
