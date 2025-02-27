'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';

// This function immediately returns if we're not in a browser
const isBrowser = () => typeof window !== 'undefined';

export default function BrowserSafeBackground({ mousePos = { x: 0, y: 0 } }) {
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

  // Simplified Three.js canvas to be rendered client-side only
  if (!isLoaded || !Three || !ReactThree) {
    return (
      <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex items-center justify-center h-full">
          <div className="text-gray-400">Loading background...</div>
        </div>
      </div>
    );
  }

  // Once everything is loaded, render a simplified version
  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full"
      style={{ 
        backgroundColor: theme === 'dark' ? '#060B10' : '#f5f5f5',
      }}
    >
      <ReactThree.Canvas
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={theme === 'dark' ? '#4A90E2' : '#60A5FA'} />
        </mesh>
      </ReactThree.Canvas>
    </div>
  );
} 