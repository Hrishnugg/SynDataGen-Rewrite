'use client';

import { Suspense, ReactNode } from 'react';
import ClientOnly from './ClientOnly';

interface ThreeCanvasProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ThreeCanvas is a specialized wrapper for Three.js/React Three Fiber content.
 * It ensures the 3D content is only rendered on the client side and handles loading states.
 */
export default function ThreeCanvas({ children, fallback }: ThreeCanvasProps) {
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ClientOnly>
  );
} 