/**
 * JobHistoryTable Component
 * 
 * A data table for viewing job history with filtering, sorting, and pagination.
 */

import React, { useState } from 'react';
import { JobStatus, JobDetails } from '@/lib/models/data-generation/types';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

// Define these types locally since they seem to have import issues
type JobStatusValue = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'pending' | 'accepted' | 'rejected';

interface JobProgress {
  percentComplete: number;
  currentStep?: string;
  stepsCompleted?: number;
  totalSteps?: number;
  startTime?: Date;
  endTime?: Date | null;
  estimatedTimeRemaining?: number;
}

type JobProgressType = number | JobProgress;

interface JobHistoryTableProps {
  jobs: JobDetails[];
  isLoading: boolean;
  onView: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  onResume: (jobId: string) => void;
  onDownload: (jobId: string) => void;
  onPageChange: (page: number) => void;
  onFilterChange: (filters: { status?: JobStatusValue; search?: string }) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    itemsPerPage: number;
  };
}

// Status color mapping for badges
const statusColors: Record<JobStatusValue, string> = {
  queued: 'bg-blue-100 text-blue-800',
  running: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  paused: 'bg-purple-100 text-purple-800',
  pending: 'bg-orange-100 text-orange-800',
  accepted: 'bg-teal-100 text-teal-800',
  rejected: 'bg-pink-100 text-pink-800'
};

// Sort fields
type SortField = 'id' | 'name' | 'status' | 'createdAt' | 'startedAt';
type SortDirection = 'asc' | 'desc';

/**
 * JobHistoryTable Component
 */
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
  // State for sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // State for filtering
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Handle sort
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Handle status filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    onFilterChange({
      status: value === 'all' ? undefined : value as JobStatusValue,
      search: searchQuery || undefined,
    });
  };
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onFilterChange({
      status: statusFilter === 'all' ? undefined : statusFilter as JobStatusValue,
      search: query || undefined,
    });
  };

  // Determine if action buttons should be enabled
  const canResume = (job: JobDetails) => 
    (job.status as JobStatusValue) === 'paused' || (job.status as JobStatusValue) === 'failed';
  
  const canCancel = (job: JobDetails) => 
    (job.status as JobStatusValue) === 'queued' || (job.status as JobStatusValue) === 'running';
  
  const canDownload = (job: JobDetails) => 
    (job.status as JobStatusValue) === 'completed';
  
  // Format date for display
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };
  
  // Get progress percentage
  const getProgressPercentage = (job: JobDetails) => {
    if (typeof job.progress === 'number') {
      return job.progress;
    } else if (job.progress && typeof job.progress === 'object' && 'percentComplete' in job.progress) {
      return (job.progress as JobProgress).percentComplete;
    }
    return 0;
  };
  
  // Get progress label
  const getProgressLabel = (job: JobDetails) => {
    if (job.progress && typeof job.progress === 'object' && 'currentStep' in job.progress) {
      return (job.progress as JobProgress).currentStep;
    }
    return '';
  };
  
  // Sort jobs
  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortField === 'id') {
      const aValue = a.id as string;
      const bValue = b.id as string;
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (sortField === 'name') {
      const aValue = a.name as string;
      const bValue = b.name as string;
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (sortField === 'status') {
      const aValue = a.status as string;
      const bValue = b.status as string;
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (sortField === 'createdAt') {
      const aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    }
    
    if (sortField === 'startedAt') {
      const aValue = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bValue = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    }
    
    return 0;
  });
  
  // Generate pagination links
  const paginationLinks = [];
  for (let i = 1; i <= pagination.totalPages; i++) {
    if (
      i === 1 || 
      i === pagination.totalPages || 
      (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)
    ) {
      paginationLinks.push(i);
    } else if (
      (i === 2 && pagination.currentPage > 3) ||
      (i === pagination.totalPages - 1 && pagination.currentPage < pagination.totalPages - 2)
    ) {
      paginationLinks.push('ellipsis');
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select 
            value={statusFilter} 
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={handleSearch}
            className="max-w-xs"
          />
        </div>
        
        <div className="text-sm text-gray-500">
          Showing {pagination.totalItems === 0 ? 0 : (pagination.currentPage - 1) * pagination.itemsPerPage + 1} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} jobs
        </div>
      </div>
      
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort('id')}
              >
                ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort('name')}
              >
                Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort('status')}
              >
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort('createdAt')}
              >
                Created {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort('startedAt')}
              >
                Started {sortField === 'startedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <div className="flex justify-center items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    <span>Loading jobs...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : sortedJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  No jobs found. Create a new job to get started.
                </TableCell>
              </TableRow>
            ) : (
              sortedJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-sm">
                    {job.id}
                  </TableCell>
                  <TableCell>
                    {job.name || 'Unnamed Job'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`${statusColors[job.status as JobStatusValue]} text-white`}
                    >
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {job.createdAt ? formatDate(new Date(job.createdAt)) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {job.startedAt ? formatDate(new Date(job.startedAt)) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="w-[100px]">
                      <Progress 
                        value={getProgressPercentage(job)} 
                        className="h-2"
                      />
                      <p className="text-xs mt-1">
                        {getProgressPercentage(job)}% {getProgressLabel(job)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {job?.config?.outputFormat ? (
                      <span className="text-xs">
                        {String(job?.config?.outputFormat || 'Default')}
                        {job?.config?.recordCount ? 
                          ` (${job?.config?.recordCount} records)` : null}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">No config</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(job.id)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          disabled={!canResume(job)}
                          onClick={() => onResume(job.id)}
                        >
                          Resume Job
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          disabled={!canCancel(job)}
                          onClick={() => onCancel(job.id)}
                        >
                          Cancel Job
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          disabled={!canDownload(job)}
                          onClick={() => onDownload(job.id)}
                        >
                          Download Results
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => onPageChange(Math.max(1, pagination.currentPage - 1))}
                className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {paginationLinks.map((link, index) => (
              link === 'ellipsis' ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={link}>
                  <PaginationLink
                    isActive={pagination.currentPage === link}
                    onClick={() => onPageChange(link as number)}
                  >
                    {link}
                  </PaginationLink>
                </PaginationItem>
              )
            ))}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                className={pagination.currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}