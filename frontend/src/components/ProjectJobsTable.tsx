'use client'

import * as React from "react"
import {
  IconAlertCircleFilled,
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconPlayerPlayFilled,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
  IconFilter,
  IconPlus,
} from "@tabler/icons-react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { z } from "zod"

import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table"
import { JobDetailsModal } from "./JobDetailsModal"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"
import { JobCreationModal } from "./JobCreationModal"

// --- Define Job Schema/Type (Mirroring page.tsx MockJob) ---

// Use Zod for potential future validation, but keep structure simple
export const projectJobSchema = z.object({
  ID: z.string(),
  ProjectID: z.string(),
  UserID: z.string(),
  Status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
  JobType: z.string(),
  JobConfig: z.string(), // Keep as string for now
  CreatedAt: z.string().datetime(),
  UpdatedAt: z.string().datetime(),
  PipelineJobID: z.string().optional(),
  StartedAt: z.string().datetime().optional(),
  CompletedAt: z.string().datetime().optional(),
  ResultURI: z.string().optional(),
  Error: z.string().optional(),
})

type Job = z.infer<typeof projectJobSchema>
const JobStatuses = projectJobSchema.shape.Status.options; // Extract status enum values

export type { ColumnDef } from "@tanstack/react-table"

// --- Helper Functions (Copied from page.tsx, adapt if needed) ---

function formatDateTime(isoString?: string): string {
  if (!isoString) return '-'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(isoString))
  } catch (e) {
    return 'Invalid Date'
  }
}

function formatDurationOrUpdate(startedAt?: string, completedAt?: string, updatedAt?: string): string {
  if (startedAt && completedAt) {
    try {
      const start = new Date(startedAt).getTime()
      const end = new Date(completedAt).getTime()
      const durationMs = end - start

      if (durationMs < 0) return "Negative duration"

      const seconds = Math.floor(durationMs / 1000) % 60
      const minutes = Math.floor(durationMs / (1000 * 60)) % 60
      const hours = Math.floor(durationMs / (1000 * 60 * 60))

      let durationStr = ""
      if (hours > 0) durationStr += `${hours}h `
      if (minutes > 0 || hours > 0) durationStr += `${minutes}m `
      durationStr += `${seconds}s`
      return durationStr.trim()
    } catch (e) {
      return "Invalid dates"
    }
  } else if (updatedAt) {
    // Displaying full timestamp might be too verbose, consider relative time later
    return `Updated: ${formatDateTime(updatedAt)}`
  } else {
    return '-'
  }
}

// --- Define Job Columns ---

// Define column generation function to pass modal control
const getColumns = (onViewDetails: (job: Job) => void): ColumnDef<Job>[] => [
  {
    accessorKey: "ID",
    header: "Job ID",
    cell: ({ row }) => <div className="font-medium truncate max-w-[150px]">{row.getValue("ID")}</div>,
    enableHiding: false,
  },
  {
    accessorKey: "Status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("Status") as Job["Status"]
      let icon: React.ReactNode
      let colorClasses: string

      switch (status) {
        case 'completed':
          icon = <IconCircleCheckFilled aria-hidden="true" className="h-3.5 w-3.5" />
          colorClasses = "bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-100"
          break
        case 'running':
          icon = <IconPlayerPlayFilled aria-hidden="true" className="h-3.5 w-3.5" />
          colorClasses = "bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-100"
          break
        case 'pending':
          icon = <IconCircleDashed aria-hidden="true" className="h-3.5 w-3.5" />
          colorClasses = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
          break
        case 'failed':
          icon = <IconAlertCircleFilled aria-hidden="true" className="h-3.5 w-3.5" />
          colorClasses = "bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-100"
          break
        case 'cancelled':
          icon = <IconAlertTriangleFilled aria-hidden="true" className="h-3.5 w-3.5" />
          colorClasses = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-100"
          break
        default:
          icon = null
          colorClasses = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
      }

      return (
        <Badge
          variant="outline"
          className={`border-transparent px-2.5 py-0.5 text-xs capitalize ${colorClasses}`}
        >
          <div className="flex items-center gap-1">
            {icon}
            {status}
          </div>
        </Badge>
      )
    },
  },
  {
    accessorKey: "JobType",
    header: "Type",
    cell: ({ row }) => <div className="capitalize">{row.getValue("JobType")}</div>,
  },
  {
    accessorKey: "CreatedAt",
    header: "Created At",
    cell: ({ row }) => <div>{formatDateTime(row.getValue("CreatedAt"))}</div>,
  },
  {
    id: "durationOrUpdate",
    header: "Duration / Updated",
    cell: ({ row }) => {
      const { StartedAt, CompletedAt, UpdatedAt } = row.original
      return <div>{formatDurationOrUpdate(StartedAt, CompletedAt, UpdatedAt)}</div>
    },
    enableSorting: false,
  },
  {
    accessorKey: "Error",
    header: "Error",
    cell: ({ row }) => {
      const status = row.original.Status
      const error = row.getValue("Error") as string | undefined
      return (
        <div className="truncate max-w-[200px] text-destructive">
          {status === 'failed' ? error : ''}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const job = row.original
      const handleCancel = (jobId: string) => console.log(`Cancel job: ${jobId}`)
      const handleDownload = (jobId: string, resultUri?: string) =>
        console.log(`Download result for job: ${jobId} from ${resultUri}`)
      const handlePause = (jobId: string) => console.log(`Pause job: ${jobId}`)

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground data-[state=open]:bg-muted">
                <span className="sr-only">Open menu</span>
                <IconDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewDetails(job)}>
                View Details
              </DropdownMenuItem>
              {job.ResultURI && job.Status === 'completed' && (
                <DropdownMenuItem onClick={() => handleDownload(job.ID, job.ResultURI)}>
                  Download Result
                </DropdownMenuItem>
              )}
              {job.Status == 'pending' || job.Status == 'running' && (
                <DropdownMenuItem 
                  onClick={() => handlePause(job.ID)}
                  className="text-warning focus:text-warning focus:bg-warning/10"
                >
                  Pause Job
                </DropdownMenuItem>
              )}
              {(job.Status === 'pending' || job.Status === 'running') && (
                <DropdownMenuItem
                  onClick={() => handleCancel(job.ID)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  Cancel Job
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
]

// --- Main Table Component ---

export function ProjectJobsTable({
  data: initialData,
  projectId
}: {
  data: Job[] // Use Job type
  projectId: string // Expect projectId from parent
}) {
  const [data, setData] = React.useState(() => initialData)
  // Reset state when initialData changes
  React.useEffect(() => {
    setData(initialData)
  }, [initialData])

  // Removed rowSelection state
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({}) // Keep column visibility
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]) // Keep filters state
  const [sorting, setSorting] = React.useState<SortingState>([]) // Keep sorting state
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10, // Default page size
  })

  // State for details modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false)
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null)

  // State for creation modal
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)

  // Handler to open details modal
  const handleViewDetails = (job: Job) => {
    setSelectedJob(job)
    setIsDetailsModalOpen(true)
  }

  // Handler for Create Job button
  const handleCreateJobClick = () => {
    setIsCreateModalOpen(true)
  }

  // Handler for submitting the new job from the modal
  const handleCreateJobSubmit = (details: { name: string; type: string; config: string; projectId: string }) => {
    console.log("Submitting new job:", details);
    // TODO: Implement actual API call here to create the job
    // After successful API call, likely need to refetch table data
    setIsCreateModalOpen(false); // Close modal after submission initiated
  }

  // Generate columns by passing the handler
  const columns = React.useMemo(() => getColumns(handleViewDetails), [])

  const table = useReactTable({
    data,
    columns, // Use generated columns
    state: {
      sorting,
      columnVisibility,
      // rowSelection, // Removed
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.ID, // Use Job ID
    enableRowSelection: false, // Disable row selection
    // onRowSelectionChange: setRowSelection, // Removed
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Handler for status filter change
  const handleStatusFilterChange = (value: string) => {
    const currentStatusFilter = columnFilters.find(f => f.id === 'Status');
    const otherFilters = columnFilters.filter(f => f.id !== 'Status');

    if (value === 'all') {
        // Remove status filter
        setColumnFilters(otherFilters);
    } else if (currentStatusFilter) {
        // Update existing status filter
        setColumnFilters([...otherFilters, { id: 'Status', value }]);
    } else {
        // Add new status filter
        setColumnFilters([...otherFilters, { id: 'Status', value }]);
    }
     // Reset to first page when filter changes
     table.setPageIndex(0);
  };

  const selectedStatus = (columnFilters.find(f => f.id === 'Status')?.value as string) || 'all';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
         {/* --- Filters (Left Side) --- */}
         <div className="flex items-center gap-2">
            <Select value={selectedStatus} onValueChange={handleStatusFilterChange}>
               <SelectTrigger className="h-8 w-[180px]">
                   <div className="flex items-center gap-1">
                       <IconFilter className="h-3.5 w-3.5 text-muted-foreground" />
                       <SelectValue placeholder="Filter by status..." />
                   </div>
               </SelectTrigger>
               <SelectContent>
                   <SelectGroup>
                       <SelectLabel>Filter by Status</SelectLabel>
                       <SelectItem value="all">All Statuses</SelectItem>
                       {JobStatuses.map(status => (
                           <SelectItem key={status} value={status} className="capitalize">
                               {status}
                           </SelectItem>
                       ))}
                   </SelectGroup>
               </SelectContent>
           </Select>
            {/* TODO: Add other filters like JobType or date range? */}
         </div>

         {/* --- Right Controls (Create Button, Columns Button) --- */}
         <div className="flex items-center gap-2"> {/* Group right-side buttons */}
             {/* Update Create Job Button onClick */}
             <HoverBorderGradient
                containerClassName="rounded-md"
                as="button"
                onClick={handleCreateJobClick}
                className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-1 h-8 px-3 text-xs"
              >
                <IconPlus className="h-3.5 w-3.5" />
                <span>Create Job</span>
             </HoverBorderGradient>

             {/* Column Visibility Dropdown */}
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <IconLayoutColumns className="mr-2 h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      // Make names more readable
                      const columnName = column.id.replace(/([A-Z])/g, ' $1').trim();
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {columnName}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
         </div>
      </div>
      {/* Table Container */}
      <div className="rounded-md border overflow-hidden">
          {/* Removed DndContext */}
          <Table>
            <TableHeader className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                  // Removed SortableContext
                  (table.getRowModel().rows.map((row) => (
                    // Removed DraggableRow wrapper
                    (<TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"} // Keep for potential styling
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>)
                  )))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No jobs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
         {/* Removed selected row count */}
         <div className="flex-1 text-sm text-muted-foreground">
            {/* Optional: Show total rows */}
            {/* {table.getFilteredRowModel().rows.length} row(s) */}
         </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-muted-foreground">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium text-muted-foreground">
            Page {table.getPageCount() > 0 ? table.getState().pagination.pageIndex + 1 : 0} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {/* --- Modals --- */}
      <JobDetailsModal
        job={selectedJob}
        isOpen={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
      />
      <JobCreationModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        projectId={projectId}
        onCreateJob={handleCreateJobSubmit}
      />
    </div>
  );
} 