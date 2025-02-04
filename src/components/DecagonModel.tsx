'use client';

import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { EffectComposer, ChromaticAberration, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';

function IcosahedronGeometry() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const rotationOffset = useRef({ x: 0, y: 0 });
  const baseRotation = useRef({ x: 0, y: 0 });
  
  // Create sharp-edged icosahedron (d20)
  const geometry = useMemo(() => {
    const baseGeometry = new THREE.IcosahedronGeometry(1.2, 0);
    return baseGeometry;
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
      materialRef.current.envMapIntensity = 2.5 + Math.sin(time * 0.5) * 0.3;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshPhysicalMaterial
        ref={materialRef}
        color={hovered ? "#666666" : "#444444"}
        metalness={0.98}
        roughness={0.02}
        reflectivity={1.0}
        clearcoat={1}
        clearcoatRoughness={0.02}
        envMapIntensity={2.5}
        flatShading={true}
      />
    </mesh>
  );
}

export default function DecagonModel() {
  return (
    <div className="h-[600px] w-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{
          background: 'transparent',
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          alpha: true,
        }}
      >
        <color attach="background" args={['#000000']} />
        
        {/* Environment and Lighting */}
        <Environment preset="studio" />
        <ambientLight intensity={0.15} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#FF3366" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#4A90E2" />
        <spotLight
          position={[5, 5, 5]}
          angle={0.3}
          penumbra={1}
          intensity={2}
          color="#50E3C2"
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
            intensity={1.2}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.3}
            mipmapBlur={true}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
} 