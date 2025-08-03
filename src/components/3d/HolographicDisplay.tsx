'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Plane } from '@react-three/drei';
import { Group } from 'three';

export function HolographicDisplay() {
  const groupRef = useRef<Group>(null);

  // Gentle floating animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2 + 3;
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, 3, 0]}>
      {/* Main Holographic Panel */}
      <Plane args={[4, 2]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#0ea5e9"
          transparent
          opacity={0.1}
          emissive="#0ea5e9"
          emissiveIntensity={0.2}
        />
      </Plane>
      
      {/* Holographic Border */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[4.1, 2.1]} />
        <meshBasicMaterial
          color="#0ea5e9"
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
      
      {/* System Status Text */}
      <Text
        position={[0, 0.5, 0.02]}
        fontSize={0.15}
        color="#0ea5e9"
        anchorX="center"
        anchorY="middle"
        font="/fonts/orbitron-var.woff2"
      >
        SOVREN AI EXECUTIVE COMMAND CENTER
      </Text>
      
      <Text
        position={[0, 0.2, 0.02]}
        fontSize={0.08}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
        font="/fonts/jetbrains-mono-var.woff2"
      >
        Neural War Terminal v1.0 - Reality Transcending OS
      </Text>
      
      {/* Status Indicators */}
      <Text
        position={[-1.5, -0.2, 0.02]}
        fontSize={0.06}
        color="#10b981"
        anchorX="left"
        anchorY="middle"
        font="/fonts/jetbrains-mono-var.woff2"
      >
        ● EXECUTIVES: 8/8 ACTIVE
      </Text>
      
      <Text
        position={[-1.5, -0.4, 0.02]}
        fontSize={0.06}
        color="#f59e0b"
        anchorX="left"
        anchorY="middle"
        font="/fonts/jetbrains-mono-var.woff2"
      >
        ● NEURAL ACTIVITY: 87%
      </Text>
      
      <Text
        position={[-1.5, -0.6, 0.02]}
        fontSize={0.06}
        color="#3b82f6"
        anchorX="left"
        anchorY="middle"
        font="/fonts/jetbrains-mono-var.woff2"
      >
        ● QUANTUM CORES: ONLINE
      </Text>
      
      <Text
        position={[0.5, -0.2, 0.02]}
        fontSize={0.06}
        color="#ec4899"
        anchorX="left"
        anchorY="middle"
        font="/fonts/jetbrains-mono-var.woff2"
      >
        ● VOICE SYNTHESIS: READY
      </Text>
      
      <Text
        position={[0.5, -0.4, 0.02]}
        fontSize={0.06}
        color="#8b5cf6"
        anchorX="left"
        anchorY="middle"
        font="/fonts/jetbrains-mono-var.woff2"
      >
        ● CRM INTEGRATION: SYNCED
      </Text>
      
      <Text
        position={[0.5, -0.6, 0.02]}
        fontSize={0.06}
        color="#06b6d4"
        anchorX="left"
        anchorY="middle"
        font="/fonts/jetbrains-mono-var.woff2"
      >
        ● APPROVAL ENGINE: ACTIVE
      </Text>
      
      {/* Floating Data Streams */}
      <DataStream position={[-6, 2, 0]} />
      <DataStream position={[6, 1, 0]} />
      <DataStream position={[0, -2, 4]} />
    </group>
  );
}

function DataStream({ position }: { position: [number, number, number] }) {
  const streamRef = useRef<Group>(null);

  useFrame((state) => {
    if (streamRef.current) {
      streamRef.current.rotation.z = state.clock.elapsedTime * 0.3;
      streamRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });

  return (
    <group ref={streamRef} position={position}>
      {/* Data Stream Particles */}
      {[...Array(8)].map((_, i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 8) * Math.PI * 2) * 0.5,
            i * 0.2 - 0.8,
            Math.sin((i / 8) * Math.PI * 2) * 0.5
          ]}
        >
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial
            color="#0ea5e9"
            transparent
            opacity={0.8}
            emissive="#0ea5e9"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}
