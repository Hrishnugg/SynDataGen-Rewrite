'use client';

/**
 * Job Download Page
 * 
 * Page for downloading data from a specific data generation job.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/ui-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, FileJson, FileText, FileSpreadsheet, Database } from 'lucide-react';
import { JobStatus, JobDetails } from '@/lib/models/data-generation/types';
import { toast } from '@/components/ui/use-toast';

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
      age: { type: 'integer', minimum: 18, maximum: 100 }
    }
  },
  config: { 
    count: 10000,
    format: 'json',
    seed: 12345,
    locale: 'en_US'
  }
};

export default function JobDownloadPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('preview');
  const [isDownloading, setIsDownloading] = useState(false);
  
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
      
      // Redirect if job is not completed
      if (details.status !== 'completed') {
        toast({
          title: 'Job not ready for download',
          description: 'Only completed jobs can be downloaded.',
          variant: 'destructive',
        });
        
        router.push(`/dashboard/data-generation/jobs/${params.id}`);
        return;
      }
      
      // Fetch preview data
      fetchPreviewData();
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
  
  // Handle download
  const handleDownload = async (format: string) => {
    setIsDownloading(true);
    
    try {
      await dataGenerationClient.downloadJobData(params.id, format);
      
      toast({
        title: 'Download started',
        description: `Your data is being downloaded in ${format.toUpperCase()} format.`,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Navigate back to job details
  const handleBackToJobDetails = () => {
    router.push(`/dashboard/data-generation/jobs/${params.id}`);
  };
  
  // Get file size display
  const getFileSizeDisplay = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  };
  
  // Get file icon based on format
  const getFileIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <FileText className="h-6 w-6" />;
      case 'json':
        return <Database className="h-6 w-6" />;
      case 'xml':
        return <FileText className="h-6 w-6" />;
      case 'sql':
        return <Database className="h-6 w-6" />;
      default:
        return <FileDown className="h-6 w-6" />;
    }
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
        <Button onClick={handleBackToJobDetails}>Back to Job Details</Button>
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
            onClick={handleBackToJobDetails}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Download Data</h1>
          <Badge className="bg-green-500">
            {jobDetails.recordsGenerated.toLocaleString()} Records
          </Badge>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preview">Data Preview</TabsTrigger>
          <TabsTrigger value="download">Download Options</TabsTrigger>
        </TabsList>
        
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
        
        <TabsContent value="download" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Download Options</CardTitle>
              <CardDescription>Choose a format to download the generated data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['csv', 'json', 'xml', 'sql'].map(format => (
                  <Card key={format} className="overflow-hidden">
                    <div className="p-6 flex flex-col items-center text-center space-y-4">
                      <div className="bg-primary/10 p-3 rounded-full">
                        {getFileIcon(format)}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">{format.toUpperCase()}</h3>
                        <p className="text-sm text-gray-500">
                          {format === jobDetails.outputFormat ? 'Native Format' : 'Converted Format'}
                        </p>
                      </div>
                      <p className="text-sm">
                        {getFileSizeDisplay(jobDetails.fileSizes?.[format] || 0)}
                      </p>
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => handleDownload(format)}
                        disabled={isDownloading}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        <span>Download</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Downloaded data will be available for 7 days. After that, you may need to regenerate the data.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 