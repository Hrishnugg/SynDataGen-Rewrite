'use client';

/**
 * Jobs List Page
 * 
 * Page for viewing and managing all data generation jobs.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/ui-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, RefreshCw, Search, Filter } from 'lucide-react';
import { JobHistoryTable } from '@/components/data-generation/job-management/job-history-table';
import { JobStatus } from '@/lib/models/data-generation/types';
import { toast } from '@/components/ui/use-toast';

// Mock data for development
const mockJobs = Array(20).fill(0).map((_, i) => ({
  id: `job-${i}`,
  name: `Job ${i}`,
  status: ['completed', 'in_progress', 'queued', 'failed', 'cancelled'][Math.floor(Math.random() * 5)] as JobStatus,
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
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10,
  });
  const [filters, setFilters] = useState<{
    status?: JobStatus['status'];
    startDate?: Date;
    endDate?: Date;
  }>({});
  
  // Fetch jobs on component mount and when pagination/filters change
  useEffect(() => {
    fetchJobs();
  }, [pagination.currentPage, filters]);
  
  // Fetch jobs
  const fetchJobs = async () => {
    setIsLoading(true);
    
    try {
      const offset = (pagination.currentPage - 1) * pagination.pageSize;
      
      const fetchedJobs = await dataGenerationClient.getJobHistory({
        limit: pagination.pageSize,
        offset,
        ...filters,
      });
      
      setJobs(fetchedJobs);
      
      // For simplicity, we're assuming the total count is 100
      // In a real implementation, this would come from the API
      setPagination(prev => ({
        ...prev,
        totalItems: 100,
        totalPages: Math.ceil(100 / prev.pageSize),
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
    status?: JobStatus['status'];
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
    </div>
  );
} 