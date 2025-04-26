'use client'

import * as React from "react"
import { z } from "zod"

// Layout Imports
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/shadcn/sidebar"

// Page Specific Imports
import { JobsTable } from "@/components/jobs-table"
import { ToggleGroup, ToggleGroupItem } from "@/components/shadcn/toggle-group"
import { Separator } from "@/components/shadcn/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shadcn/card"

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

export default function JobsPage() {
  const [filter, setFilter] = React.useState<"all" | "active">("all");

  // Calculate metrics from mock data
  const totalJobs = mockJobs.length;
  const activeJobs = mockJobs.filter((job) => job.status === "Active").length;
  const archivedJobs = mockJobs.filter((job) => job.status === "Archived").length;
  const errorJobs = mockJobs.filter((job) => job.status === "Error").length;

  const filteredJobs = React.useMemo(() => {
    if (filter === "active") {
      return mockJobs.filter((job) => job.status === "Active");
    }
    return mockJobs;
  }, [filter]);

  return (
    <SidebarProvider
       style={{
         "--sidebar-width": "calc(var(--spacing) * 72)",
         "--header-height": "calc(var(--spacing) * 12)",
       } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {/* Wrap existing card content in a flex div like dashboard */}
        <div className="flex flex-1 flex-col p-4 md:p-6">
          {/* Use a Card for consistent styling with other pages potentially */}
          {/* Removed outer Card, place content directly or inside a new container if needed */}
          {/* Title Section */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h1 className="text-2xl font-semibold">Jobs</h1>
            <ToggleGroup
              type="single"
              defaultValue="all"
              value={filter}
              onValueChange={(value: "all" | "active") => {
                if (value) setFilter(value); // Ensure value is not empty before setting
              }}
              aria-label="Filter jobs"
              size="sm"
            >
              <ToggleGroupItem value="all" aria-label="Show all jobs">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="active" aria-label="Show active jobs">
                Active
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Metric Cards Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
             {/* Total Jobs Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Jobs</CardDescription>
                <CardTitle className="text-3xl">{totalJobs}</CardTitle>
              </CardHeader>
            </Card>
            {/* Active Jobs Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active</CardDescription>
                <CardTitle className="text-3xl">{activeJobs}</CardTitle>
              </CardHeader>
            </Card>
            {/* Archived Jobs Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Archived</CardDescription>
                <CardTitle className="text-3xl">{archivedJobs}</CardTitle>
              </CardHeader>
            </Card>
            {/* Error Jobs Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Errors</CardDescription>
                <CardTitle className="text-3xl">{errorJobs}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Jobs Table Section - Render table directly without Card wrapper */}
          <JobsTable data={filteredJobs} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 