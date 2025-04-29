'use client';

import * as React from 'react';
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/shadcn/sidebar"
import { useListProjectsQuery } from '@/features/projects/projectApiSlice'
import { useListAllAccessibleJobsQuery } from '@/features/jobs/jobApiSlice'
import { IconLoader, IconRefresh, IconCircleX, IconArrowUp, IconShoppingCartPlus, IconCreditCardRefund } from '@tabler/icons-react'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card'
import { toast } from 'sonner'

// Loading State Component
const LoadingState = () => (
  <div className="flex flex-1 items-center justify-center py-10">
    <IconLoader className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Error State Component (Example - adapt if needed)
const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-1 items-center justify-center py-10 px-4 text-center text-red-500">
    {message}
  </div>
);

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'data' in error && typeof error.data === 'object' && error.data !== null && 'message' in error.data && typeof error.data.message === 'string') {
     return error.data.message; // Common pattern for RTK Query errors
  }
  return 'An unexpected error occurred';
};

// TODO: Replace dashboard content with Billing specifics
export default function BillingPage() {
  // Remove dashboard-specific data fetching or adapt for billing info
  const { 
    data: projectsData, 
    isLoading: isLoadingProjects, 
    isError: isErrorProjects 
  } = useListProjectsQuery({ limit: 5, status: 'active' }); 

   const { 
     data: jobsData, 
     isLoading: isLoadingJobs, 
     isError: isErrorJobs 
   } = useListAllAccessibleJobsQuery({ limit: 5, statusFilter: 'running' }); 

  const isLoading = isLoadingProjects || isLoadingJobs;
  const projects = projectsData?.projects || [];
  const totalProjects = projectsData?.total || 0;
  const jobs = jobsData?.jobs || [];
  const totalJobs = jobsData?.total || 0;
  const runningJobs = jobs.filter(job => job.status === 'running' || job.status === 'pending' || job.status === 'queued').length;

  // TODO: Fetch actual billing data (plan, credits, next payment date) when API is available
  const isLoadingBilling = false; // Placeholder
  const isErrorBilling = false; // Placeholder
  const billingError: unknown = null; // Placeholder - Use unknown type

  // Placeholder data
  const currentPlan = "Basic Plan";
  const remainingCredits = 100;
  const nextPaymentDate = "January 1, 2025"; 

  // Placeholder handlers - show toast for now
  const handleRefund = () => toast.info("Refund functionality not yet implemented.");
  const handleCancel = () => toast.info("Cancel plan functionality not yet implemented.");
  const handleRenew = () => toast.info("Renew plan functionality not yet implemented.");
  const handleUpgrade = () => toast.info("Upgrade plan functionality not yet implemented.");
  const handlePurchaseCredits = () => toast.info("Purchase credits functionality not yet implemented.");

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
         {/* Update SiteHeader title */}
        <SiteHeader title="Billing Information" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
            {isLoadingBilling && <LoadingState />}
            {isErrorBilling && <ErrorState message={`Error loading billing details: ${getErrorMessage(billingError)}`} />}
            {!isLoadingBilling && !isErrorBilling && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                
                {/* Current Plan Card */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Subscription Plan</CardTitle>
                    <CardDescription>Manage your current subscription.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium mb-4">Your current plan: <span className="text-primary">{currentPlan}</span></p>
                    <p className="text-sm text-muted-foreground">Next payment due: {nextPaymentDate}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleRefund} disabled>
                      <IconCreditCardRefund className="mr-2 h-4 w-4" /> Refund
                    </Button>
                    <Button variant="outline" onClick={handleCancel} disabled>
                      <IconCircleX className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button variant="outline" onClick={handleRenew} disabled>
                      <IconRefresh className="mr-2 h-4 w-4" /> Renew
                    </Button>
                    <Button onClick={handleUpgrade} disabled>
                      <IconArrowUp className="mr-2 h-4 w-4" /> Upgrade Plan
                    </Button>
                  </CardFooter>
                </Card>

                {/* Credits Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Credits</CardTitle>
                    <CardDescription>View and purchase usage credits.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold mb-2">{remainingCredits}</p>
                    <p className="text-sm text-muted-foreground">Credits Remaining</p>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={handlePurchaseCredits} disabled>
                      <IconShoppingCartPlus className="mr-2 h-4 w-4" /> Purchase Credits
                    </Button>
                  </CardFooter>
                </Card>

                {/* Add more cards here if needed, e.g., Payment History */}

              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
