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

// TODO: Implement shared layout components (Header, Sidebar, etc.)
const Header = ({ userName, onLogout }: { userName?: string, onLogout: () => void }) => (
  <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
    {/* Placeholder for Header Content (e.g., Search, User Menu) */}
    <div className="ml-auto flex items-center gap-2">
      <span>Welcome, {userName || 'User'}</span>
      <button 
        onClick={onLogout}
        className="rounded bg-primary px-3 py-1 text-primary-foreground hover:bg-primary/90"
      >
        Logout
      </button>
    </div>
  </header>
);

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isLoading, isError, error } = useGetSessionQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  useEffect(() => {
    // Redirect to login if fetching session fails (and not already loading)
    if (!isLoading && isError) {
      console.error('Session error, redirecting to login:', error);
      router.replace('/auth/login'); // Use replace to prevent back navigation to protected route
    }
  }, [isLoading, isError, router, error]);

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      // Session query will automatically refetch/fail after cookie is cleared by backend
      // which triggers the useEffect above to redirect.
      console.log("Logout successful");
    } catch (err) {
      console.error('Logout failed:', err);
      // Optionally show an error notification to the user
    }
  };

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
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14"> {/* Adjust padding if sidebar added */}
        <Header userName={session?.name} onLogout={handleLogout} />
        <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children} 
        </main>
      </div>
    </div>
  );
} 