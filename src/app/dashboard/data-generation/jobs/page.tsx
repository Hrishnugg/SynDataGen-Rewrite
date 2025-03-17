'use client';

/**
 * Jobs List Page
 * 
 * Page for viewing and managing all data generation jobs.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, RefreshCw, Search, Filter } from 'lucide-react';
import { JobHistoryTable } from '@/components/data-generation/job-management/job-history-table';
import { JobStatus, JobDetails } from '@/lib/models/data-generation/types';
import { toast } from '@/components/ui/use-toast';
import { dataGenerationClient } from '@/features/data-generation/services/client';

// Define the JobStatusValue type directly since we can't import it
type JobStatusValue = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'pending' | 'accepted' | 'rejected';

// Mock data for development - not used anymore
const mockJobs = Array(20).fill(0).map((_, i) => ({
  id: `job-${i}`,
  name: `Job ${i}`,
  status: ['completed', 'in_progress', 'queued', 'failed', 'cancelled'][Math.floor(Math.random() * 5)] as JobStatusValue,
  progress: Math.floor(Math.random() * 100),
  recordsGenerated: Math.floor(Math.random() * 10000),
  createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
  completedAt: Math.random() > 0.5 ? new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000).toISOString() : null,
  schema: { type: 'object', properties: {} },
  config: { count: Math.floor(Math.random() * 10000) + 1000 }
}));

export default function JobsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<JobDetails[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10,
    itemsPerPage: 10,
  });
  const [filters, setFilters] = useState<{
    status?: JobStatusValue;
    startDate?: Date;
    endDate?: Date;
  }>({});
  const [showEmptyState, setShowEmptyState] = useState(false);
  
  // Fetch jobs on component mount and when pagination/filters change
  useEffect(() => {
    fetchJobs();
  }, [pagination.currentPage, filters]);
  
  // Fetch jobs
  const fetchJobs = async () => {
    setIsLoading(true);
    
    try {
      // API call would normally go here:
      // const offset = (pagination.currentPage - 1) * pagination.pageSize;
      // const fetchedJobs = await dataGenerationClient.getJobHistory({
      //   limit: pagination.pageSize,
      //   offset,
      //   ...filters,
      // });
      
      // Instead of using mock data, return empty array to simulate no jobs
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
      const fetchedJobs: JobDetails[] = [];
      
      setJobs(fetchedJobs);
      setShowEmptyState(true);
      
      // Set pagination info with no items
      setPagination(prev => ({
        ...prev,
        totalItems: 0,
        totalPages: 1,
      }));
    } catch (error) {
      toast({
        title: 'Error loading jobs',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setPagination(prev => ({
      ...prev,
      currentPage: page,
    }));
  };
  
  // Handle filter change
  const handleFilterChange = (newFilters: {
    status?: JobStatusValue;
    startDate?: Date;
    endDate?: Date;
  }) => {
    setFilters(newFilters);
    setPagination(prev => ({
      ...prev,
      currentPage: 1, // Reset to first page when filters change
    }));
  };
  
  // Handle job cancellation
  const handleCancelJob = async (jobId: string) => {
    try {
      await dataGenerationClient.cancelJob(jobId);
      
      // Refresh job list
      fetchJobs();
      
      toast({
        title: 'Job cancelled',
        description: `Job ${jobId.slice(0, 8)} has been cancelled.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to cancel job',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Handle job resumption
  const handleResumeJob = async (jobId: string) => {
    try {
      await dataGenerationClient.resumeJob(jobId);
      
      // Refresh job list
      fetchJobs();
      
      toast({
        title: 'Job resumed',
        description: `Job ${jobId.slice(0, 8)} has been resumed.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to resume job',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Navigate to job details
  const handleViewJob = (jobId: string) => {
    router.push(`/dashboard/data-generation/jobs/${jobId}`);
  };
  
  // Navigate to job creation
  const handleCreateJob = () => {
    router.push('/dashboard/data-generation/create');
  };
  
  // Navigate to job download
  const handleDownloadJob = (jobId: string) => {
    router.push(`/dashboard/data-generation/jobs/${jobId}/download`);
  };
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Job History</h1>
        
        <Button
          onClick={handleCreateJob}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          <span>Create Job</span>
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
            <p>Loading jobs...</p>
          </div>
        </div>
      ) : showEmptyState ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No Jobs Found</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-xl mx-auto">
            You haven't created any data generation jobs yet. Create your first job to get started with synthetic data generation.
          </p>
          <Button 
            onClick={handleCreateJob} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Your First Job
          </Button>
        </div>
      ) : (
        <JobHistoryTable
          jobs={jobs}
          isLoading={isLoading}
          onView={handleViewJob}
          onCancel={handleCancelJob}
          onResume={handleResumeJob}
          onDownload={handleDownloadJob}
          onPageChange={handlePageChange}
          onFilterChange={handleFilterChange}
          pagination={pagination}
        />
      )}
    </div>
  );
} 