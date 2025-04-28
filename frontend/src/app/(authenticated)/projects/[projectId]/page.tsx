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
import { useGetProjectQuery, useListDatasetsQuery } from '@/features/projects/projectApiSlice';
import { useListJobsQuery } from '@/features/jobs/jobApiSlice';
import { ProjectUpdateForm } from '@/features/projects/components/ProjectUpdateForm';
import { TeamManagement } from '@/features/projects/components/TeamManagement';
import { Button } from "@/components/shadcn/button";
import { JobCreationModal } from "@/components/JobCreationModal";
import { DatasetUploadModal } from "@/components/DatasetUploadModal";

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
  const [isDatasetUploadModalOpen, setIsDatasetUploadModalOpen] = useState(false);

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

  // Fetch datasets data for this project
  const { 
    data: datasetsData, 
    isLoading: isLoadingDatasets, 
    isError: isErrorDatasets, 
    error: datasetsError 
  } = useListDatasetsQuery(projectId, {
    skip: !projectId, // Skip if projectId is not yet available
  });

  // Early return for invalid projectId
  if (!projectId) {
    return <div>Invalid Project ID</div>;
  }

  const isLoading = isLoadingProject || isLoadingJobs || isLoadingDatasets;

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
        <SiteHeader title={projectId ? `Project: ${projectId}` : "Project Detail"} />
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
                <CardHeader>
                   <CardTitle>Data Generation Jobs</CardTitle>
                 </CardHeader>
                 <CardContent>
                   {isErrorJobs && <div className="text-red-500">Error loading jobs.</div>}
                   <JobsTable 
                     data={jobsData?.jobs || []}
                     headerActions={
                       <HoverBorderGradient
                         containerClassName="rounded-md"
                         as="button"
                         onClick={() => setIsJobCreateModalOpen(true)}
                         className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-1 h-9 px-4 text-sm"
                       >
                         <IconPlus className="h-4 w-4 mr-1" />
                         <span>Create Job</span>
                       </HoverBorderGradient>
                     }
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
                 <CardHeader>
                   <CardTitle>Generated Datasets</CardTitle>
                 </CardHeader>
                 <CardContent>
                    {isErrorDatasets && <div className="text-red-500 mb-4">Error loading datasets.</div>} 
                    <DatasetsTable 
                       data={datasetsData || []}
                       headerActions={
                         <HoverBorderGradient
                           containerClassName="rounded-md"
                           as="button"
                           onClick={() => setIsDatasetUploadModalOpen(true)}
                           className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-1 h-9 px-4 text-sm"
                         >
                           <IconUpload className="h-4 w-4 mr-1" />
                           <span>Upload Dataset</span>
                         </HoverBorderGradient>
                       }
                    />
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
      {projectId && (
        <DatasetUploadModal 
          projectId={projectId}
          isOpen={isDatasetUploadModalOpen}
          onOpenChange={setIsDatasetUploadModalOpen}
        />
      )}
    </SidebarProvider>
  );
} 