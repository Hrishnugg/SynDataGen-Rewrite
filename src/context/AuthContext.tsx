"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";

interface AuthContextProps {
  children: ReactNode;
}

/**
 * AuthContext wrapper component that provides Next-Auth session management
 * Properly handles client-side rendering with hydration safety
 */
export default function AuthContext({ children }: AuthContextProps) {
  // Add a mounted state to prevent hydration mismatches
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // If we're not mounted yet, just render children without the provider
  // This prevents hydration mismatches between server/client
  if (!mounted) {
    return <>{children}</>;
  }
  
  return <SessionProvider>{children}</SessionProvider>;
}
