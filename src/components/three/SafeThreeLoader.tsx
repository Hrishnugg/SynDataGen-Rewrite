'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { isBrowser } from '@/utils/isBrowser';
import ThreeComponentMap from './ThreeComponentMap';

interface SafeThreeLoaderProps {
  fallback: React.ReactNode;
  componentName: string;
  componentProps?: any;
}

/**
 * A special component that ensures Three.js components are only loaded in the browser
 * This component uses a mapping approach instead of dynamic string imports
 */
export default function SafeThreeLoader({ 
  fallback, 
  componentName, 
  componentProps = {} 
}: SafeThreeLoaderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Double-check we're in the browser
    if (isBrowser()) {
      setIsClient(true);
    }
  }, []);

  // Only render the Three.js component when we're sure we're in a browser
  if (!isClient) {
    return <>{fallback}</>;
  }

  // Get the component from our mapping
  const ThreeComponent = ThreeComponentMap[componentName as keyof typeof ThreeComponentMap];
  
  if (!ThreeComponent) {
    console.error(`Three.js component "${componentName}" not found in component map`);
    return <>{fallback}</>;
  }

  // Render the component with the provided props, wrapped in Suspense
  return (
    <Suspense fallback={fallback}>
      <ThreeComponent {...componentProps} />
    </Suspense>
  );
} 