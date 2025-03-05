'use client';

/**
 * Data Generation Dashboard Page
 * 
 * Main dashboard for data generation, showing job statistics, recent jobs,
 * and rate limit information.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { JobStatusCard } from '@/components/data-generation/job-management/job-status-card';
import { JobSummaryStats } from '@/components/data-generation/dashboard/job-summary-stats';
import { RateLimitIndicator } from '@/components/data-generation/dashboard/rate-limit-indicator';
import { Separator } from '@/components/ui/separator';
import { JobStatus, RateLimitStatus } from '@/lib/models/data-generation/types';
import { toast } from '@/components/ui/use-toast';

// Mock data for development
const mockJobs = [
  {
    id: 'job-1',
    name: 'Customer Data Generation',
    status: 'completed' as JobStatus,
    progress: 100,
    recordsGenerated: 10000,
    dataSize: 2048000,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date().toISOString(),
    schema: { type: 'object', properties: {} },
    config: { count: 10000 }
  },
  {
    id: 'job-2',
    name: 'Product Catalog',
    status: 'in_progress' as JobStatus,
    progress: 45,
    recordsGenerated: 4500,
    dataSize: 1024000,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: null,
    schema: { type: 'object', properties: {} },
    config: { count: 10000 }
  },
  {
    id: 'job-3',
    name: 'Transaction History',
    status: 'queued' as JobStatus,
    progress: 0,
    recordsGenerated: 0,
    dataSize: 0,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    completedAt: null,
    schema: { type: 'object', properties: {} },
    config: { count: 5000 }
  },
  {
    id: 'job-4',
    name: 'User Profiles',
    status: 'failed' as JobStatus,
    progress: 23,
    recordsGenerated: 1150,
    dataSize: 512000,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 5400000).toISOString(),
    schema: { type: 'object', properties: {} },
    config: { count: 5000 },
    error: 'Schema validation failed'
  }
];

const mockRateLimitStatus: RateLimitStatus = {
  currentUsage: 75000,
  limit: 100000,
  resetTime: new Date(Date.now() + 86400000).toISOString()
};

export default function DataGenerationDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [recentJobs, setRecentJobs] = useState(mockJobs);
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>(mockRateLimitStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, these would be API calls
      // const jobsResponse = await fetch('/api/data-generation/jobs/recent');
      // const rateLimitResponse = await fetch('/api/data-generation/rate-limit');
      
      // const jobs = await jobsResponse.json();
      // const rateLimit = await rateLimitResponse.json();
      
      setRecentJobs(mockJobs);
      setRateLimitStatus(mockRateLimitStatus);
    } catch (error) {
      toast({
        title: 'Error loading dashboard',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };
  
  // Handle job cancellation
  const handleCancelJob = async (jobId: string) => {
    // In a real implementation, this would call the API to cancel the job
    console.log(`Cancelling job ${jobId}`);
    // Update the local state to reflect the cancellation
    setRecentJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, status: 'cancelled' as JobStatus } : job
      )
    );
  };
  
  // Handle job resumption
  const handleResumeJob = async (jobId: string) => {
    // In a real implementation, this would call the API to resume the job
    console.log(`Resuming job ${jobId}`);
    // Update the local state to reflect the resumption
    setRecentJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId ? { ...job, status: 'in_progress' as JobStatus } : job
      )
    );
  };
  
  // Navigate to job details
  const handleViewJob = (jobId: string) => {
    // Navigate to the job details page
    router.push(`/dashboard/data-generation/jobs/${jobId}`);
  };
  
  // Navigate to job creation
  const handleCreateJob = () => {
    // Navigate to the job creation page
    router.push('/dashboard/data-generation/create');
  };
  
  // Navigate to job download
  const handleDownloadData = (jobId: string) => {
    // Navigate to the data download page
    router.push(`/dashboard/data-generation/jobs/${jobId}/download`);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Generation Dashboard</h1>
        <div className="flex space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateJob}>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>
      </div>
      
      {/* Dashboard stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <JobSummaryStats jobs={recentJobs} isLoading={isLoading} />
        <RateLimitIndicator status={rateLimitStatus} isLoading={isLoading} />
      </div>
      
      {/* Recent jobs */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Recent Jobs</h2>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-8 bg-muted rounded-lg">
              <p className="text-muted-foreground">No jobs found. Create your first job to get started.</p>
              <Button onClick={handleCreateJob} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Job
              </Button>
            </div>
          ) : (
            recentJobs.map(job => (
              <JobStatusCard
                key={job.id}
                job={job}
                onCancel={() => handleCancelJob(job.id)}
                onResume={() => handleResumeJob(job.id)}
                onView={() => handleViewJob(job.id)}
                onDownload={() => handleDownloadData(job.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
} 