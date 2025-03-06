'use client';

import { Suspense } from 'react';
import StaticBackground from './StaticBackground';
import { SafeThreeBackground } from '../three/compat';

// Main component that only loads Three.js code on the client
export default function WaveParticleBackground({ mousePos }: { mousePos: { x: number; y: number } }) {
  // Using our compatibility component instead of dynamically loading Three.js
  return (
    <Suspense fallback={<StaticBackground />}>
      <SafeThreeBackground />
    </Suspense>
  );
}