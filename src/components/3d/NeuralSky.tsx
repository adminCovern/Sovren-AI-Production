'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import * as THREE from 'three';

export function NeuralSky() {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Generate neural network points
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    const colors = new Float32Array(2000 * 3);
    
    for (let i = 0; i < 2000; i++) {
      // Create points in a sphere around the scene
      const radius = 30 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // Neural network colors - blues and cyans
      const colorIntensity = Math.random();
      colors[i * 3] = 0.1 + colorIntensity * 0.3; // R
      colors[i * 3 + 1] = 0.4 + colorIntensity * 0.4; // G
      colors[i * 3 + 2] = 0.8 + colorIntensity * 0.2; // B
    }
    
    return [positions, colors];
  }, []);

  // Create geometry with positions and colors
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    return geo;
  }, [positions, colors]);

  // Animate the neural network
  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <>
      {/* Neural Network Points */}
      <Points
        ref={pointsRef}
        geometry={geometry}
        frustumCulled={false}
      >
        <PointMaterial
          transparent
          vertexColors
          size={0.8}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
      
      {/* Connecting Neural Pathways */}
      <NeuralConnections />
    </>
  );
}

function NeuralConnections() {
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const geometry = useMemo(() => {
    const positions = [];
    const colors = [];
    
    // Create some connecting lines between random points
    for (let i = 0; i < 100; i++) {
      // Random start point
      const startRadius = 25 + Math.random() * 15;
      const startTheta = Math.random() * Math.PI * 2;
      const startPhi = Math.random() * Math.PI;
      
      const startX = startRadius * Math.sin(startPhi) * Math.cos(startTheta);
      const startY = startRadius * Math.cos(startPhi);
      const startZ = startRadius * Math.sin(startPhi) * Math.sin(startTheta);
      
      // Random end point
      const endRadius = 25 + Math.random() * 15;
      const endTheta = Math.random() * Math.PI * 2;
      const endPhi = Math.random() * Math.PI;
      
      const endX = endRadius * Math.sin(endPhi) * Math.cos(endTheta);
      const endY = endRadius * Math.cos(endPhi);
      const endZ = endRadius * Math.sin(endPhi) * Math.sin(endTheta);
      
      positions.push(startX, startY, startZ);
      positions.push(endX, endY, endZ);
      
      // Neural pathway colors
      const intensity = Math.random() * 0.5 + 0.2;
      colors.push(0.2 * intensity, 0.6 * intensity, 0.9 * intensity);
      colors.push(0.2 * intensity, 0.6 * intensity, 0.9 * intensity);
    }
    
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    
    return geo;
  }, []);

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial
        transparent
        vertexColors
        opacity={0.3}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}
