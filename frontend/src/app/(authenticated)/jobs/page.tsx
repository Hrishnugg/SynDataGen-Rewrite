'use client'

import * as React from "react"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { z } from "zod"

// Layout Imports
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/shadcn/sidebar"
import { Button } from "@/components/shadcn/button"

// Page Specific Imports
import { JobsTable } from "@/components/jobs-table"
import { ToggleGroup, ToggleGroupItem } from "@/components/shadcn/toggle-group"
import { Separator } from "@/components/shadcn/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shadcn/card"
import { useListAllAccessibleJobsQuery } from '@/features/jobs/jobApiSlice'
import { IconLoader } from '@tabler/icons-react'
import { navMain } from "@/lib/navigation"

// Define the schema based on jobs-table.tsx
const jobSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(["Active", "Archived", "Error"]),
  createdDate: z.string(),
  duration: z.string(),
})

type Job = z.infer<typeof jobSchema>;

// Mock Job Data (Replace with actual data fetching later)
const mockJobs: Job[] = [
  { id: 1, name: "Generate User Profiles", status: "Active", createdDate: "2024-07-25", duration: "15m 30s" },
  { id: 2, name: "Analyze Churn Data", status: "Archived", createdDate: "2024-07-24", duration: "1h 02m" },
  { id: 3, name: "Process Medical Images", status: "Error", createdDate: "2024-07-23", duration: "5m 10s" },
  { id: 4, name: "Simulate Network Traffic", status: "Active", createdDate: "2024-07-25", duration: "45m 00s" },
  { id: 5, name: "Train Product Recommender", status: "Archived", createdDate: "2024-07-22", duration: "8h 15m" },
  { id: 6, name: "Financial Transaction Anomaly Detection", status: "Active", createdDate: "2024-07-25", duration: "2m 05s" },
  { id: 7, name: "Data Migration Task", status: "Error", createdDate: "2024-07-24", duration: "10m 00s" },
];

// Loading State Component
const LoadingState = () => (
  <div className="flex flex-1 items-center justify-center py-10">
    <IconLoader className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function JobsPage() {
  const pathname = usePathname();
  const currentPage = navMain.find(item => item.url === pathname);
  const pageTitle = currentPage?.title || "Jobs";

  const [pagination, setPagination] = useState({ limit: 10, offset: 0 });

  const { 
    data: jobsData, 
    isLoading, 
    isError, 
    error 
  } = useListAllAccessibleJobsQuery({ limit: pagination.limit, offset: pagination.offset });

  const jobs = jobsData?.jobs || [];
  const totalJobs = jobsData?.total || 0;

  const handleNextPage = () => {
    if (jobsData && (pagination.offset + pagination.limit < jobsData.total)) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
    }
  };

  const handlePrevPage = () => {
    setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
  };

  return (
    <SidebarProvider
       style={{
         "--sidebar-width": "calc(var(--spacing) * 72)",
         "--header-height": "calc(var(--spacing) * 12)",
       } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={pageTitle} />
        <div className="flex flex-1 flex-col p-4 md:p-6">
          {isLoading && <LoadingState />}
          {isError && <div className="text-red-500">Error loading jobs: {JSON.stringify(error)}</div>}
          {!isLoading && !isError && (
            <>
              <JobsTable data={jobs} />
              {totalJobs > 0 && (
                <div className="flex items-center justify-end space-x-2 pt-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Showing {pagination.offset + 1}- {Math.min(pagination.offset + pagination.limit, totalJobs)} of {totalJobs} jobs
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={pagination.offset === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={pagination.offset + pagination.limit >= totalJobs}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 