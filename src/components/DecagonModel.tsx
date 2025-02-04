'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

function DecagonGeometry() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Create decagon shape
  const shape = new THREE.Shape();
  const sides = 10;
  const radius = 2;
  
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();

  // Animation
  useFrame((state) => {
    if (meshRef.current) {
      // Base rotation
      meshRef.current.rotation.x += 0.002;
      meshRef.current.rotation.y += 0.003;

      // Mouse interaction
      const mouse = state.mouse;
      meshRef.current.rotation.x += (mouse.y * 0.5 - meshRef.current.rotation.x) * 0.1;
      meshRef.current.rotation.y += (mouse.x * 0.5 - meshRef.current.rotation.y) * 0.1;
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <extrudeGeometry
        args={[
          shape,
          {
            depth: 0.4,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelSegments: 5,
          },
        ]}
      />
      <meshStandardMaterial
        color={hovered ? "#00a8ff" : "#2980b9"}
        metalness={0.8}
        roughness={0.2}
      />
      <Edges color="#00f7ff" scale={1} threshold={15} />
    </mesh>
  );
}

export default function DecagonModel() {
  return (
    <div className="h-[600px] w-full">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{
          background: 'transparent',
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <DecagonGeometry />
      </Canvas>
    </div>
  );
} 