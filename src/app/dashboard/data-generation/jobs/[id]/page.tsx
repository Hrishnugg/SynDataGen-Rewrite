'use client';

/**
 * Job Details Page
 * 
 * Page for viewing detailed information about a specific data generation job.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/ui-card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Play, Square, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/data-generation/data-viewer/data-table';
import { DataRetentionIndicator } from '@/components/data-generation/job-management/data-retention-indicator';
import { JobStatus, JobDetails } from '@/lib/models/data-generation/types';
import { toast } from '@/components/ui/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

// Mock data for development
const mockJobDetails: JobDetails = {
  id: 'job-123',
  name: 'Customer Data Generation',
  status: 'completed' as JobStatus,
  progress: 100,
  recordsGenerated: 10000,
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  completedAt: new Date().toISOString(),
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', faker: 'name.fullName' },
      email: { type: 'string', format: 'email' },
      age: { type: 'integer', minimum: 18, maximum: 100 },
      address: {
        type: 'object',
        properties: {
          street: { type: 'string', faker: 'address.streetAddress' },
          city: { type: 'string', faker: 'address.city' },
          state: { type: 'string', faker: 'address.state' },
          zipCode: { type: 'string', faker: 'address.zipCode' }
        }
      }
    },
    required: ['id', 'name', 'email']
  },
  config: { 
    count: 10000,
    format: 'json',
    seed: 12345,
    locale: 'en_US',
    includeErrors: false,
    errorRate: 0
  },
  retentionPeriod: {
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    canExtend: true
  }
};

const mockPreviewData = Array(100).fill(0).map((_, i) => ({
  id: `user-${i}`,
  name: `User ${i}`,
  email: `user${i}@example.com`,
  age: 20 + Math.floor(Math.random() * 50),
  address: {
    street: `${100 + i} Main St`,
    city: 'Anytown',
    state: 'CA',
    zipCode: '90210'
  }
}));

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch job details on component mount
  useEffect(() => {
    fetchJobDetails();
  }, [params.id]);
  
  // Fetch job details
  const fetchJobDetails = async () => {
    setIsLoading(true);
    
    try {
      const details = await dataGenerationClient.getJobDetails(params.id);
      setJobDetails(details);
      
      // Fetch preview data if job is completed
      if (details.status === 'completed') {
        fetchPreviewData();
      }
    } catch (error) {
      toast({
        title: 'Error loading job details',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch preview data
  const fetchPreviewData = async () => {
    try {
      const data = await dataGenerationClient.getJobPreviewData(params.id);
      
      if (data && data.length > 0) {
        // Extract column definitions from the first row
        const columns = Object.keys(data[0]).map(key => ({
          accessorKey: key,
          header: key,
        }));
        
        setPreviewColumns(columns);
        setPreviewData(data);
      }
    } catch (error) {
      toast({
        title: 'Error loading preview data',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Handle job cancellation
  const handleCancelJob = async () => {
    try {
      await dataGenerationClient.cancelJob(params.id);
      
      // Refresh job details
      fetchJobDetails();
      
      toast({
        title: 'Job cancelled',
        description: `Job ${params.id.slice(0, 8)} has been cancelled.`,
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
  const handleResumeJob = async () => {
    try {
      await dataGenerationClient.resumeJob(params.id);
      
      // Refresh job details
      fetchJobDetails();
      
      toast({
        title: 'Job resumed',
        description: `Job ${params.id.slice(0, 8)} has been resumed.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to resume job',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Navigate to job download
  const handleDownloadJob = () => {
    router.push(`/dashboard/data-generation/jobs/${params.id}/download`);
  };
  
  // Navigate back to jobs list
  const handleBackToJobs = () => {
    router.push('/dashboard/data-generation/jobs');
  };
  
  // Handle extending retention period
  const handleExtendRetention = async () => {
    if (!jobDetails) return;
    
    try {
      await dataGenerationClient.extendJobRetention(params.id);
      
      // Refresh job details
      fetchJobDetails();
      
      toast({
        title: 'Retention period extended',
        description: 'The data retention period for this job has been extended.',
      });
    } catch (error) {
      toast({
        title: 'Failed to extend retention period',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Handle requesting early deletion
  const handleRequestEarlyDeletion = async () => {
    if (!jobDetails) return;
    
    try {
      await dataGenerationClient.requestEarlyDeletion(params.id);
      
      // Refresh job details
      fetchJobDetails();
      
      toast({
        title: 'Early deletion requested',
        description: 'Your request for early deletion has been submitted.',
      });
    } catch (error) {
      toast({
        title: 'Failed to request early deletion',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Get status badge color
  const getStatusColor = (status: JobStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-yellow-500';
      case 'running':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Format date
  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    return format(dateObj, 'PPpp');
  };
  
  // Format relative time
  const formatRelativeTime = (date: string) => {
    const dateObj = new Date(date);
    return formatDistanceToNow(dateObj, { addSuffix: true });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (!jobDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-2xl font-bold">Job not found</h2>
        <p className="text-gray-500">The requested job could not be found.</p>
        <Button onClick={handleBackToJobs}>Back to Jobs</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToJobs}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Job Details</h1>
          <Badge className={getStatusColor(jobDetails.status)}>
            {jobDetails.status.charAt(0).toUpperCase() + jobDetails.status.slice(1)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {jobDetails.status === 'running' && (
            <Button
              variant="destructive"
              onClick={handleCancelJob}
              className="flex items-center gap-1"
            >
              <Square className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          )}
          
          {jobDetails.status === 'paused' && (
            <Button
              variant="default"
              onClick={handleResumeJob}
              className="flex items-center gap-1"
            >
              <Play className="h-4 w-4" />
              <span>Resume</span>
            </Button>
          )}
          
          {jobDetails.status === 'completed' && (
            <Button
              variant="default"
              onClick={handleDownloadJob}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </Button>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger 
            value="preview" 
            disabled={jobDetails.status !== 'completed'}
          >
            Data Preview
          </TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Summary</CardTitle>
              <CardDescription>Overview of the data generation job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Job ID</h3>
                  <p className="text-base font-medium">{params.id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="text-base font-medium">{jobDetails.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(jobDetails.status)}>
                      {jobDetails.status.charAt(0).toUpperCase() + jobDetails.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Progress</h3>
                  <p className="text-base font-medium">{jobDetails.progress}%</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p className="text-base font-medium">
                    {formatDate(jobDetails.createdAt)}
                    <span className="text-sm text-gray-500 ml-2">
                      ({formatRelativeTime(jobDetails.createdAt)})
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                  <p className="text-base font-medium">
                    {formatDate(jobDetails.updatedAt)}
                    <span className="text-sm text-gray-500 ml-2">
                      ({formatRelativeTime(jobDetails.updatedAt)})
                    </span>
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Records Generated</h3>
                  <p className="text-base font-medium">{jobDetails.recordsGenerated.toLocaleString()} / {jobDetails.targetRecords.toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Output Format</h3>
                  <p className="text-base font-medium">{jobDetails.outputFormat}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-base">{jobDetails.description || 'No description provided.'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Configuration</CardTitle>
              <CardDescription>Detailed configuration settings for this job</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                {JSON.stringify(jobDetails.configuration, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>Preview of the generated data (first 100 records)</CardDescription>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <DataTable
                  data={previewData}
                  columns={previewColumns}
                  pagination={{
                    pageSize: 10,
                    pageIndex: 0,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">No preview data available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Logs</CardTitle>
              <CardDescription>Execution logs for this job</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm overflow-auto max-h-96">
                {jobDetails.logs && jobDetails.logs.length > 0 ? (
                  jobDetails.logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                    </div>
                  ))
                ) : (
                  <p>No logs available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="retention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Policy</CardTitle>
              <CardDescription>Information about when this job's data will be deleted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    According to our data retention policy, job data is automatically deleted after a specified period.
                    You can request an extension or early deletion if needed.
                  </p>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">Default Retention Period</h3>
                    <p className="text-base font-medium">180 days (6 months)</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-500">What Gets Deleted</h3>
                    <ul className="list-disc pl-5 text-sm">
                      <li>Generated data files</li>
                      <li>Job configuration</li>
                      <li>Job logs and metadata</li>
                      <li>Preview data</li>
                    </ul>
                  </div>
                </div>
                
                <DataRetentionIndicator
                  createdAt={jobDetails.createdAt}
                  expirationDate={jobDetails.metadata?.expirationDate}
                  retentionPeriodDays={180} // Default 6 months (180 days)
                  onExtendRetention={handleExtendRetention}
                  onRequestEarlyDeletion={handleRequestEarlyDeletion}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 