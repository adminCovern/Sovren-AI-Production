'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
import { Group, Mesh } from 'three';
import { useVoiceSystemContext } from '@/components/providers/Providers';

interface Executive {
  id: string;
  name: string;
  color: string;
  position: number | [number, number, number];
}

interface ExecutiveAvatarProps {
  executive: Executive;
  position: [number, number, number];
  rotation: [number, number, number];
}

export function ExecutiveAvatar({ executive, position, rotation }: ExecutiveAvatarProps) {
  const groupRef = useRef<Group>(null);
  const avatarRef = useRef<Mesh>(null);
  const [isActive, setIsActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [audioActivity, setAudioActivity] = useState(0);

  const voiceSystem = useVoiceSystemContext();

  // Voice system integration
  useEffect(() => {
    // Monitor active calls for this executive
    const checkCallStatus = () => {
      const activeCalls = voiceSystem.activeCalls.filter(call => call.executive === executive.id);
      setIsInCall(activeCalls.length > 0);
    };

    checkCallStatus();

    // Set up audio activity monitoring
    voiceSystem.onAudioActivity((data) => {
      if (data.executiveId === executive.id) {
        setAudioActivity(data.metrics.volume);
      }
    });

    // Update executive position for spatial audio
    voiceSystem.updateExecutivePosition(executive.id, position[0], position[1], position[2]);

  }, [voiceSystem, executive.id, position]);

  // Breathing animation with voice activity
  useFrame((state) => {
    if (avatarRef.current) {
      // Use a hash of the executive ID for animation offset
      const animationOffset = executive.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 0.1;
      const baseBreath = 1 + Math.sin(state.clock.elapsedTime * 2 + animationOffset) * 0.05;
      const voiceScale = isInCall ? 1 + audioActivity * 0.1 : 1;
      avatarRef.current.scale.setScalar(baseBreath * voiceScale);
    }

    if (groupRef.current && (isActive || isInCall)) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onClick={async () => {
        setIsActive(!isActive);

        // Demo voice synthesis when clicked
        if (!isActive && voiceSystem.isInitialized) {
          try {
            let messages;
            if (executive.id === 'sovren-ai') {
              messages = [
                `SOVREN AI neural core online. All executive systems synchronized and operational.`,
                `Neural processing matrix active. Reality transcendence protocols engaged.`,
                `SOVREN AI standing by. Omniscient intelligence ready for executive coordination.`
              ];
            } else {
              messages = [
                `${executive.name} reporting for duty. Neural pathways active.`,
                `Executive ${executive.name} online. Ready to process requests.`,
                `${executive.name} standing by. All systems operational.`
              ];
            }
            const message = messages[Math.floor(Math.random() * messages.length)];
            await voiceSystem.speakAsExecutive(executive.id, message, 'normal');
          } catch (error) {
            console.error('Voice synthesis failed:', error);
          }
        }
      }}
    >
      {/* Avatar Base Platform */}
      <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.8, 0.1, 16]} />
        <meshStandardMaterial
          color={isHovered ? executive.color : '#334155'}
          transparent
          opacity={0.8}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      
      {/* Main Avatar Body */}
      <mesh
        ref={avatarRef}
        position={[0, 0.5, 0]}
        castShadow
        receiveShadow
      >
        <capsuleGeometry args={[0.3, 1.2, 4, 8]} />
        <meshStandardMaterial
          color={isInCall ? '#ff6b6b' : isActive ? executive.color : '#475569'}
          transparent
          opacity={0.9}
          roughness={0.4}
          metalness={0.6}
          emissive={isInCall ? '#ff6b6b' : isActive ? executive.color : '#000000'}
          emissiveIntensity={isInCall ? 0.4 : isActive ? 0.2 : 0}
        />
      </mesh>
      
      {/* Avatar Head */}
      <Sphere
        args={[0.25, 16, 16]}
        position={[0, 1.4, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={isActive ? executive.color : '#64748b'}
          transparent
          opacity={0.9}
          roughness={0.3}
          metalness={0.7}
          emissive={isActive ? executive.color : '#000000'}
          emissiveIntensity={isActive ? 0.1 : 0}
        />
      </Sphere>
      
      {/* Activity Indicator */}
      {(isActive || isInCall) && (
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color={isInCall ? '#ff6b6b' : executive.color}
            transparent
            opacity={0.8}
            emissive={isInCall ? '#ff6b6b' : executive.color}
            emissiveIntensity={isInCall ? 0.8 : 0.5}
          />
        </mesh>
      )}

      {/* Call Status Indicator */}
      {isInCall && (
        <mesh position={[0, 2.3, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial
            color="#00ff00"
            transparent
            opacity={0.9}
            emissive="#00ff00"
            emissiveIntensity={0.6}
          />
        </mesh>
      )}
      
      {/* Executive Name Label */}
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.2}
        color={isHovered || isActive ? executive.color : '#94a3b8'}
        anchorX="center"
        anchorY="middle"
        font="/fonts/orbitron-var.woff2"
      >
        {executive.name}
      </Text>
      
      {/* Status Ring */}
      <mesh
        position={[0, 0.5, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.6, 0.02, 8, 32]} />
        <meshStandardMaterial
          color={executive.color}
          transparent
          opacity={isActive ? 0.8 : 0.3}
          emissive={executive.color}
          emissiveIntensity={isActive ? 0.3 : 0.1}
        />
      </mesh>
      
      {/* Voice Wave Visualization */}
      {isActive && (
        <group position={[0, 0.5, 0]}>
          {[...Array(3)].map((_, i) => (
            <mesh
              key={i}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[1 + i * 0.3, 1 + i * 0.3, 1]}
            >
              <torusGeometry args={[0.8 + i * 0.2, 0.01, 8, 32]} />
              <meshStandardMaterial
                color={executive.color}
                transparent
                opacity={0.4 - i * 0.1}
                emissive={executive.color}
                emissiveIntensity={0.2}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
