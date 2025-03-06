/**
 * JobStatusCard Component
 * 
 * A card component for displaying the status of a data generation job.
 * It includes status indicators, progress bars, and action buttons.
 */

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { JobStatus } from '@/lib/models/data-generation/types';
import { formatDistanceToNow, format } from 'date-fns';
import { PlayCircle, StopCircle, FileDown, MoreHorizontal, Clock, ExternalLink } from 'lucide-react';
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
  job: any;
  onClick?: (jobId: string) => void;
  onCancel?: (jobId: string) => Promise<void>;
  onResume?: (jobId: string) => Promise<void>;
  onDownload?: (jobId: string) => void;
  compact?: boolean;
}

export function JobStatusCard({ 
  job, 
  onClick,
  onCancel, 
  onResume, 
  onDownload,
  compact = false 
}: JobStatusCardProps) {
  if (!job) return null;
  
  const handleCancel = async () => {
    if (!onCancel) {
      toast({
        title: "Operation not supported",
        description: "Cancel operation is not available.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await onCancel(job.id);
      toast({
        title: "Job cancelled",
        description: `Job ${job.name} has been cancelled.`,
      });
    } catch (error) {
      toast({
        title: "Failed to cancel job",
        description: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };
  
  const handleResume = async () => {
    if (!onResume) {
      toast({
        title: "Operation not supported",
        description: "Resume operation is not available.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await onResume(job.id);
      toast({
        title: "Job resumed",
        description: `Job ${job.name} has been resumed.`,
      });
    } catch (error) {
      toast({
        title: "Failed to resume job",
        description: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };
  
  const handleView = () => {
    if (onClick) {
      onClick(job.id);
    }
  };
  
  const handleDownload = () => {
    if (!onDownload) {
      toast({
        title: "Operation not supported",
        description: "Download operation is not available.",
        variant: "destructive",
      });
      return;
    }
    
    onDownload(job.id);
  };
  
  // Format the created date
  const createdDate = job.createdAt ? new Date(job.createdAt) : null;
  const formattedCreatedDate = createdDate
    ? `${formatDistanceToNow(createdDate, { addSuffix: true })} (${format(createdDate, 'MMM d, yyyy')})`
    : 'Unknown';
  
  // Format the completed date if applicable
  const completedDate = job.completedAt ? new Date(job.completedAt) : null;
  const formattedCompletedDate = completedDate
    ? `${formatDistanceToNow(completedDate, { addSuffix: true })} (${format(completedDate, 'MMM d, yyyy')})`
    : job.status === 'completed' ? 'Just now' : 'N/A';
  
  // Determine the status badge style
  const getBadgeVariant = () => {
    switch (job.status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'in_progress':
        return 'default';
      case 'queued':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  // Format the status text for display
  const getStatusText = () => {
    switch (job.status) {
      case 'in_progress':
        return 'In Progress';
      default:
        return job.status.charAt(0).toUpperCase() + job.status.slice(1);
    }
  };

  if (compact) {
    return (
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={handleView}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{job.name}</h3>
            <p className="text-sm text-muted-foreground">Created {formattedCreatedDate}</p>
          </div>
          <Badge variant={getBadgeVariant()}>
            {getStatusText()}
          </Badge>
        </div>
        {job.status === 'in_progress' && (
          <Progress value={job.progress} className="mt-2 h-2" />
        )}
      </div>
    );
  }

  return (
    <div 
      className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      onClick={handleView}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{job.name}</h3>
            <Badge variant={getBadgeVariant()}>
              {getStatusText()}
            </Badge>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Started {formattedCreatedDate}
            </div>
            {job.completedAt && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Completed {formattedCompletedDate}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {job.status === 'in_progress' && onCancel && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
            >
              <StopCircle className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
          
          {(job.status === 'failed' || job.status === 'cancelled') && onResume && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleResume(); }}
            >
              <PlayCircle className="w-4 h-4 mr-1" />
              Resume
            </Button>
          )}
          
          {job.status === 'completed' && onDownload && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            >
              <FileDown className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleView(); }}
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View
          </Button>
        </div>
      </div>
      
      {job.status === 'in_progress' && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>{job.progress}% complete</span>
            <span>{job.recordsGenerated?.toLocaleString()} / {job.config?.count?.toLocaleString()} records</span>
          </div>
          <Progress value={job.progress} className="h-2" />
        </div>
      )}
      
      {job.status === 'completed' && (
        <div className="mt-3 text-sm">
          <div className="font-medium">Generated {job.recordsGenerated?.toLocaleString()} records</div>
          <div className="text-muted-foreground">Data size: {((job.dataSize || 0) / 1024 / 1024).toFixed(2)} MB</div>
        </div>
      )}
      
      {job.status === 'failed' && job.error && (
        <div className="mt-3 text-sm text-destructive">
          Error: {job.error}
        </div>
      )}
    </div>
  );
} 