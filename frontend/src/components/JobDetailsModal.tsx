'use client'

import * as React from 'react'
import { Button } from "@/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/shadcn/dialog"
import { Badge } from "@/components/shadcn/badge"
import { useGetJobQuery } from '@/features/jobs/jobApiSlice';
import { IconLoader } from '@tabler/icons-react';

// TODO: Import Job type from shared location
type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
interface Job {
  id: string; 
  projectId: string;
  userId: string; 
  status: JobStatus;
  jobType: string;
  jobConfig: string; 
  pipelineJobID?: string;
  resultURI?: string;
  error?: string;
  createdAt: string; 
  updatedAt: string; 
  startedAt?: string; 
  completedAt?: string; 
}

interface JobDetailsModalProps {
  jobId: string | null; // ID of the job to display
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDetailDateTime(isoString?: string): string {
    if (!isoString) return 'N/A'
    try {
        return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'medium',
        }).format(new Date(isoString))
    } catch (e) {
        return 'Invalid Date'
    }
}

// Updated badge function for new statuses
function renderStatusBadge(status?: JobStatus) {
    if (!status) return null;
    let variant: "default" | "secondary" | "destructive" | "outline" = 'secondary';
    switch (status) {
        case 'completed': variant = 'default'; break;
        case 'failed': variant = 'destructive'; break;
        case 'pending':
        case 'queued': variant = 'outline'; break;
        case 'cancelled': variant = 'outline'; break; // Or a different style?
        // 'running' uses default secondary
    }
    return <Badge variant={variant} className="capitalize">{status}</Badge>;
}

export function JobDetailsModal({ jobId, isOpen, onOpenChange }: JobDetailsModalProps) {

  // Fetch job data only when the modal is open and jobId is valid
  const { data: job, isLoading, isError, error } = useGetJobQuery(jobId!, {
    skip: !isOpen || !jobId,
  });

  // Attempt to pretty-print JSON config
  let formattedConfig = "";
  if (job?.jobConfig) {
      try {
          formattedConfig = JSON.stringify(JSON.parse(job.jobConfig), null, 2);
      } catch (e) {
          formattedConfig = job.jobConfig; // Keep original string if parsing fails
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>
            Detailed information for Job ID: {jobId ?? '...'}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading && (
          <div className="flex justify-center items-center h-60">
             <IconLoader className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {isError && (
           <div className="text-center text-red-500 py-10">
             Error loading job details. <br />
             {/* @ts-ignore */} 
             <span className="text-xs">{error?.data?.message || 'Please try again later.'}</span>
           </div>
        )}
        {!isLoading && !isError && !job && jobId && (
           <div className="text-center text-muted-foreground py-10">Job not found.</div>
        )}

        {!isLoading && !isError && job && (
          <div className="grid gap-4 py-4 text-sm max-h-[60vh] overflow-y-auto pr-2"> {/* Added max-height and scroll */} 
             <div className="grid grid-cols-3 items-center gap-4">
               <span className="text-muted-foreground">Status</span>
               <div className="col-span-2">{renderStatusBadge(job.status)}</div>
             </div>
             <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">Job Type</span>
                <span className="col-span-2 capitalize">{job.jobType}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">User ID</span>
                <span className="col-span-2">{job.userId}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">Pipeline Job ID</span>
                <span className="col-span-2">{job.pipelineJobID || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">Created At</span>
                <span className="col-span-2">{formatDetailDateTime(job.createdAt)}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">Started At</span>
                <span className="col-span-2">{formatDetailDateTime(job.startedAt)}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">Completed At</span>
                <span className="col-span-2">{formatDetailDateTime(job.completedAt)}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="col-span-2">{formatDetailDateTime(job.updatedAt)}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <span className="text-muted-foreground">Result URI</span>
                {job.resultURI ? (
                   <a href={job.resultURI} target="_blank" rel="noopener noreferrer" className="col-span-2 text-blue-600 hover:underline truncate">
                       {job.resultURI}
                   </a>
                ) : (
                   <span className="col-span-2">N/A</span>
                )}
              </div>
              {job.error && (
               <div className="grid grid-cols-3 items-start gap-4">
                 <span className="text-muted-foreground">Error</span>
                 <pre className="col-span-2 whitespace-pre-wrap text-destructive text-xs bg-muted p-2 rounded-md">
                   {job.error}
                 </pre>
               </div>
              )}
              <div className="grid grid-cols-3 items-start gap-4">
                <span className="text-muted-foreground">Job Config</span>
                <pre className="col-span-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs bg-muted p-2 rounded-md">
                   {formattedConfig}
               </pre>
              </div>
          </div>
        )}

        <DialogFooter>
            <DialogClose asChild>
             <Button type="button" variant="outline">
                Close
             </Button>
           </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 