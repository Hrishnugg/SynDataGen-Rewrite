'use client'

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/shadcn/sidebar"
import React from "react"
import { ProjectJobsTable, type projectJobSchema } from "@/components/ProjectJobsTable"
import type { z } from "zod"

// Define Job type based on the schema from the table component
type Job = z.infer<typeof projectJobSchema>

// Mock Job Type Definition (based on core.Job)
// type MockJob = { ... } // No longer needed here

// Placeholder for the main Job Management component
function JobsPageContent({ projectId }: { projectId: string }) {
  // TODO: Fetch actual job data for the projectId using react-query or similar

  // Mock Data based on core.Job structure - now uses the imported Job type
  const mockJobs: Job[] = [
    {
      ID: "job-uuid-1",
      ProjectID: projectId,
      UserID: "user-abc",
      Status: "completed",
      JobType: "csv",
      JobConfig: JSON.stringify({ rows: 10000, schema: [{ name: "col1", type: "string" }] }),
      CreatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      UpdatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      PipelineJobID: "pipe-1",
      StartedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      CompletedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      ResultURI: "/results/project/job-1/data.csv",
    },
    {
      ID: "job-uuid-2",
      ProjectID: projectId,
      UserID: "user-xyz",
      Status: "running",
      JobType: "json",
      JobConfig: JSON.stringify({ rows: 500, schema: [{ name: "user_id", type: "int" }] }),
      CreatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
      UpdatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
      PipelineJobID: "pipe-2",
      StartedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      ID: "job-uuid-3",
      ProjectID: projectId,
      UserID: "user-abc",
      Status: "failed",
      JobType: "sql",
      JobConfig: JSON.stringify({ table: "users", connection: "db1" }),
      CreatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
      UpdatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      PipelineJobID: "pipe-3",
      StartedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      CompletedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      Error: "Database connection timeout: Could not connect to db1 after 3 retries.",
    },
    {
      ID: "job-uuid-4",
      ProjectID: projectId,
      UserID: "user-xyz",
      Status: "pending",
      JobType: "csv",
      JobConfig: JSON.stringify({ rows: 100, schema: [{ name: "product_id", type: "uuid" }] }),
      CreatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
      UpdatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
        ID: "job-uuid-5",
        ProjectID: projectId,
        UserID: "user-abc",
        Status: "cancelled",
        JobType: "json",
        JobConfig: JSON.stringify({ rows: 2000 }),
        CreatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        UpdatedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 23 hours ago
        PipelineJobID: "pipe-5",
        StartedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        CompletedAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
        Error: "Cancelled by user before submission",
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      {/* Use container query for responsive layout */}
      <div className="@container/main flex flex-1 flex-col">
        {/* Consistent padding and spacing */}
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
           {/* Page Header */}
           <div>
            <h1 className="text-2xl font-semibold">Job Management</h1>
            <p className="text-muted-foreground">
              View and manage data generation jobs for project: {projectId}
            </p>
           </div>

            {/* Integrate the new ProjectJobsTable component, passing projectId */}
            <ProjectJobsTable data={mockJobs} projectId={projectId} />

            {/* JobDetailsModal is now rendered inside ProjectJobsTable */}
            {/* JobCreationModal is now rendered inside ProjectJobsTable */}
        </div>
      </div>
    </div>
  )
}

// Helper functions getBadgeVariant, formatDateTime, formatDurationOrUpdate removed - they live in ProjectJobsTable.tsx now

// --- Default Page Export ---
export default function Page({ params }: { params: { projectId: string } }) {
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
        {/* Pass projectId to the content component */}
        <JobsPageContent projectId={params.projectId} />
      </SidebarInset>
    </SidebarProvider>
  )
} 