"use client";

import { useState, useEffect, lazy, Suspense } from 'react';

// Placeholder component with no Three.js dependencies
function LoadingPlaceholder() {
  return (
    <div className="h-[900px] w-full translate-y-20 flex items-center justify-center">
      <div className="w-full h-full rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading 3D Model...</div>
      </div>
    </div>
  );
}

// Main component that only loads Three.js code on the client
export default function DecagonModel() {
  const [ThreeComponent, setThreeComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // Only import the Three.js component on the client
    import('./three/DecagonModelThree')
      .then(module => {
        setThreeComponent(() => module.default);
      })
      .catch(err => console.error('Error loading Three.js component:', err));
  }, []);

  // Always return the wrapper, and only render Three.js when loaded
  if (!ThreeComponent) {
    return <LoadingPlaceholder />;
  }

  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <ThreeComponent />
    </Suspense>
  );
}
