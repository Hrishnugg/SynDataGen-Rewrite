'use client';

import { ReactNode, Suspense, useEffect, useState } from 'react';

interface ThreeJSRendererProps {
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * A component that renders Three.js content only on the client side,
 * ensuring it's completely isolated from server-side rendering.
 */
export default function ThreeJSRenderer({ fallback, children }: ThreeJSRendererProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only mount the component after hydration
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
} 