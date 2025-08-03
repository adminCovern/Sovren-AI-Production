'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { ExecutiveCircle } from './ExecutiveCircle';
import { HolographicDisplay } from './HolographicDisplay';
import { NeuralSky } from './NeuralSky';
import { LoadingScreen } from '../ui/LoadingScreen';

export function CommandBridge() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        }}
        className="bg-transparent"
      >
        {/* Camera Setup */}
        <PerspectiveCamera
          makeDefault
          position={[0, 8, 12]}
          fov={60}
          near={0.1}
          far={1000}
        />
        
        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0, 0]}
        />
        
        {/* Lighting Setup */}
        <ambientLight intensity={0.2} color="#1e293b" />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.5}
          color="#64748b"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight
          position={[0, 5, 0]}
          intensity={0.3}
          color="#0ea5e9"
          distance={20}
        />
        
        {/* Environment */}
        <Environment preset="night" />
        
        {/* Neural Sky Background */}
        <Suspense fallback={null}>
          <NeuralSky />
        </Suspense>
        
        {/* Executive Circle - Main focal point */}
        <Suspense fallback={null}>
          <ExecutiveCircle />
        </Suspense>
        
        {/* Holographic Data Displays */}
        <Suspense fallback={null}>
          <HolographicDisplay />
        </Suspense>
        
        {/* Ground Plane */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -2, 0]}
          receiveShadow
        >
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial
            color="#0f172a"
            transparent
            opacity={0.3}
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      </Canvas>
    </div>
  );
}
