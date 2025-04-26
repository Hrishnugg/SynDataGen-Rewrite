'use client'

import * as React from 'react'
import { z } from 'zod'

import { Button } from "@/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/shadcn/dialog"
import { Badge } from "@/components/shadcn/badge"
import { projectJobSchema } from './ProjectJobsTable'

type Job = z.infer<typeof projectJobSchema>

interface JobDetailsModalProps {
  job: Job | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
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

function renderStatusBadge(status?: Job['Status']) {
    if (!status) return null;
    let variant: "default" | "secondary" | "destructive" | "outline" = 'secondary';
    if (status === 'completed') variant = 'default';
    if (status === 'failed') variant = 'destructive';
    if (status === 'pending' || status === 'cancelled') variant = 'outline';
    return <Badge variant={variant} className="capitalize">{status}</Badge>;
}

export function JobDetailsModal({ job, isOpen, onOpenChange }: JobDetailsModalProps) {
  if (!job) return null

  let formattedConfig = job.JobConfig;
  try {
      formattedConfig = JSON.stringify(JSON.parse(job.JobConfig), null, 2);
  } catch (e) {
      // Keep original string if parsing fails
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>
            Detailed information for Job ID: {job.ID}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-sm">
           <div className="grid grid-cols-3 items-center gap-4">
             <span className="text-muted-foreground">Status</span>
             <div className="col-span-2">{renderStatusBadge(job.Status)}</div>
           </div>
           <div className="grid grid-cols-3 items-center gap-4">
             <span className="text-muted-foreground">Job Type</span>
             <span className="col-span-2 capitalize">{job.JobType}</span>
           </div>
           <div className="grid grid-cols-3 items-center gap-4">
             <span className="text-muted-foreground">User ID</span>
             <span className="col-span-2">{job.UserID}</span>
           </div>
           <div className="grid grid-cols-3 items-center gap-4">
             <span className="text-muted-foreground">Pipeline Job ID</span>
             <span className="col-span-2">{job.PipelineJobID || 'N/A'}</span>
           </div>
           <div className="grid grid-cols-3 items-center gap-4">
             <span className="text-muted-foreground">Created At</span>
             <span className="col-span-2">{formatDetailDateTime(job.CreatedAt)}</span>
           </div>
           <div className="grid grid-cols-3 items-center gap-4">
             <span className="text-muted-foreground">Started At</span>
             <span className="col-span-2">{formatDetailDateTime(job.StartedAt)}</span>
           </div>
           <div className="grid grid-cols-3 items-center gap-4">
             <span className="text-muted-foreground">Completed At</span>
             <span className="col-span-2">{formatDetailDateTime(job.CompletedAt)}</span>
           </div>
           <div className="grid grid-cols-3 items-center gap-4">
             <span className="text-muted-foreground">Last Updated</span>
             <span className="col-span-2">{formatDetailDateTime(job.UpdatedAt)}</span>
           </div>
           <div className="grid grid-cols-3 items-center gap-4">
             <span className="text-muted-foreground">Result URI</span>
             {job.ResultURI ? (
                <a href={job.ResultURI} target="_blank" rel="noopener noreferrer" className="col-span-2 text-blue-600 hover:underline truncate">
                    {job.ResultURI}
                </a>
             ) : (
                <span className="col-span-2">N/A</span>
             )}
           </div>
           {job.Error && (
            <div className="grid grid-cols-3 items-start gap-4">
              <span className="text-muted-foreground">Error</span>
              <pre className="col-span-2 whitespace-pre-wrap text-destructive text-xs bg-muted p-2 rounded-md">
                {job.Error}
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