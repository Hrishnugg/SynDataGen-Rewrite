'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Configuration type
interface ParticleConfig {
  waveInfluence: number;
  fluidInfluence: number;
  mouseForce: number;
  mouseRadius: number;
  particleCount: number;
  showControls: boolean;
}

// Main particle wave component
function ParticleWave({ 
  mousePos, 
  config 
}: { 
  mousePos: { x: number; y: number },
  config: ParticleConfig
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const { size, viewport, clock } = useThree();
  const aspect = size.width / size.height;
  
  // Particle system properties
  const count = config.particleCount;
  
  // Fluid simulation parameters
  const [velocities] = useState(() => new Float32Array(count * 2)); // For X,Y velocities
  const [forces] = useState(() => new Float32Array(count * 2)); // For X,Y forces
  const [targetPositions] = useState(() => new Float32Array(count * 3));
  const [initialPositions] = useState(() => new Float32Array(count * 3));
  const [colors] = useState(() => new Float32Array(count * 3));
  const [sizes] = useState(() => new Float32Array(count));
  
  // Fluid simulation constants
  const MOUSE_FORCE = config.mouseForce;
  const MOUSE_RADIUS = config.mouseRadius;
  const VISCOSITY = 0.98;     // Fluid viscosity (friction)
  const VELOCITY_LIMIT = 0.05; // Max particle velocity
  const FORCE_RADIUS = 0.15;   // Radius for particle-particle interaction
  const FORCE_STRENGTH = 0.01; // Strength of particle-particle forces
  const WAVE_INFLUENCE = config.waveInfluence;
  const FLUID_INFLUENCE = config.fluidInfluence;
  
  // Create particles with initial positions
  useMemo(() => {
    const width = 10 * aspect;
    
    // Create initial positions and colors for fluid particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const i2 = i * 2;
      
      // More evenly distributed particles for fluid simulation
      // Create a grid-like initial structure with slight randomness
      const cols = Math.sqrt(count) * 1.5;
      const rows = count / cols;
      
      const row = Math.floor(i / cols);
      const col = i % cols;
      
      // Normalized positions from -1 to 1 with slight jitter
      let x = (col / cols) * 2 - 1 + (Math.random() * 0.02);
      let y = (row / rows) * 2 - 1 + (Math.random() * 0.02);
      
      // Add some wave-like distribution to initial positions
      const baseX = x;
      // Initial wave pattern
      const waveY = Math.sin(baseX * 0.6) * 0.1 + 
                    Math.sin(baseX * 1.3) * 0.05 +
                    Math.sin(baseX * 0.2 + 0.5) * 0.07;
      
      // Blend wave pattern with grid position
      y = y * 0.6 + waveY * 0.4;
      
      // Scale to viewport with margins
      const px = x * width * 0.8;
      const py = y * 5 * 0.8;
      
      // Z position with some depth variation
      const z = (Math.random() * 2 - 1) * 1.0;
      
      initialPositions[i3] = px;
      initialPositions[i3 + 1] = py;
      initialPositions[i3 + 2] = z;
      
      targetPositions[i3] = px;
      targetPositions[i3 + 1] = py;
      targetPositions[i3 + 2] = z;
      
      // Initialize velocities to zero
      velocities[i2] = 0;
      velocities[i2 + 1] = 0;
      
      // Initialize forces to zero
      forces[i2] = 0;
      forces[i2 + 1] = 0;
      
      // Color gradient based on position (yellow-green to teal)
      const normalizedX = (px / (width * 0.8)) * 0.5 + 0.5; // 0 to 1
      
      // Left side: yellow-green
      // Right side: teal-blue
      if (px < 0) {
        colors[i3] = 0.5 + normalizedX * 0.5; // R: yellow-green (0.5-1.0)
        colors[i3 + 1] = 0.8 + normalizedX * 0.2; // G: bright green (0.8-1.0)
        colors[i3 + 2] = 0.0; // B: none
      } else {
        colors[i3] = 0.0; // R: none
        colors[i3 + 1] = 0.5 + (1 - normalizedX) * 0.3; // G: some green (0.5-0.8)
        colors[i3 + 2] = 0.7 + (1 - normalizedX) * 0.3; // B: teal-blue (0.7-1.0)
      }
      
      // Randomized sizes for more natural look
      sizes[i] = Math.random() * 1.5 + 0.8;
    }
  }, [count, aspect, initialPositions, targetPositions, colors, sizes, velocities, forces]);
  
  // Animation and fluid simulation
  useFrame(() => {
    if (!pointsRef.current) return;
    
    const time = clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const deltaTime = Math.min(0.1, clock.getDelta()); // Capped delta time for stability
    
    // Mouse influence parameters
    const mouseInfluenceX = mousePos.x * 8 * aspect;
    const mouseInfluenceY = mousePos.y * 5;
    const mouseActive = Math.abs(mousePos.x) > 0.01 || Math.abs(mousePos.y) > 0.01;
    
    // Update forces and velocities first
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const i2 = i * 2;
      
      // Reset forces
      forces[i2] = 0;
      forces[i2 + 1] = 0;
      
      // Calculate wave pattern force
      const x = positions[i3];
      const y = positions[i3 + 1];
      
      // Original x position (normalized)
      const originalX = initialPositions[i3];
      
      // Calculate wave pattern at current time
      const freq1 = 0.6;  // Main wave
      const freq2 = 1.2;  // Detail wave
      const freq3 = 0.2;  // Slow variation
      
      // Create complex wave by combining multiple sine waves with time animation
      let waveY = Math.sin(originalX * freq1 + time * 0.4) * 0.08;
      waveY += Math.sin(originalX * freq2 + time * 0.7) * 0.03;
      waveY += Math.sin(originalX * freq3 + time * 0.2) * 0.06;
      
      // Convert to world space
      waveY *= 5 * 0.8;
      
      // Target y position is a blend of current and wave position
      const targetY = initialPositions[i3 + 1] + waveY;
      
      // Wave force - pull particle toward the wave pattern
      const waveForceY = (targetY - y) * 0.05 * WAVE_INFLUENCE;
      forces[i2 + 1] += waveForceY;
      
      // Slight horizontal stabilizing force to maintain x distribution
      const stabilizingForceX = (originalX - x) * 0.01 * WAVE_INFLUENCE;
      forces[i2] += stabilizingForceX;
      
      // Add ambient fluid flow force (gentle)
      const flowX = Math.sin(y * 0.1 + time * 0.2) * 0.0005 * FLUID_INFLUENCE;
      const flowY = Math.cos(x * 0.1 + time * 0.3) * 0.0005 * FLUID_INFLUENCE;
      forces[i2] += flowX;
      forces[i2 + 1] += flowY;
      
      // Mouse influence - strong directional force
      if (mouseActive) {
        const dx = x - mouseInfluenceX;
        const dy = y - mouseInfluenceY;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        if (dist < MOUSE_RADIUS) {
          // Normalized direction vector
          const nx = dx / dist;
          const ny = dy / dist;
          
          // Exponential falloff with distance
          const falloff = Math.pow(1 - Math.min(1, dist / MOUSE_RADIUS), 2);
          const strength = MOUSE_FORCE * falloff;
          
          forces[i2] += nx * strength;
          forces[i2 + 1] += ny * strength;
        }
      }
    }
    
    // Simple spatial hash for particle-particle interaction
    const cellSize = FORCE_RADIUS;
    const hashCells: {[key: string]: number[]} = {};
    
    // Place particles in cells
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const cellX = Math.floor(positions[i3] / cellSize);
      const cellY = Math.floor(positions[i3 + 1] / cellSize);
      const cellKey = `${cellX},${cellY}`;
      
      if (!hashCells[cellKey]) {
        hashCells[cellKey] = [];
      }
      hashCells[cellKey].push(i);
    }
    
    // Compute particle-particle forces
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const i2 = i * 2;
      const cellX = Math.floor(positions[i3] / cellSize);
      const cellY = Math.floor(positions[i3 + 1] / cellSize);
      
      // Check neighboring cells
      for (let nx = -1; nx <= 1; nx++) {
        for (let ny = -1; ny <= 1; ny++) {
          const neighborKey = `${cellX + nx},${cellY + ny}`;
          const neighbors = hashCells[neighborKey];
          
          if (neighbors) {
            for (const j of neighbors) {
              if (i !== j) {
                const j3 = j * 3;
                const dx = positions[i3] - positions[j3];
                const dy = positions[i3 + 1] - positions[j3 + 1];
                const distSq = dx * dx + dy * dy;
                
                if (distSq < FORCE_RADIUS * FORCE_RADIUS && distSq > 0.0001) {
                  const dist = Math.sqrt(distSq);
                  const force = FORCE_STRENGTH * (1 - dist / FORCE_RADIUS) * FLUID_INFLUENCE;
                  
                  forces[i2] += (dx / dist) * force;
                  forces[i2 + 1] += (dy / dist) * force;
                }
              }
            }
          }
        }
      }
    }
    
    // Apply forces to update velocities and positions
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const i2 = i * 2;
      
      // Update velocity from forces
      velocities[i2] += forces[i2];
      velocities[i2 + 1] += forces[i2 + 1];
      
      // Apply viscosity (damping)
      velocities[i2] *= VISCOSITY;
      velocities[i2 + 1] *= VISCOSITY;
      
      // Limit velocity
      const speedSq = velocities[i2] * velocities[i2] + velocities[i2 + 1] * velocities[i2 + 1];
      if (speedSq > VELOCITY_LIMIT * VELOCITY_LIMIT) {
        const speed = Math.sqrt(speedSq);
        velocities[i2] = (velocities[i2] / speed) * VELOCITY_LIMIT;
        velocities[i2 + 1] = (velocities[i2 + 1] / speed) * VELOCITY_LIMIT;
      }
      
      // Update position based on velocity
      positions[i3] += velocities[i2];
      positions[i3 + 1] += velocities[i2 + 1];
      
      // Boundaries - bounce off edges with wave-aware constraints
      const width = 10 * aspect * 0.8;
      const height = 10 * 0.5;
      
      if (positions[i3] < -width) {
        positions[i3] = -width;
        velocities[i2] *= -0.5; // Bounce with energy loss
      } else if (positions[i3] > width) {
        positions[i3] = width;
        velocities[i2] *= -0.5;
      }
      
      // More forgiving vertical bounds to allow for wave motion
      const verticalMargin = 0.5;
      if (positions[i3 + 1] < -height - verticalMargin) {
        positions[i3 + 1] = -height - verticalMargin;
        velocities[i2 + 1] *= -0.5;
      } else if (positions[i3 + 1] > height + verticalMargin) {
        positions[i3 + 1] = height + verticalMargin;
        velocities[i2 + 1] *= -0.5;
      }
    }
    
    // Tell Three.js to update particle positions
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  // Create a circle texture for particles with sharper falloff
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a radial gradient with sharper falloff for more defined particles
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={initialPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        sizeAttenuation={true}
        vertexColors
        transparent
        alphaTest={0.01}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={particleTexture}
      />
    </points>
  );
}

// Background sparkle particles
function BackgroundParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const { size, viewport, clock } = useThree();
  const aspect = size.width / size.height;
  
  // Particle system properties
  const count = 300; // Increased from 200 for more background stars
  
  // Create particles with positions and colors
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const width = 14 * aspect; // Increased from 12 to cover more area
    const height = 14;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      arr[i3] = (Math.random() * 2 - 1) * width;
      arr[i3 + 1] = (Math.random() * 2 - 1) * height;
      arr[i3 + 2] = Math.random() * -5 - 1; // Behind the wave
    }
    
    return arr;
  }, [count, aspect]);
  
  // Colors for background particles
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Randomly choose between yellow-green and teal
      if (Math.random() > 0.5) {
        arr[i3] = 0.5 + Math.random() * 0.5;
        arr[i3 + 1] = 0.8 + Math.random() * 0.2;
        arr[i3 + 2] = 0.0;
      } else {
        arr[i3] = 0.0;
        arr[i3 + 1] = 0.5 + Math.random() * 0.3;
        arr[i3 + 2] = 0.7 + Math.random() * 0.3;
      }
    }
    
    return arr;
  }, [count]);
  
  // Create sizes for background particles
  const sizes = useMemo(() => {
    return new Float32Array(count).fill(2);
  }, [count]);
  
  // Create particle texture
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a radial gradient for a soft circle
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
  
  // Twinkle animation for background particles
  useFrame(() => {
    if (!pointsRef.current) return;
    
    const time = clock.getElapsedTime();
    const sizes = pointsRef.current.geometry.attributes.size.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Subtle size pulsing for twinkle effect
      sizes[i] = Math.sin(time * (0.2 + i * 0.005) + i) * 0.5 + 1.5;
    }
    
    pointsRef.current.geometry.attributes.size.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        sizeAttenuation={true}
        vertexColors
        transparent
        alphaTest={0.01}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={particleTexture}
      />
    </points>
  );
}

// Scene setup component
function ParticleScene({ mousePos, config }: { mousePos: { x: number; y: number }, config: ParticleConfig }) {
  return (
    <>
      <color attach="background" args={['#060B10']} />
      <BackgroundParticles />
      <ParticleWave mousePos={mousePos} config={config} />
    </>
  );
}

// Main component for Canvas setup and mouse tracking
export default function TestWaveParticleBackground({ config }: { config: ParticleConfig }) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse movement
  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      
      // Calculate normalized position (-1 to 1)
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      
      setMousePos({ x, y });
    };

    const container = containerRef.current;
    container.addEventListener('mousemove', handleMouseMove as unknown as EventListener);
    
    // Add a mouseleave handler to reset position gradually
    const handleMouseLeave = () => {
      const fadeOut = setInterval(() => {
        setMousePos(prev => ({
          x: prev.x * 0.95,
          y: prev.y * 0.95
        }));
        
        if (Math.abs(mousePos.x) < 0.01 && Math.abs(mousePos.y) < 0.01) {
          clearInterval(fadeOut);
          setMousePos({ x: 0, y: 0 });
        }
      }, 30);
      
      // Clear interval if it runs too long
      setTimeout(() => clearInterval(fadeOut), 1000);
    };
    
    container.addEventListener('mouseleave', handleMouseLeave as unknown as EventListener);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove as unknown as EventListener);
      container.removeEventListener('mouseleave', handleMouseLeave as unknown as EventListener);
    };
  }, [mousePos]);

  return (
    <div 
      ref={containerRef} 
      className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      {/* Make component pointer-events-auto so we can capture mouse events */}
      <div className="w-full h-full pointer-events-auto">
        <Canvas
          camera={{ position: [0, 0, 8.5], fov: 50 }}
          gl={{ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
          }}
          linear
          flat
        >
          <ParticleScene mousePos={mousePos} config={config} />
        </Canvas>
      </div>
    </div>
  );
} 