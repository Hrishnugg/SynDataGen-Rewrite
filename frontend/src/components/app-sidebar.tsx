"use client"

import * as React from "react"
import Link from 'next/link'
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { useListProjectsQuery } from '@/features/projects/projectApiSlice';
import { useListAllAccessibleJobsQuery } from '@/features/jobs/jobApiSlice';

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { NavSection } from "@/components/nav-section"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/shadcn/sidebar"
import { navMain } from "@/lib/navigation"
import { Skeleton } from "@/components/shadcn/skeleton"

const SectionStatus = ({
  isLoading,
  isError,
  hasData,
  loadingText = "Loading...",
  errorText = "Error loading data.",
  emptyText = "No data found.",
}: {
  isLoading: boolean;
  isError: boolean;
  hasData: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2 px-4 py-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  if (isError) {
    return <div className="px-4 py-2 text-xs text-destructive">{errorText}</div>;
  }
  if (!hasData) {
    return <div className="px-4 py-2 text-xs text-muted-foreground">{emptyText}</div>;
  }
  return null;
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    isError: isErrorProjects,
  } = useListProjectsQuery({ limit: 3 });

  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    isError: isErrorJobs,
  } = useListAllAccessibleJobsQuery({ limit: 3 });

  const recentProjects = React.useMemo(() => {
    if (!projectsData?.projects || !Array.isArray(projectsData.projects)) return [];
    return projectsData.projects.map((project: any) => ({
      name: project.name || `Project ${project.id}`,
      url: `/projects/${project.id}`,
      icon: IconFolder,
    }));
  }, [projectsData]);

  const recentJobs = React.useMemo(() => {
    if (!jobsData?.jobs || !Array.isArray(jobsData.jobs)) return [];
    return jobsData.jobs.map((job: any) => ({
      name: job.name || `Job ${job.id}`,
      url: `/projects/${job.projectId}/jobs/${job.id}`,
      icon: IconListDetails,
    }));
  }, [jobsData]);

  /*const navSecondary = [
    { title: "Settings", url: "#", icon: IconSettings },
    { title: "Get Help", url: "#", icon: IconHelp },
    { title: "Search", url: "#", icon: IconSearch },
  ];*/

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <>
                  <img 
                    src="/synopticlogo3d.png" 
                    alt="Synoptica Logo" 
                    className="h-5 w-5"
                  />
                  <span className="text-base font-semibold">Synoptica</span>
                </>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />

        {/* --- Dynamic Recent Projects Section --- */}
        {/* Render Status first */} 
        <SectionStatus
          isLoading={isLoadingProjects}
          isError={isErrorProjects}
          hasData={recentProjects.length > 0}
          loadingText="Loading projects..."
          errorText="Error loading projects."
          emptyText="No recent projects."
        />
        {/* Conditionally render NavSection only if there are items */}
        {recentProjects.length > 0 && (
          <NavSection title="Recent Projects" items={recentProjects} />
        )}


        {/* --- Dynamic Recent Jobs Section --- */}
        {/* Render Status first */}
         <SectionStatus
          isLoading={isLoadingJobs}
          isError={isErrorJobs}
          hasData={recentJobs.length > 0}
          loadingText="Loading jobs..."
          errorText="Error loading jobs."
          emptyText="No recent jobs."
        />
         {/* Conditionally render NavSection only if there are items */}
        {recentJobs.length > 0 && (
          <NavSection title="Recent Jobs" items={recentJobs} />
        )}

        {/*<NavSecondary items={navSecondary} className="mt-auto" />*/}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
