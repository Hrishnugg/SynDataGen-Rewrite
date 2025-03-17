"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Define job data type
type Job = {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  createdAt: string;
  completedAt?: string;
  projectId: string;
  recordCount: number;
};

// Define row type for type safety
interface JobRow {
  original: Job;
  getValue: (key: string) => any;
}

// Define columns for job table
const columns = [
  {
    accessorKey: "name",
    header: "Job Name",
    cell: ({ row }: { row: JobRow }) => (
      <Link 
        href={`/dashboard/data-generation/jobs/${row.original.id}`} 
        className="font-medium text-primary hover:underline"
      >
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: JobRow }) => {
      const status = row.getValue("status") as string;
      
      return (
        <Badge 
          variant={
            status === "completed" 
              ? "success" 
              : status === "running" 
              ? "default" 
              : status === "pending"
              ? "outline"
              : status === "cancelled"
              ? "secondary"
              : "destructive"
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }: { row: JobRow }) => {
      const progress = row.getValue("progress") as number;
      return (
        <div className="w-full bg-muted rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      );
    },
  },
  {
    accessorKey: "recordCount",
    header: "Records",
    cell: ({ row }: { row: JobRow }) => {
      return new Intl.NumberFormat().format(row.getValue("recordCount"));
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }: { row: JobRow }) => {
      const date = new Date(row.getValue("createdAt"));
      return date.toLocaleString();
    },
  }
];

interface ProjectJobsProps {
  projectId: string;
}

export default function ProjectJobs({ projectId }: ProjectJobsProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}/jobs`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setError(`Error fetching jobs: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to load jobs", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [projectId]);

  const handleCreateJob = () => {
    // Navigate to create job page with project ID
    window.location.href = `/dashboard/data-generation/create?projectId=${projectId}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Jobs</CardTitle>
        <Button onClick={handleCreateJob}>
          <Plus className="mr-2 h-4 w-4" /> Create New Job
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No jobs found for this project</p>
            <Button onClick={handleCreateJob}>
              <Plus className="mr-2 h-4 w-4" /> Create your first job
            </Button>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={jobs}
            filterColumn="name"
            filterPlaceholder="Filter jobs..."
          />
        )}
      </CardContent>
    </Card>
  );
}