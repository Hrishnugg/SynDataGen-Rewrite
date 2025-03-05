/**
 * JobStatusCard Component
 * 
 * A card component for displaying the status of a data generation job.
 * It includes status indicators, progress bars, and action buttons.
 */

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/ui-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { JobStatus } from '@/lib/models/data-generation/types';
import { formatDistanceToNow, format } from 'date-fns';
import { PlayCircle, StopCircle, FileDown, MoreHorizontal, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from '@/components/ui/use-toast';

interface JobStatusCardProps {
  job: JobStatus;
  onCancel?: (jobId: string) => Promise<void>;
  onResume?: (jobId: string) => Promise<void>;
  onView?: (jobId: string) => void;
  onDownload?: (jobId: string) => void;
  compact?: boolean;
}

const statusColors = {
  queued: 'bg-blue-100 text-blue-800',
  running: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  paused: 'bg-purple-100 text-purple-800',
};

const progressColors = {
  queued: 'bg-blue-500',
  running: 'bg-yellow-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-gray-500',
  paused: 'bg-purple-500',
};

export function JobStatusCard({ 
  job, 
  onCancel, 
  onResume, 
  onView, 
  onDownload,
  compact = false 
}: JobStatusCardProps) {
  const handleCancel = async () => {
    if (!onCancel) return;
    
    try {
      await onCancel(job.jobId);
      toast({
        title: 'Job cancelled',
        description: `Job ${job.jobId.slice(0, 8)} has been cancelled.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to cancel job',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };
  
  const handleResume = async () => {
    if (!onResume) return;
    
    try {
      await onResume(job.jobId);
      toast({
        title: 'Job resumed',
        description: `Job ${job.jobId.slice(0, 8)} has been resumed.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to resume job',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Format the timestamp
  const startTimeFormatted = format(new Date(job.startTime), 'MMM d, yyyy h:mm a');
  const timeAgo = formatDistanceToNow(new Date(job.startTime), { addSuffix: true });
  
  // Calculate active time
  const activeTime = job.endTime
    ? formatDistanceToNow(new Date(job.startTime), { end: new Date(job.endTime) })
    : formatDistanceToNow(new Date(job.startTime));
  
  // Determine if job can be resumed
  const canResume = job.status === 'paused' || job.status === 'failed';
  
  // Determine if job can be cancelled
  const canCancel = job.status === 'queued' || job.status === 'running';
  
  // Determine if job data can be downloaded
  const canDownload = job.status === 'completed';
  
  return (
    <Card className={`overflow-hidden ${compact ? 'w-full' : 'w-full md:w-96'}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg truncate" title={job.jobId}>
            {job.dataType || 'Data Generation'} Job
          </CardTitle>
          <Badge 
            className={`${statusColors[job.status]} capitalize`}
            variant="outline"
          >
            {job.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          ID: {job.jobId.slice(0, 8)}...
        </p>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <Progress 
              value={job.progress} 
              className={`h-2 ${progressColors[job.status]}`} 
            />
          </div>
          
          {/* Additional info */}
          {!compact && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Started</p>
                <p title={startTimeFormatted}>{timeAgo}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{activeTime}</span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Size</p>
                <p>{job.configuration.dataSize.toLocaleString()} records</p>
              </div>
              <div>
                <p className="text-muted-foreground">Format</p>
                <p>{job.configuration.outputFormat}</p>
              </div>
            </div>
          )}
          
          {/* Stage information (only in non-compact mode) */}
          {!compact && job.stages.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Stages</p>
              <div className="space-y-1">
                {job.stages.map((stage) => (
                  <div key={stage.name} className="flex justify-between items-center text-xs">
                    <span>{stage.name}</span>
                    <Badge 
                      variant="outline" 
                      className={`${
                        stage.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : stage.status === 'running'
                          ? 'bg-yellow-100 text-yellow-800'
                          : stage.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      } capitalize`}
                    >
                      {stage.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex justify-between w-full">
          {canResume && onResume && (
            <Button
              size="sm"
              onClick={handleResume}
              className="flex items-center gap-1"
            >
              <PlayCircle className="h-4 w-4" />
              <span>Resume</span>
            </Button>
          )}
          
          {canCancel && onCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-1"
            >
              <StopCircle className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          )}
          
          {canDownload && onDownload && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload(job.jobId)}
              className="flex items-center gap-1"
            >
              <FileDown className="h-4 w-4" />
              <span>Download</span>
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onView && onView(job.jobId)}>
                View Details
              </DropdownMenuItem>
              
              {canResume && onResume && (
                <DropdownMenuItem onClick={handleResume}>
                  Resume Job
                </DropdownMenuItem>
              )}
              
              {canCancel && onCancel && (
                <DropdownMenuItem onClick={handleCancel}>
                  Cancel Job
                </DropdownMenuItem>
              )}
              
              {canDownload && onDownload && (
                <DropdownMenuItem onClick={() => onDownload(job.jobId)}>
                  Download Results
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
} 