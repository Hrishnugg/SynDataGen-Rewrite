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
import { Plus, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { JobStatusCard } from '@/components/data-generation/job-management/job-status-card';
import { StatCard, JobSummaryChart } from '@/components/data-generation/dashboard/job-summary-stats';
import { RateLimitIndicator } from '@/components/data-generation/dashboard/rate-limit-indicator';
import { Separator } from '@/components/ui/separator';
import { JobStatus, RateLimitStatus } from '@/lib/models/data-generation/types';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [error, setError] = useState<string | null>(null);
  
  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, these would be API calls
      // const jobsResponse = await fetch('/api/data-generation/jobs/recent');
      // const rateLimitResponse = await fetch('/api/data-generation/rate-limit');
      
      // For now, use mock data
      setRecentJobs(mockJobs);
      setRateLimitStatus(mockRateLimitStatus);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Failed to load data generation dashboard: ${err instanceof Error ? err.message : String(err)}`);
      
      toast({
        variant: 'destructive',
        title: 'Error loading dashboard',
        description: 'There was a problem loading the data generation dashboard. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle refresh button click
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      await fetchDashboardData();
      
      toast({
        title: 'Dashboard refreshed',
        description: 'The data generation dashboard has been refreshed.',
      });
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      setError(`Failed to refresh dashboard: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Navigate to create new job page
  const handleCreateJob = () => {
    router.push('/dashboard/data-generation/create');
  };
  
  // Navigate to job details page
  const handleViewJob = (jobId: string) => {
    router.push(`/dashboard/data-generation/jobs/${jobId}`);
  };
  
  // Calculate job statistics
  const jobStats = {
    total: recentJobs.length,
    completed: recentJobs.filter(job => job.status === 'completed').length,
    inProgress: recentJobs.filter(job => job.status === 'in_progress').length,
    failed: recentJobs.filter(job => job.status === 'failed').length,
    queued: recentJobs.filter(job => job.status === 'queued').length,
    recordsGenerated: recentJobs.reduce((sum, job) => sum + (job.recordsGenerated || 0), 0),
    totalDataSize: recentJobs.reduce((sum, job) => sum + (job.dataSize || 0), 0),
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Data Generation</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateJob}>
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Jobs" 
              value={jobStats.total} 
              icon="total" 
            />
            <StatCard 
              title="Completed" 
              value={jobStats.completed} 
              icon="completed" 
            />
            <StatCard 
              title="In Progress" 
              value={jobStats.inProgress} 
              icon="inProgress" 
            />
            <StatCard 
              title="Failed" 
              value={jobStats.failed} 
              icon="failed" 
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Recent Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentJobs.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No jobs found</p>
                      <Button onClick={handleCreateJob}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Job
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {recentJobs.map(job => (
                        <JobStatusCard 
                          key={job.id} 
                          job={job} 
                          onClick={() => handleViewJob(job.id)} 
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <RateLimitIndicator status={rateLimitStatus} />
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Records Generated</span>
                      <span className="font-medium">{jobStats.recordsGenerated.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Total Data Size</span>
                      <span className="font-medium">{(jobStats.totalDataSize / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 