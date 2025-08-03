'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { ExecutiveAvatar } from './ExecutiveAvatar';
import { SOVRENAIAvatar } from './SOVRENAIAvatar';

// Executive roles and their configurations
const EXECUTIVES = [
  { id: 'sovren-ai', name: 'SOVREN AI', color: '#ff0000', position: 0 }, // Central AI system
  { id: 'ceo', name: 'CEO', color: '#ef4444', position: 1 },
  { id: 'cfo', name: 'CFO', color: '#10b981', position: 2 },
  { id: 'cto', name: 'CTO', color: '#3b82f6', position: 3 },
  { id: 'cmo', name: 'CMO', color: '#f59e0b', position: 4 },
  { id: 'coo', name: 'COO', color: '#8b5cf6', position: 5 },
  { id: 'chro', name: 'CHRO', color: '#ec4899', position: 6 },
  { id: 'clo', name: 'CLO', color: '#06b6d4', position: 7 },
  { id: 'cso', name: 'CSO', color: '#84cc16', position: 8 }
];

const CIRCLE_RADIUS = 6;

export function ExecutiveCircle() {
  const groupRef = useRef<Group>(null);
  
  // Calculate positions for executives in a circle
  const executivePositions = useMemo(() => {
    // Filter out SOVREN AI since it's in the center
    const circleExecutives = EXECUTIVES.filter(exec => exec.id !== 'sovren-ai');
    return circleExecutives.map((exec, index) => {
      const angle = (index / circleExecutives.length) * Math.PI * 2;
      const x = Math.cos(angle) * CIRCLE_RADIUS;
      const z = Math.sin(angle) * CIRCLE_RADIUS;
      return {
        ...exec,
        position: [x, 0, z] as [number, number, number],
        rotation: [0, -angle + Math.PI, 0] as [number, number, number]
      };
    });
  }, []);

  // Gentle rotation animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central Platform */}
      <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[CIRCLE_RADIUS + 1, CIRCLE_RADIUS + 1, 0.2, 32]} />
        <meshStandardMaterial
          color="#1e293b"
          transparent
          opacity={0.6}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      
      {/* SOVREN AI Central Core */}
      <SOVRENAIAvatar
        position={[0, 1, 0]}
        rotation={[0, 0, 0]}
      />
      
      {/* Executive Avatars */}
      {executivePositions.map((executive) => (
        <ExecutiveAvatar
          key={executive.id}
          executive={executive}
          position={executive.position}
          rotation={executive.rotation}
        />
      ))}
      
      {/* Connection Lines to Center */}
      {executivePositions.map((executive, index) => (
        <group key={`connection-${executive.id}`}>
          <mesh
            position={[
              executive.position[0] / 2,
              0.1,
              executive.position[2] / 2
            ]}
            rotation={[0, Math.atan2(executive.position[2], executive.position[0]), 0]}
          >
            <cylinderGeometry args={[0.01, 0.01, CIRCLE_RADIUS, 8]} />
            <meshStandardMaterial
              color={executive.color}
              transparent
              opacity={0.3}
              emissive={executive.color}
              emissiveIntensity={0.1}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
