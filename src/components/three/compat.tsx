'use client';

/**
 * React 19 Compatibility Layer for Three.js components
 * 
 * This file provides compatibility wrappers for React Three Fiber 
 * and related libraries when used with React 19
 */

// Use dynamic imports to avoid SSR issues with React 19
import dynamic from 'next/dynamic';

// Create dynamic imports with no SSR
export const ThreeCanvas = dynamic(
  () => import('./DynamicThreeCanvas').then(mod => mod.default),
  { ssr: false }
);

// Export other components needed by the app
export const SafeThreeBackground = dynamic(
  () => import('./SafeThreeBackground').then(mod => mod.default),
  { ssr: false }
);

export const SafeDecagonModel = dynamic(
  () => import('./SafeDecagonModel').then(mod => mod.default),
  { ssr: false }
);

// Export a dummy component that can be used as a fallback
export const ThreePlaceholder = () => {
  return (
    <div className="w-full h-full bg-slate-800 opacity-50 flex items-center justify-center">
      <div className="text-white">3D Content Loading...</div>
    </div>
  );
};

// Helper to check if we're in browser context
export const isBrowser = typeof window !== 'undefined';