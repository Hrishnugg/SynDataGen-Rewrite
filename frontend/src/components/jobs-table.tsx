'use client'

import * as React from "react"
import { useState } from 'react'; // Import useState
// ... (Keep existing imports, add/remove as needed for Job columns)
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconAlertTriangleFilled,
  IconAlertCircleFilled,
  IconClockHour4Filled, // Icon for pending/queued
  IconPlayerPlayFilled, // Icon for running
  IconX, // Icon for cancelled?
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconPlus,
  IconSend,
  IconRefresh,
  IconLoader,
} from "@tabler/icons-react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
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

import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/shadcn/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table"
import { Tabs, TabsContent } from "@/components/shadcn/tabs" // Removed TabsList, TabsTrigger unless needed internally
import { useCancelJobMutation, useSubmitJobMutation, useSyncJobStatusMutation } from '@/features/jobs/jobApiSlice'; // Import cancel, submit, and sync hooks
import { toast } from "sonner"; // Import toast
import { JobDetailsModal } from "./JobDetailsModal"; // Import the modal

// Define Job Type based on API Structure (from jobApiSlice.ts)
type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
interface Job {
  id: string; // Now a string (UUID)
  projectId: string;
  userId: string; 
  status: JobStatus;
  jobType: string;
  jobConfig: string; // Keep as string for now, details maybe in viewer
  pipelineJobID?: string;
  resultURI?: string;
  error?: string;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  startedAt?: string; // ISO Date string
  completedAt?: string; // ISO Date string
}

// Remove zod schema if not strictly needed for validation within table, use TS type
// export const jobSchema = z.object({ ... });
// type Job = z.infer<typeof jobSchema>;

// Drag Handle (update id type)
function DragHandle({ id }: { id: string }) { // Changed id to string
  const { attributes, listeners } = useSortable({ id })
  return (
    <Button {...attributes} {...listeners} variant="ghost" size="icon" className="text-muted-foreground size-7 cursor-grab active:cursor-grabbing hover:bg-transparent">
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

// NEW: JobCellViewer component (adapted from TableCellViewer in data-table.tsx)
function JobCellViewer({ item }: { item: Job }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        {/* Use font-medium like the original cell */}
        <Button variant="link" className="text-foreground w-fit px-0 text-left font-medium">
          {item.jobType}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.jobType}</DrawerTitle>
          <DrawerDescription>Job Details and Status</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {/* Form adapted for Job schema */}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="job-name">Job Name</Label>
              <Input id="job-name" defaultValue={item.jobType} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="job-status">Status</Label>
                <Select defaultValue={item.status}>
                  <SelectTrigger id="job-status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Use statuses from schema */}
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="flex flex-col gap-3">
                 <Label htmlFor="job-duration">Duration</Label>
                 <Input id="job-duration" defaultValue={item.duration} readOnly />
              </div>
            </div>
            <div className="flex flex-col gap-3">
                <Label htmlFor="job-created">Date Created</Label>
                <Input id="job-created" defaultValue={item.createdAt} readOnly />
            </div>
             {/* Removed fields not present in Job schema (Type, Storage, Creator) */}
          </form>
        </div>
        <DrawerFooter>
          <Button>Update Job</Button> {/* Changed button text */}
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// Component to handle row actions, including cancellation
function JobActions({ job }: { job: Job }) {
  const [cancelJob, { isLoading: isCancelling }] = useCancelJobMutation();
  const [submitJob, { isLoading: isSubmitting }] = useSubmitJobMutation();
  const [syncJobStatus, { isLoading: isSyncing }] = useSyncJobStatusMutation();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleCancel = async () => {
    // TODO: Add confirmation dialog
    if (!confirm(`Are you sure you want to cancel job ${job.id}?`)) {
      return;
    }
    try {
      await cancelJob(job.id).unwrap();
      toast.success(`Job ${job.id} cancellation requested.`);
      // Invalidation should update the status in the list automatically
    } catch (err: any) {
      console.error("Failed to cancel job:", err);
      toast.error(err?.data?.message || "Failed to cancel job.");
    }
  };

  const handleSubmit = async () => {
    try {
      await submitJob(job.id).unwrap();
      toast.success(`Job ${job.id} submitted successfully.`);
    } catch (err: any) {
      console.error("Failed to submit job:", err);
      toast.error(err?.data?.message || "Failed to submit job.");
    }
  };

  const handleSyncStatus = async () => {
    try {
      await syncJobStatus(job.id).unwrap();
      toast.success(`Job ${job.id} status sync requested.`);
    } catch (err: any) {
      console.error("Failed to sync job status:", err);
      toast.error(err?.data?.message || "Failed to sync job status.");
    }
  };

  const isActionLoading = isCancelling || isSubmitting || isSyncing;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon" disabled={isActionLoading}>
             {isActionLoading ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconDotsVertical />}
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40"> {/* Increased width */}
          <DropdownMenuItem onClick={() => setIsDetailModalOpen(true)} disabled={isActionLoading}>
             View Details
          </DropdownMenuItem>
           {/* Submit Action (only for pending) */}
           {job.status === "pending" && (
            <DropdownMenuItem onClick={handleSubmit} disabled={isSubmitting || isActionLoading}>
               {isSubmitting ? (
                 <><IconLoader className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
               ) : (
                 <><IconSend className="mr-2 h-4 w-4" />Submit Job</>
               )}
             </DropdownMenuItem>
           )}
           {/* Cancel Action (only for pending/running/queued) */}
           {(job.status === "running" || job.status === "pending" || job.status === "queued") && 
             <DropdownMenuItem onClick={handleCancel} disabled={isCancelling || isActionLoading}>
               {isCancelling ? (
                 <><IconLoader className="mr-2 h-4 w-4 animate-spin" />Cancelling...</>
               ) : (
                 'Cancel Job' // Simple text for now
               )}
             </DropdownMenuItem>
           }
           {/* Sync Status Action */}
           <DropdownMenuItem onClick={handleSyncStatus} disabled={isSyncing || isActionLoading}>
              {isSyncing ? (
                 <><IconLoader className="mr-2 h-4 w-4 animate-spin" />Syncing...</>
               ) : (
                 <><IconRefresh className="mr-2 h-4 w-4" />Sync Status</>
               )}
           </DropdownMenuItem>
           {/* Retry Action (Placeholder) */}
           {job.status === "failed" && 
             <DropdownMenuItem onClick={() => alert(`Retry ${job.id}`)} disabled={isActionLoading}>Retry Job</DropdownMenuItem> 
           }
          <DropdownMenuItem onClick={() => alert(`View Logs for ${job.id}`)} disabled={isActionLoading}>View Logs</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => alert(`Delete ${job.id}`)} disabled={isActionLoading}>Delete Job</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Render the modal */}
      <JobDetailsModal 
        jobId={job.id} 
        isOpen={isDetailModalOpen} 
        onOpenChange={setIsDetailModalOpen} 
      />
    </>
  );
}

// Define Job Columns (updated for API data)
const jobColumns: ColumnDef<Job>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    // Use jobType or a derived name
    accessorKey: "jobType", 
    header: () => <div className="w-full text-left">Job Type / Name</div>,
    cell: ({ row }) => {
      // Example: derive a display name
      const displayName = `${row.original.jobType} Job (${row.original.id.substring(0, 6)})`;
      // TODO: Link to Job Detail Page or use JobCellViewer if implemented
      return <div className="font-medium">{displayName}</div>;
    },
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: () => <div className="w-full text-left">Status</div>,
    cell: ({ row }) => { 
      const status = row.original.status;
      let IconComponent: React.ElementType | null = null;
      let badgeClass = "";

      switch (status) {
        case "completed":
          IconComponent = IconCircleCheckFilled;
          badgeClass = "bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-100";
          break;
        case "running":
           IconComponent = IconPlayerPlayFilled; // Running icon
           badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-100 animate-pulse"; // Pulsing blue
           break;
        case "failed":
          IconComponent = IconAlertCircleFilled;
          badgeClass = "bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-100";
          break;
        case "cancelled":
          IconComponent = IconX; // Cancelled icon
          badgeClass = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
          break;
        case "pending":
        case "queued": // Group pending and queued
        default:
          IconComponent = IconClockHour4Filled; // Pending/Queued icon
          badgeClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-100";
          break;
      }

      return (
        <Badge
          variant="outline"
          className={`border-transparent px-2.5 py-0.5 text-xs capitalize ${badgeClass}`}
        >
          <div className="flex items-center gap-1">
            {IconComponent && <IconComponent aria-hidden="true" className="h-3.5 w-3.5" />}
            {status}
          </div>
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: () => <div className="text-right">Created</div>,
    cell: ({ row }) => <div className="text-right">{new Date(row.original.createdAt).toLocaleDateString()}</div>,
  },
  {
    // TODO: Calculate duration if needed, or remove column
    id: "duration",
    header: () => <div className="text-right pr-8">Duration</div>,
    cell: ({ row }) => {
       const duration = row.original.startedAt && row.original.completedAt 
         ? `${Math.round((new Date(row.original.completedAt).getTime() - new Date(row.original.startedAt).getTime()) / 1000)}s` 
         : (row.original.status === 'running' && row.original.startedAt) 
           ? `${Math.round((Date.now() - new Date(row.original.startedAt).getTime()) / 1000)}s+`
           : '-';
       return <div className="text-right pr-8">{duration}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => { 
        return <JobActions job={row.original} />; // Use the JobActions component
    },
  },
]

// Draggable Row (update id type)
function DraggableRow({ row }: { row: Row<Job> }) { 
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id, // Use string ID
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  )
}

// Update props to accept API Job type
interface JobsTableProps {
  data: Job[];
  // actionButton?: React.ReactNode; // Keep if needed, remove if actions handled in row
}

export function JobsTable({ data: initialData }: JobsTableProps) {
  const [data, setData] = React.useState(() => initialData)
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const sortableId = React.useId()
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))

  // Update dataIds to use string IDs
  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data?.map(({ id }) => id) || [], [data])

  const table = useReactTable({
    data,
    columns: jobColumns, // Use updated jobColumns
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id, // Use string ID for row ID
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((currentData) => {
        // Find index using string comparison
        const oldIndex = currentData.findIndex(item => item.id === active.id);
        const newIndex = currentData.findIndex(item => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return currentData; 
        return arrayMove(currentData, oldIndex, newIndex);
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between gap-2 px-1">
        {/* Left Side (Placeholder for Filters) */}
        <div className="flex items-center gap-2">
            {/* Add filter controls here later if needed */}
        </div>

        {/* Right Side (Action Button, Columns Button) */}
        <div className="flex items-center gap-2">
          {/* Removed actionButton prop for now, actions are per-row */}

          {/* Column Visibility Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* Match styling from ProjectJobsTable */}
              <Button variant="outline" size="sm" className="h-8">
                <IconLayoutColumns className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                       {/* Attempt to make column names more readable */}
                      {column.id.replace(/_/g, ' ')}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-md border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
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
                <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                  {table.getRowModel().rows.map((row) => (
                    <DraggableRow key={row.id} row={row} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell colSpan={jobColumns.length} className="h-24 text-center">
                    No jobs found for this project.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Pagination Controls */} 
      <div className="flex items-center justify-end space-x-2 py-4"> {/* Use justify-end */} 
        <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
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
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
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
    </div>
  )
}

// Remove TableCellViewer component (or adapt if needed for Job details)
/*
function TableCellViewer({ item }: { item: z.infer<typeof jobSchema> & { name: string } }) {
  // ... implementation specific to viewing Job details ...
}
*/
