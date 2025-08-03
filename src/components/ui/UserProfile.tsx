'use client';

import React, { useState } from 'react';

export function UserProfile() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative">
      {/* User Avatar */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center space-x-3 bg-neural-800/50 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-neural-700/50 transition-colors"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-neural-400 to-neural-600 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-neural-900">U</span>
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-neural-100">User</div>
          <div className="text-xs text-neural-400">Executive</div>
        </div>
        <svg
          className={`w-4 h-4 text-neural-400 transition-transform ${
            isMenuOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-neural-800 backdrop-blur-sm rounded-lg shadow-xl border border-neural-700/50 z-50">
          <div className="py-2">
            <div className="px-4 py-2 border-b border-neural-700/50">
              <div className="text-sm font-medium text-neural-100">User Profile</div>
              <div className="text-xs text-neural-400">Executive Access Level</div>
            </div>
            
            <button className="w-full text-left px-4 py-2 text-sm text-neural-300 hover:bg-neural-700/50 transition-colors">
              Settings
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-neural-300 hover:bg-neural-700/50 transition-colors">
              Neural Preferences
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-neural-300 hover:bg-neural-700/50 transition-colors">
              Executive Dashboard
            </button>
            
            <div className="border-t border-neural-700/50 mt-2 pt-2">
              <button className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-neural-700/50 transition-colors">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
