'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGetSessionQuery, useLogoutMutation } from '@/features/auth/authApiSlice';

// TODO: Replace with a proper loading spinner component
const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
  </div>
);

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isLoading, isError, error } = useGetSessionQuery();

  useEffect(() => {
    // Redirect to login if fetching session fails (and not already loading)
    if (!isLoading && isError) {
      console.error('Session error, redirecting to login:', error);
      router.replace('/auth/login'); // Use replace to prevent back navigation to protected route
    }
  }, [isLoading, isError, router, error]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If session fetch completed but there's still no session data (e.g., initial load after error before redirect effect runs)
  // or if an error occurred but redirection hasn't happened yet.
  if (!session || isError) {
     // Render minimal layout or loading state until redirect effect runs
     return <LoadingSpinner />;
  }

  // Session is valid, render the layout and children
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* TODO: Add Sidebar component */}
      <div className="flex flex-1"> {/* Changed flex-col to flex-1 */}
        <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children} 
        </main>
      </div>
    </div>
  );
} 