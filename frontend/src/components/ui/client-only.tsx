"use client";

import { useState, useEffect } from 'react';

/**
 * A utility component that ensures its children are only rendered on the client-side,
 * after the initial hydration is complete. This is useful for components that
 * rely on browser-specific APIs, window dimensions, or randomness that would
 * otherwise cause hydration mismatches.
 */
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    // Render nothing on the server or during initial client hydration
    return null;
  }

  // Render children only after the component has mounted on the client
  return <>{children}</>;
};

export default ClientOnly; 