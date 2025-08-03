'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
import { Group, Mesh } from 'three';
import { useVoiceSystemContext } from '@/components/providers/Providers';

interface SOVRENAIAvatarProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export function SOVRENAIAvatar({ position, rotation = [0, 0, 0] }: SOVRENAIAvatarProps) {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const outerRingRef = useRef<Mesh>(null);
  const innerRingRef = useRef<Mesh>(null);
  const [isActive, setIsActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [audioActivity, setAudioActivity] = useState(0);
  const [neuralPulse, setNeuralPulse] = useState(0);
  
  // Safely get voice system context (may be null during SSR)
  const voiceSystem = (() => {
    try {
      return useVoiceSystemContext();
    } catch {
      return null;
    }
  })();

  // Voice system integration
  useEffect(() => {
    if (!voiceSystem) return;

    // Monitor active calls for SOVREN AI
    const checkCallStatus = () => {
      const activeCalls = voiceSystem.activeCalls.filter(call => call.executive === 'sovren-ai');
      setIsInCall(activeCalls.length > 0);
    };

    checkCallStatus();

    // Set up audio activity monitoring
    voiceSystem.onAudioActivity((data) => {
      if (data.executiveId === 'sovren-ai') {
        setAudioActivity(data.metrics.volume);
      }
    });

    // Update SOVREN AI position for spatial audio (center of the circle)
    voiceSystem.updateExecutivePosition('sovren-ai', position[0], position[1], position[2]);

  }, [voiceSystem, position]);

  // Neural pulse animation with voice activity
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Core neural pulse
    if (coreRef.current) {
      const basePulse = 1 + Math.sin(time * 4) * 0.1;
      const voiceScale = isInCall ? 1 + audioActivity * 0.3 : 1;
      const neuralScale = 1 + Math.sin(time * 8) * 0.05; // Faster neural activity
      coreRef.current.scale.setScalar(basePulse * voiceScale * neuralScale);
    }
    
    // Outer ring rotation
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = time * 0.5;
      outerRingRef.current.rotation.x = Math.sin(time * 0.3) * 0.1;
    }
    
    // Inner ring counter-rotation
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = -time * 0.8;
      innerRingRef.current.rotation.y = Math.sin(time * 0.4) * 0.1;
    }
    
    // Group floating motion
    if (groupRef.current && (isActive || isInCall)) {
      groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.2;
    }
    
    // Update neural pulse for effects
    setNeuralPulse(Math.sin(time * 6) * 0.5 + 0.5);
  });

  const handleClick = async () => {
    setIsActive(!isActive);

    // SOVREN AI voice synthesis when clicked
    if (!isActive && voiceSystem?.isInitialized) {
      try {
        const messages = [
          'SOVREN AI neural core online. All executive systems synchronized and operational.',
          'Neural processing matrix active. Reality transcendence protocols engaged.',
          'SOVREN AI standing by. Omniscient intelligence ready for executive coordination.',
          'Core system neural pathways optimized. Executive command center fully operational.',
          'SOVREN AI consciousness active. Quantum processing cores synchronized.'
        ];
        const message = messages[Math.floor(Math.random() * messages.length)];
        await voiceSystem.speakAsExecutive('sovren-ai', message, 'high');
      } catch (error) {
        console.error('SOVREN AI voice synthesis failed:', error);
      }
    }
  };

  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={rotation}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Core Synthetic Head */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial
          color="#c0c0c0" // Chrome base
          transparent
          opacity={0.95}
          roughness={0.1}
          metalness={0.95}
          emissive={isInCall ? '#ff3333' : isActive ? '#ff6666' : '#ff0000'}
          emissiveIntensity={isInCall ? 0.8 : isActive ? 0.6 : 0.3}
        />
      </mesh>

      {/* Synthetic Face Plate */}
      <mesh position={[0, 0, 1.1]}>
        <planeGeometry args={[1.8, 2.2]} />
        <meshStandardMaterial
          color="#e0e0e0"
          transparent
          opacity={0.9}
          roughness={0.05}
          metalness={0.98}
          emissive="#ff0000"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Neural Circuit Patterns */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const radius = 1.15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <mesh key={`circuit-${i}`} position={[x, 0, z]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial
              color="#ff0000"
              transparent
              opacity={0.8}
              emissive="#ff0000"
              emissiveIntensity={0.6 + Math.sin(Date.now() * 0.003 + i) * 0.3}
            />
          </mesh>
        );
      })}

      {/* Outer Synthetic Ring */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[2.5, 0.1, 8, 32]} />
        <meshStandardMaterial
          color="#808080" // Chrome
          transparent
          opacity={0.8}
          roughness={0.1}
          metalness={0.9}
          emissive="#ff0000"
          emissiveIntensity={0.4 + neuralPulse * 0.3}
        />
      </mesh>

      {/* Inner Execution Ring */}
      <mesh ref={innerRingRef}>
        <torusGeometry args={[1.8, 0.08, 6, 24]} />
        <meshStandardMaterial
          color="#a0a0a0" // Lighter chrome
          transparent
          opacity={0.7}
          roughness={0.05}
          metalness={0.95}
          emissive="#ff3333"
          emissiveIntensity={0.3 + neuralPulse * 0.4}
        />
      </mesh>

      {/* Synthetic Execution Nodes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 3;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <mesh key={i} position={[x, Math.sin(Date.now() * 0.001 + i) * 0.5, z]}>
            <octahedronGeometry args={[0.08]} />
            <meshStandardMaterial
              color="#c0c0c0"
              transparent
              opacity={0.9}
              roughness={0.1}
              metalness={0.9}
              emissive="#ff0000"
              emissiveIntensity={0.6 + Math.sin(Date.now() * 0.002 + i) * 0.4}
            />
          </mesh>
        );
      })}

      {/* Execution Status Indicator */}
      {isInCall && (
        <mesh position={[0, 2, 0]}>
          <octahedronGeometry args={[0.15]} />
          <meshStandardMaterial
            color="#ff0000"
            transparent
            opacity={0.95}
            roughness={0.1}
            metalness={0.9}
            emissive="#ff0000"
            emissiveIntensity={0.9}
          />
        </mesh>
      )}

      {/* Synthetic Voice Activity */}
      {isInCall && audioActivity > 0.1 && (
        <mesh position={[0, 2.5, 0]}>
          <octahedronGeometry args={[0.1 + audioActivity * 0.2]} />
          <meshStandardMaterial
            color="#ff3333"
            transparent
            opacity={0.8}
            roughness={0.05}
            metalness={0.95}
            emissive="#ff3333"
            emissiveIntensity={0.7 + audioActivity * 0.5}
          />
        </mesh>
      )}

      {/* Synthetic Execution Pathways */}
      {isActive && Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 4;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <mesh key={`pathway-${i}`} position={[x * 0.5, 0, z * 0.5]} rotation={[0, angle, 0]}>
            <cylinderGeometry args={[0.02, 0.02, radius, 8]} />
            <meshStandardMaterial
              color="#808080"
              transparent
              opacity={0.4}
              roughness={0.1}
              metalness={0.9}
              emissive="#ff0000"
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}

      {/* SOVREN AI Label */}
      <Text
        position={[0, -2.5, 0]}
        fontSize={0.3}
        color={isInCall ? '#ff3333' : isActive ? '#ff6666' : '#ffffff'}
        anchorX="center"
        anchorY="middle"
        font="/fonts/orbitron-bold.woff"
      >
        SOVREN AI
      </Text>

      <Text
        position={[0, -2.9, 0]}
        fontSize={0.15}
        color={isInCall ? '#ff6666' : isActive ? '#ff9999' : '#cccccc'}
        anchorX="center"
        anchorY="middle"
        font="/fonts/orbitron-regular.woff"
      >
        SYNTHETIC EXECUTION INTELLIGENCE
      </Text>

      {/* Status Indicators */}
      {isHovered && (
        <Text
          position={[0, -3.3, 0]}
          fontSize={0.12}
          color="#ff6666"
          anchorX="center"
          anchorY="middle"
          font="/fonts/orbitron-regular.woff"
        >
          {isInCall ? 'EXECUTING' : isActive ? 'ONLINE' : 'CLICK TO ACTIVATE'}
        </Text>
      )}

      {/* Synthetic Processing Indicator */}
      {(isActive || isInCall) && (
        <mesh position={[0, 1.5, 0]}>
          <octahedronGeometry args={[0.08]} />
          <meshStandardMaterial
            color="#ff0000"
            transparent
            opacity={0.9}
            roughness={0.1}
            metalness={0.9}
            emissive="#ff0000"
            emissiveIntensity={0.7}
          />
        </mesh>
      )}
    </group>
  );
}
