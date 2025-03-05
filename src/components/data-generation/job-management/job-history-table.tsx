/**
 * JobHistoryTable Component
 * 
 * A data table for viewing job history with filtering, sorting, and pagination.
 */

import React, { useState } from 'react';
import { JobStatus } from '@/lib/models/data-generation/types';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PlayCircle, StopCircle, FileDown, MoreHorizontal, FileSearch } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';

interface JobHistoryTableProps {
  jobs: JobStatus[];
  isLoading: boolean;
  onView: (jobId: string) => void;
  onCancel: (jobId: string) => Promise<void>;
  onResume: (jobId: string) => Promise<void>;
  onDownload: (jobId: string) => void;
  onPageChange: (page: number) => void;
  onFilterChange: (filters: {
    status?: JobStatus['status'];
    startDate?: Date;
    endDate?: Date;
  }) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
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

export function JobHistoryTable({
  jobs,
  isLoading,
  onView,
  onCancel,
  onResume,
  onDownload,
  onPageChange,
  onFilterChange,
  pagination,
}: JobHistoryTableProps) {
  const [statusFilter, setStatusFilter] = useState<JobStatus['status'] | ''>('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as JobStatus['status'] | '');
    onFilterChange({
      status: value ? (value as JobStatus['status']) : undefined,
      startDate: startDateFilter ? new Date(startDateFilter) : undefined,
      endDate: endDateFilter ? new Date(endDateFilter) : undefined,
    });
  };

  // Handle date filter changes
  const handleDateFilterChange = () => {
    onFilterChange({
      status: statusFilter ? statusFilter : undefined,
      startDate: startDateFilter ? new Date(startDateFilter) : undefined,
      endDate: endDateFilter ? new Date(endDateFilter) : undefined,
    });
  };

  // Determine if action buttons should be enabled
  const canResume = (job: JobStatus) => job.status === 'paused' || job.status === 'failed';
  const canCancel = (job: JobStatus) => job.status === 'queued' || job.status === 'running';
  const canDownload = (job: JobStatus) => job.status === 'completed';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-xl font-semibold">Job History</h2>
        
        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date filters */}
          <div className="flex gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Start Date</span>
              <Input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                onBlur={handleDateFilterChange}
                className="w-[150px]"
              />
            </div>
            
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">End Date</span>
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                onBlur={handleDateFilterChange}
                className="w-[150px]"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Data Size</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading jobs...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No jobs found. Try adjusting your filters or create a new job.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.jobId}>
                  <TableCell className="font-mono text-xs">
                    {job.jobId.slice(0, 8)}...
                  </TableCell>
                  <TableCell>{job.configuration.dataType}</TableCell>
                  <TableCell>
                    <Badge 
                      className={`${statusColors[job.status]} capitalize`}
                      variant="outline"
                    >
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <Progress 
                        value={job.progress} 
                        className={`h-2 ${progressColors[job.status]}`} 
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(job.startTime), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell>
                    {job.configuration.dataSize.toLocaleString()} records
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onView(job.jobId)}
                        title="View Details"
                      >
                        <FileSearch className="h-4 w-4" />
                      </Button>
                      
                      {canResume(job) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onResume(job.jobId)}
                          title="Resume Job"
                        >
                          <PlayCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {canCancel(job) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onCancel(job.jobId)}
                          title="Cancel Job"
                        >
                          <StopCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {canDownload(job) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDownload(job.jobId)}
                          title="Download Results"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" title="More Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => onView(job.jobId)}>
                            View Details
                          </DropdownMenuItem>
                          
                          {canResume(job) && (
                            <DropdownMenuItem onClick={() => onResume(job.jobId)}>
                              Resume Job
                            </DropdownMenuItem>
                          )}
                          
                          {canCancel(job) && (
                            <DropdownMenuItem onClick={() => onCancel(job.jobId)}>
                              Cancel Job
                            </DropdownMenuItem>
                          )}
                          
                          {canDownload(job) && (
                            <DropdownMenuItem onClick={() => onDownload(job.jobId)}>
                              Download Results
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {jobs.length} of {pagination.totalItems} items
        </div>
        
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => onPageChange(Math.max(1, pagination.currentPage - 1))}
                disabled={pagination.currentPage === 1}
              />
            </PaginationItem>
            
            {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
              const pageNum = pagination.currentPage <= 3
                ? i + 1
                : pagination.currentPage + i - 2;
              
              if (pageNum <= 0 || pageNum > pagination.totalPages) return null;
              
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    isActive={pagination.currentPage === pageNum}
                    onClick={() => onPageChange(pageNum)}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            {pagination.totalPages > 5 && pagination.currentPage < pagination.totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            
            {pagination.totalPages > 5 && pagination.currentPage < pagination.totalPages - 1 && (
              <PaginationItem>
                <PaginationLink onClick={() => onPageChange(pagination.totalPages)}>
                  {pagination.totalPages}
                </PaginationLink>
              </PaginationItem>
            )}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                disabled={pagination.currentPage === pagination.totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
} 