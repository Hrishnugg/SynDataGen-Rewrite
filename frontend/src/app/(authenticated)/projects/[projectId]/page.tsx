'use client'

import * as React from "react";
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/shadcn/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
// Import the updated table components
import { JobsTable } from "@/components/jobs-table";
import { DatasetsTable } from "@/components/datasets-table";
import { Separator } from "@/components/shadcn/separator";
import { ProjectMetricCards } from "@/components/project-metric-cards";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { IconPlus, IconUpload, IconLoader } from "@tabler/icons-react";
import { useGetProjectQuery } from '@/features/projects/projectApiSlice';
import { useListJobsQuery } from '@/features/jobs/jobApiSlice';
import { ProjectUpdateForm } from '@/features/projects/components/ProjectUpdateForm';
import { TeamManagement } from '@/features/projects/components/TeamManagement';
import { Button } from "@/components/shadcn/button";
import { JobCreationModal } from "@/components/JobCreationModal";

// Placeholder for loading state
const LoadingOverlay = () => (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <IconLoader className="h-10 w-10 animate-spin text-primary" />
  </div>
);

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const [jobsPagination, setJobsPagination] = useState({ limit: 10, offset: 0 });
  const [isJobCreateModalOpen, setIsJobCreateModalOpen] = useState(false);

  // Fetch project data
  const { data: project, isLoading: isLoadingProject, isError: isErrorProject, error: projectError } = useGetProjectQuery(projectId, {
    skip: !projectId,
  });

  // Fetch jobs data for this project
  const { data: jobsData, isLoading: isLoadingJobs, isError: isErrorJobs, error: jobsError } = useListJobsQuery({ 
    projectId, 
    params: { limit: jobsPagination.limit, offset: jobsPagination.offset } 
  }, {
    skip: !projectId,
  });

  // Early return for invalid projectId
  if (!projectId) {
    return <div>Invalid Project ID</div>;
  }

  const isLoading = isLoadingProject || isLoadingJobs;

  // --- Pagination Handlers for Jobs ---
  const handleJobsNextPage = () => {
    if (jobsData && (jobsPagination.offset + jobsPagination.limit < jobsData.total)) {
      setJobsPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
    }
  };

  const handleJobsPrevPage = () => {
    setJobsPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
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
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 md:p-6 space-y-6 relative">
          {isLoading && <LoadingOverlay />}
          
          {isErrorProject && (
            <div className="text-center text-red-500 py-10">
              Error loading project details. Please try again later.
            </div>
          )}

          {!isLoading && !isErrorProject && !project && (
            <div className="text-center text-muted-foreground py-10">
              Project not found.
            </div>
          )}

          {!isErrorProject && project && (
            <>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <ProjectMetricCards
                storageUsed={project.storage?.usedStorageBytes ? (project.storage.usedStorageBytes / (1024**3)).toFixed(2) + ' GB' : 'N/A'}
                storageRemaining={'N/A'}
                storageTotal={project.settings?.maxStorageGB ? `${project.settings.maxStorageGB} GB` : 'N/A'}
                creditsUsed={0}
                creditsRemaining={0}
                creditsTotal={0}
                activeJobs={0}
                datasets={0}
              />
    
              {/* Jobs Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                   <CardTitle>Data Generation Jobs</CardTitle>
                   <Button size="sm" onClick={() => setIsJobCreateModalOpen(true)}>
                       <IconPlus className="mr-2 h-4 w-4" /> Create Job
                    </Button>
                 </CardHeader>
                 <CardContent>
                   {isErrorJobs && <div className="text-red-500">Error loading jobs.</div>}
                   <JobsTable 
                     data={jobsData?.jobs || []}
          />
                   {!isErrorJobs && jobsData && jobsData.total > 0 && (
                     <div className="flex items-center justify-end space-x-2 pt-4">
                        <div className="flex-1 text-sm text-muted-foreground">
                          Showing {jobsPagination.offset + 1}-
                          {Math.min(jobsPagination.offset + jobsPagination.limit, jobsData.total)} of {jobsData.total} jobs
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleJobsPrevPage}
                          disabled={jobsPagination.offset === 0}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleJobsNextPage}
                          disabled={jobsPagination.offset + jobsPagination.limit >= jobsData.total}
                        >
                          Next
                        </Button>
          </div>
                   )}
                 </CardContent>
              </Card>
    
              {/* Datasets Section */}
              <Card>
                 <CardHeader className="flex flex-row items-center justify-between">
                   <CardTitle>Generated Datasets</CardTitle>
                   <Button size="sm" disabled> 
                       <IconUpload className="mr-2 h-4 w-4" /> Upload Dataset
                    </Button>
                 </CardHeader>
                 <CardContent>
                    <DatasetsTable data={[]} />
                 </CardContent>
              </Card>
              
               {/* Team Management Section */}
               <Card>
                 <CardHeader>
                   <CardTitle>Team Members</CardTitle>
                   <CardDescription>Manage who has access to this project.</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <TeamManagement project={project} />
                 </CardContent>
               </Card>

               {/* Update Project Section */}
               <Card>
                 <CardHeader>
                   <CardTitle>Project Settings</CardTitle>
                   <CardDescription>Modify project name, description, settings, or status.</CardDescription>
                 </CardHeader>
                 <CardContent>
                   <ProjectUpdateForm project={project} />
                 </CardContent>
               </Card>
            </>
          )}
        </div>
      </SidebarInset>
      
      {projectId && (
        <JobCreationModal
          projectId={projectId}
          isOpen={isJobCreateModalOpen}
          onOpenChange={setIsJobCreateModalOpen}
        />
      )}
    </SidebarProvider>
  );
} 