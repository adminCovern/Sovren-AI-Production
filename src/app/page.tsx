'use client';

// Temporarily disable 3D components to fix build
// import { CommandCenterLayout } from '@/components/layout/CommandCenterLayout';

// Disable static generation for this page due to 3D components
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <main className="h-full w-full bg-neural-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-display text-neural-100 mb-4">SOVREN AI</h1>
        <p className="text-neural-300">Executive Command Center</p>
        <p className="text-neural-400 text-sm mt-2">3D Interface temporarily disabled for build</p>
      </div>
    </main>
  );
}
