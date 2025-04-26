'use client'

import * as React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/shadcn/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
// Import the updated table components
import { JobsTable } from "@/components/jobs-table";
import { DatasetsTable } from "@/components/datasets-table";
import { Separator } from "@/components/shadcn/separator";
import { ProjectMetricCards } from "@/components/project-metric-cards";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { IconPlus, IconUpload } from "@tabler/icons-react";

// Define mock data structures
type Job = {
  id: number;
  name: string;
  status: "Active" | "Archived" | "Error";
  createdDate: string;
  duration: string;
  projectId: number;
};

type Dataset = {
  id: number;
  name: string;
  type: string;
  rowCount: number;
  size: string;
  createdDate: string;
  projectId: number;
};

// Mock Data (Ensure IDs and project IDs match)
const mockJobs: Job[] = [
  { id: 101, name: "Generate User Profiles", status: "Active", createdDate: "2024-07-28", duration: "15m 30s", projectId: 1 },
  { id: 102, name: "Anonymize Churn Data", status: "Archived", createdDate: "2024-07-27", duration: "1h 02m", projectId: 1 },
  { id: 103, name: "Simulate Transactions", status: "Error", createdDate: "2024-07-26", duration: "5m 10s", projectId: 1 },
  { id: 201, name: "Generate Product Interactions", status: "Active", createdDate: "2024-07-28", duration: "25m 00s", projectId: 2 },
];

const mockDatasets: Dataset[] = [
  { id: 301, name: "user_profiles_synthesized.csv", type: "CSV", rowCount: 10000, size: "150 MB", createdDate: "2024-07-28", projectId: 1 },
  { id: 302, name: "churn_data_anonymized.parquet", type: "Parquet", rowCount: 50000, size: "1.1 GB", createdDate: "2024-07-27", projectId: 1 },
  { id: 401, name: "product_interactions_batch1.jsonl", type: "JSONL", rowCount: 100000, size: "450 MB", createdDate: "2024-07-28", projectId: 2 },
];

// Mock project details (replace with actual fetching later)
const mockProjectDetails = {
  1: { name: "Customer Churn Analysis", storageUsed: "1.25 GB", storageRemaining: "8.75 GB", storageTotal: "10 GB", activeJobs: 1, datasets: 2, creditsUsed: 125, creditsRemaining: 875, creditsTotal: 1000 },
  2: { name: "Synthetic User Profiles", storageUsed: "450 MB", storageRemaining: "4.55 GB", storageTotal: "5 GB", activeJobs: 1, datasets: 1, creditsUsed: 50, creditsRemaining: 450, creditsTotal: 500 },
  // Add more projects as needed
}

interface ProjectManagementPageProps {
  params: {
    projectId: string;
  };
}

export default function ProjectManagementPage({ params }: ProjectManagementPageProps) {
  const projectId = parseInt(params.projectId, 10);
  const project = mockProjectDetails[projectId as keyof typeof mockProjectDetails];

  const projectJobs = mockJobs.filter(job => job.projectId === projectId);
  const projectDatasets = mockDatasets.filter(dataset => dataset.projectId === projectId);

  // Placeholder Handlers
  const handleCreateJob = () => {
    console.log("Create Job clicked for project:", projectId);
  }
  const handleUploadDataset = () => {
    console.log("Upload Dataset clicked for project:", projectId);
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  // --- Create Action Buttons --- //
  const createJobButton = (
    <HoverBorderGradient
        containerClassName="rounded-md"
        as="button"
        onClick={handleCreateJob}
        className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-1 h-8 px-3 text-xs"
      >
        <IconPlus className="h-3.5 w-3.5" />
        <span>Create Job</span>
    </HoverBorderGradient>
  );

  const uploadDatasetButton = (
    <HoverBorderGradient
        containerClassName="rounded-md"
        as="button"
        onClick={handleUploadDataset}
        className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-1 h-8 px-3 text-xs"
    >
      <IconUpload className="h-3.5 w-3.5" />
      <span>Upload Dataset</span>
    </HoverBorderGradient>
  );

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
        <div className="flex flex-1 flex-col p-4 md:p-6 space-y-6">
          <h1 className="text-2xl font-semibold">{project.name}</h1>

          <ProjectMetricCards
            storageUsed={project.storageUsed}
            storageRemaining={project.storageRemaining}
            storageTotal={project.storageTotal}
            creditsUsed={project.creditsUsed}
            creditsRemaining={project.creditsRemaining}
            creditsTotal={project.creditsTotal}
            activeJobs={project.activeJobs}
            datasets={project.datasets}
          />

          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Data Generation Jobs</h2>
            <JobsTable data={projectJobs} actionButton={createJobButton} />
          </div>

          <Separator />

          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Generated Datasets</h2>
            <DatasetsTable data={projectDatasets} actionButton={uploadDatasetButton} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 