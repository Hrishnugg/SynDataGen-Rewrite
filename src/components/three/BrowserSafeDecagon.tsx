'use client';

import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

// This function immediately returns if we're not in a browser
const isBrowser = () => typeof window !== 'undefined';

export default function BrowserSafeDecagon() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [Three, setThree] = useState<any>(null);
  const [ReactThree, setReactThree] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Safely load all Three.js dependencies
  useEffect(() => {
    if (!isBrowser()) return;

    // Load dependencies
    Promise.all([
      import('three'),
      import('@react-three/fiber')
    ]).then(([threeModule, fiberModule]) => {
      setThree(threeModule);
      setReactThree(fiberModule);
      setIsLoaded(true);
    }).catch(err => {
      console.error('Failed to load Three.js libraries:', err);
    });
  }, []);

  // Custom animation using ref and requestAnimationFrame
  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;
    
    let animationFrame: number;
    let rotation = 0;
    
    const animate = () => {
      rotation += 0.01;
      
      if (containerRef.current) {
        containerRef.current.style.transform = `rotateY(${rotation}rad)`;
      }
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isLoaded]);

  // Simplified Three.js canvas to be rendered client-side only
  if (!isLoaded || !Three || !ReactThree) {
    return (
      <div className="h-[900px] w-full translate-y-20 flex items-center justify-center">
        <div className="w-full h-full rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading 3D Model...</div>
        </div>
      </div>
    );
  }

  // Once everything is loaded, render a simplified version
  return (
    <div 
      ref={containerRef} 
      className="h-[900px] w-full translate-y-20"
    >
      <ReactThree.Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={[theme === "dark" ? "rgb(17, 24, 39)" : "rgb(255, 255, 255)"]} />
        <ambientLight intensity={theme === "dark" ? 0.15 : 0.3} />
        <pointLight position={[10, 10, 10]} intensity={theme === "dark" ? 1.8 : 2.5} />
        <mesh>
          <icosahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial 
            color={theme === "dark" ? "#080808" : "#2563eb"}
            metalness={theme === "dark" ? 0.95 : 0.9}
            roughness={theme === "dark" ? 0.85 : 0.1}
          />
        </mesh>
      </ReactThree.Canvas>
    </div>
  );
} 