'use client';

import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, ChromaticAberration, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import { useTheme } from '@/context/ThemeContext';

function IcosahedronGeometry() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const { theme } = useTheme();

  const rotationOffset = useRef({ x: 0, y: 0 });
  const baseRotation = useRef({ x: 0, y: 0 });
  
  // Create geometry with slight subdivision for smoother edges
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(1, 0);
  }, []);

  // Animation
  useFrame((state) => {
    if (meshRef.current) {
      // Continuous rotation
      baseRotation.current.y += 0.002;
      
      // Calculate target rotation including mouse influence
      const mouse = state.mouse;
      const targetX = mouse.y * 0.5 + baseRotation.current.x;
      const targetY = mouse.x * 0.5 + baseRotation.current.y;
      
      // Smooth interpolation
      rotationOffset.current.x += (targetX - rotationOffset.current.x) * 0.1;
      rotationOffset.current.y += (targetY - rotationOffset.current.y) * 0.1;
      
      // Apply rotation
      meshRef.current.rotation.x = rotationOffset.current.x;
      meshRef.current.rotation.y = rotationOffset.current.y;
    }

    // Update material properties for subtle shine variation
    if (materialRef.current) {
      const time = state.clock.getElapsedTime();
      materialRef.current.envMapIntensity = (theme === 'dark' ? 2.5 : 4) + Math.sin(time * 0.5) * 0.3;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, 0.5, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshPhysicalMaterial
        ref={materialRef}
        color={theme === 'dark' ? "#080808" : "#2563eb"}
        metalness={theme === 'dark' ? 0.95 : 0.9}
        roughness={theme === 'dark' ? 0.85 : 0.1}
        reflectivity={theme === 'dark' ? 0.85 : 1}
        clearcoat={theme === 'dark' ? 0.95 : 1}
        clearcoatRoughness={0.015}
        envMapIntensity={theme === 'dark' ? 2.5 : 4}
        flatShading={false}
        anisotropy={theme === 'dark' ? 1 : 0.5}
        anisotropyRotation={Math.PI / 2}
      />
    </mesh>
  );
}

export default function DecagonModel() {
  const { theme } = useTheme();
  
  return (
    <div className="h-[900px] w-full translate-y-20">
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        style={{
          background: 'transparent',
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          alpha: true,
        }}
      >
        <color attach="background" args={[theme === 'dark' ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)']} />
        
        {/* Environment and Lighting */}
        <Environment preset="studio" />
        <ambientLight intensity={theme === 'dark' ? 0.15 : 0.3} />
        <pointLight 
          position={[10, 10, 10]} 
          intensity={theme === 'dark' ? 1.8 : 2.5} 
          color={theme === 'dark' ? "#FF3366" : "#3366FF"} 
        />
        <pointLight 
          position={[-10, -10, -10]} 
          intensity={theme === 'dark' ? 1.2 : 2} 
          color={theme === 'dark' ? "#4A90E2" : "#2563eb"} 
        />
        <spotLight
          position={[5, 5, 5]}
          angle={0.3}
          penumbra={1}
          intensity={theme === 'dark' ? 2.5 : 3.5}
          color={theme === 'dark' ? "#50E3C2" : "#60A5FA"}
          castShadow
        />

        {/* Main Geometry */}
        <IcosahedronGeometry />

        {/* Post Processing Effects */}
        <EffectComposer>
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new Vector2(0.003, 0.003)}
            radialModulation={false}
            modulationOffset={0}
          />
          <Bloom
            intensity={theme === 'dark' ? 1.2 : 1.5}
            luminanceThreshold={theme === 'dark' ? 0.5 : 0.4}
            luminanceSmoothing={0.4}
            mipmapBlur={true}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
} 