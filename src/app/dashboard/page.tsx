"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import ProjectList from "@/features/projects/components/ProjectList";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FiAlertCircle, FiLoader } from "react-icons/fi";
import { Button } from '@/components/ui/button';
import { Project } from '@/lib/models/project';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [authError, setAuthError] = useState<string | null>(null);

  // Handle authentication errors
  useEffect(() => {
    const handleAuthError = (event: ErrorEvent) => {
      console.error("Auth error detected:", event);
      if (event.error?.toString().includes("next-auth") || 
          event.message?.includes("next-auth")) {
        setAuthError("Authentication service is currently unavailable. Please try refreshing the page.");
      }
    };

    // Listen for global errors that might be related to auth
    window.addEventListener('error', handleAuthError);
    
    return () => {
      window.removeEventListener('error', handleAuthError);
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow p-6 flex justify-center items-center min-h-[200px]">
          <div className="flex flex-col items-center">
            <FiLoader className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || authError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow p-6">
          <Alert variant="destructive">
            <FiAlertCircle className="h-4 w-4 mr-2" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {authError || "You are not signed in. Please sign in to access your dashboard."}
            </AlertDescription>
            <div className="mt-4">
              <Button 
                onClick={() => window.location.href = '/auth/signin'} 
                className="mr-4"
              >
                Sign In
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <main>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow p-6">
          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome, {session?.user?.name || 'User'}!
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Here you can view and manage your synthetic data generation projects.
            </p>
          </div>

          {/* Projects Section */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Your Projects
            </h2>
            <ProjectList />
          </div>
        </div>
      </div>
    </main>
  );
}
