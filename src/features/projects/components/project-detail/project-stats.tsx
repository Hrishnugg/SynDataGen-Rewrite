"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Database, HardDrive, Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ProjectStatsProps {
  projectId: string;
}

interface ProjectMetrics {
  apiCreditsUsed: number;
  apiCreditsRemaining: number;
  storageUsed: number;
  storageLimit: number;
  averageJobDuration: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  lastActivity: string;
  estimatedRemainingCapacity: number;
}

export default function ProjectStats({ projectId }: ProjectStatsProps) {
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}/metrics`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      setError(`Error fetching metrics: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to load project metrics", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || "Failed to load metrics"}</AlertDescription>
      </Alert>
    );
  }

  // Calculate percentages for progress bars
  const apiUsagePercent = (metrics.apiCreditsUsed / (metrics.apiCreditsUsed + metrics.apiCreditsRemaining)) * 100;
  const storageUsagePercent = (metrics.storageUsed / metrics.storageLimit) * 100;
  const jobSuccessPercent = (metrics.completedJobs / metrics.totalJobs) * 100 || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* API Credits Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">API Credits</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat().format(metrics.apiCreditsRemaining)}
          </div>
          <p className="text-xs text-muted-foreground">
            remaining out of {new Intl.NumberFormat().format(metrics.apiCreditsUsed + metrics.apiCreditsRemaining)}
          </p>
          <Progress 
            value={apiUsagePercent} 
            className="h-2 mt-3" 
            indicatorClassName={apiUsagePercent > 90 ? "bg-destructive" : apiUsagePercent > 70 ? "bg-warning" : undefined}
          />
        </CardContent>
      </Card>

      {/* Storage Used Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(metrics.storageUsed / 1024).toFixed(2)} GB
          </div>
          <p className="text-xs text-muted-foreground">
            of {(metrics.storageLimit / 1024).toFixed(2)} GB limit
          </p>
          <Progress 
            value={storageUsagePercent} 
            className="h-2 mt-3"
            indicatorClassName={storageUsagePercent > 90 ? "bg-destructive" : storageUsagePercent > 70 ? "bg-warning" : undefined}
          />
        </CardContent>
      </Card>

      {/* Job Performance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Job Success Rate</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.completedJobs} / {metrics.totalJobs}
          </div>
          <p className="text-xs text-muted-foreground">
            jobs completed successfully ({Math.round(jobSuccessPercent)}%)
          </p>
          <Progress 
            value={jobSuccessPercent} 
            className="h-2 mt-3" 
            indicatorClassName={jobSuccessPercent < 50 ? "bg-destructive" : jobSuccessPercent < 80 ? "bg-warning" : undefined}
          />
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle>Project Statistics</CardTitle>
          <CardDescription>Detailed statistics about this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Average Job Duration</h4>
              <p className="text-lg font-medium">{(metrics.averageJobDuration / 60).toFixed(2)} minutes</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Activity</h4>
              <p className="text-lg font-medium">{new Date(metrics.lastActivity).toLocaleString()}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Failed Jobs</h4>
              <p className="text-lg font-medium">{metrics.failedJobs}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Estimated Remaining Capacity</h4>
              <p className="text-lg font-medium">{new Intl.NumberFormat().format(metrics.estimatedRemainingCapacity)} records</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacity Planning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Est. Records Remaining</h4>
              <p className="text-2xl font-bold">{new Intl.NumberFormat().format(metrics.estimatedRemainingCapacity)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Recommendation</h4>
              <p className="text-sm">
                {metrics.apiCreditsRemaining < 1000 ? 
                  "Consider purchasing additional API credits soon." : 
                  metrics.storageUsed / metrics.storageLimit > 0.8 ?
                  "Storage capacity is running low. Consider upgrading your plan or archiving old data." :
                  "Current capacity is sufficient for continued operations."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 