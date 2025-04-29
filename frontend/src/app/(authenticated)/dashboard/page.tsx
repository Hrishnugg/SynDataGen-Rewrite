'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
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
import { IconLoader } from '@tabler/icons-react'
import { navMain } from "@/lib/navigation"

// Loading State Component
const LoadingState = () => (
  <div className="flex flex-1 items-center justify-center py-10">
    <IconLoader className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function DashboardPage() {
  const pathname = usePathname();
  const currentPage = navMain.find(item => item.url === pathname);
  const pageTitle = currentPage?.title || "Dashboard";

  // Fetch projects (e.g., recent 5 for dashboard)
  const { 
    data: projectsData, 
    isLoading: isLoadingProjects, 
    isError: isErrorProjects 
  } = useListProjectsQuery({ limit: 5, status: 'active' }); // Fetch recent active projects

  // Fetch jobs (e.g., recent 5 active/running for dashboard)
   const { 
     data: jobsData, 
     isLoading: isLoadingJobs, 
     isError: isErrorJobs 
   } = useListAllAccessibleJobsQuery({ limit: 5, statusFilter: 'running' }); // Fetch recent running jobs

  const isLoading = isLoadingProjects || isLoadingJobs;
  const projects = projectsData?.projects || [];
  const totalProjects = projectsData?.total || 0;
  const jobs = jobsData?.jobs || [];
  const totalJobs = jobsData?.total || 0;
  const runningJobs = jobs.filter(job => job.status === 'running' || job.status === 'pending' || job.status === 'queued').length;

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
        <SiteHeader title={pageTitle} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards 
                totalProjects={totalProjects} 
                runningJobs={runningJobs} 
              />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              {isLoading && <LoadingState />}
              {isErrorProjects && <div className="px-4 lg:px-6 text-red-500">Error loading projects.</div>}
              {!isLoading && !isErrorProjects && (
                <DataTable data={projects} />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
