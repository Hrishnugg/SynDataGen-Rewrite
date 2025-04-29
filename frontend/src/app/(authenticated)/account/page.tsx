'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/shadcn/sidebar"
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { useGetSessionQuery, useLogoutMutation } from '@/features/auth/authApiSlice'
import { IconLoader, IconLogout, IconKey } from '@tabler/icons-react'

// Loading State Component
const LoadingState = () => (
  <div className="flex flex-1 items-center justify-center py-10">
    <IconLoader className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Error State Component
const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-1 items-center justify-center py-10 px-4 text-center text-red-500">
    {message}
  </div>
);

export default function AccountPage() {
  const router = useRouter();
  const { data: session, isLoading: isLoadingSession, isError: isErrorSession, error: sessionError } = useGetSessionQuery();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  // Logout handler
  const handleLogout = async () => {
    try {
      await logout().unwrap();
      toast.success("Logout successful");
      router.push('/auth/login');
    } catch (err) {
      console.error('Logout failed:', err);
      toast.error("Logout failed. Please try again.");
    }
  };

  // Placeholder for change password action
  const handleChangePassword = () => {
    // TODO: Implement password change logic (e.g., open modal, navigate)
    toast.info("Password change functionality not yet implemented.");
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Account Management" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6">
            {isLoadingSession && <LoadingState />}
            {isErrorSession && <ErrorState message={`Error loading account details: ${sessionError?.toString() ?? 'Unknown error'}`} />}
            {!isLoadingSession && !isErrorSession && session && (
              <Card className="w-full max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={session.email} readOnly disabled />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone Number</Label>
                    {/* TODO: Add state and handler for phone number input */}
                    <Input id="phone" placeholder="Add your phone number" /> 
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
                  <Button variant="outline" onClick={handleChangePassword}>
                    <IconKey className="mr-2 h-4 w-4" /> Change Password
                  </Button>
                  <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut}>
                    <IconLogout className="mr-2 h-4 w-4" /> {isLoggingOut ? "Signing Out..." : "Sign Out"}
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
