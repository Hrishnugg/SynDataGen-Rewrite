'use client';

import { useState, useEffect, Suspense } from 'react';
import StaticBackground from './StaticBackground';

// Main component that only loads Three.js code on the client
export default function WaveParticleBackground({ mousePos }: { mousePos: { x: number; y: number } }) {
  const [ThreeComponent, setThreeComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // Only import the Three.js component on the client
    import('../three/WaveParticleBackgroundThree')
      .then(module => {
        setThreeComponent(() => module.default);
      })
      .catch(err => console.error('Error loading Three.js component:', err));
  }, []);

  // Always return the wrapper with a placeholder until the component is loaded
  if (!ThreeComponent) {
    return <StaticBackground />;
  }

  return (
    <Suspense fallback={<StaticBackground />}>
      <ThreeComponent mousePos={mousePos} />
    </Suspense>
  );
}