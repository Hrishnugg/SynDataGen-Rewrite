'use client'

import * as React from "react"
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
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconPlus,
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

// Define Job Schema
export const jobSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(["Active", "Archived", "Error"]), // Use enum for defined statuses
  createdDate: z.string(),
  duration: z.string(),
  // Removed projectId as it's not displayed in the table
})

type Job = z.infer<typeof jobSchema>;

export type { ColumnDef } from "@tanstack/react-table";

// Drag Handle (Keep as is)
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  })
  return (
    <Button {...attributes} {...listeners} variant="ghost" size="icon" className="text-muted-foreground size-7 cursor-grab active:cursor-grabbing hover:bg-transparent">
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

// Define Job Columns
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
    accessorKey: "name",
    header: () => <div className="w-full text-left">Job Name</div>,
    // Potentially wrap name in a Button/Link to open details later
    cell: ({ row }) => <div className="text-left font-medium">{row.original.name}</div>,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: () => <div className="w-full text-left">Status</div>,
    cell: ({ row }) => { // Keep the existing status badge logic
      const status = row.original.status;
      return (
        <Badge
          variant="outline"
          className={`border-transparent px-2.5 py-0.5 text-xs 
            ${
              status === "Active"
                ? "bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-100"
                : status === "Archived"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-100"
                  : "bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-100"
            }`}
        >
          <div className="flex items-center gap-1">
            {status === "Active" && (
              <IconCircleCheckFilled aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {status === "Archived" && (
              <IconAlertTriangleFilled aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {status === "Error" && (
              <IconAlertCircleFilled aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {status}
          </div>
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdDate",
    header: () => <div className="text-right">Created Date</div>,
    cell: ({ row }) => <div className="text-right">{row.original.createdDate}</div>,
  },
  {
    accessorKey: "duration",
    header: () => <div className="text-right pr-8">Duration</div>,
    cell: ({ row }) => <div className="text-right pr-8">{row.original.duration}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => { // Add Job-specific actions
        const job = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon">
                <IconDotsVertical />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => alert(`View details for ${job.name}`)}>View Details</DropdownMenuItem>
              {job.status === "Active" && <DropdownMenuItem onClick={() => alert(`Cancel ${job.name}`)}>Cancel Job</DropdownMenuItem>}
              {job.status === "Error" && <DropdownMenuItem onClick={() => alert(`Retry ${job.name}`)}>Retry Job</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => alert(`View Logs for ${job.name}`)}>View Logs</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => alert(`Delete ${job.name}`)}>Delete Job</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
    },
  },
]

// Draggable Row (Keep as is, but update type)
function DraggableRow({ row }: { row: Row<Job> }) { // Update type to Job
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
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

// Rename Component and update props
export function JobsTable({
  data: initialData,
}: {
  data: Job[] // Update prop type to Job[]
}) {
  const [data, setData] = React.useState(() => initialData)
  // Reset state when initialData changes (important if data comes from server)
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10, // Default page size
  })
  const sortableId = React.useId()
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}))

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data?.map(({ id }) => id) || [], [data])

  const table = useReactTable({
    data,
    columns: jobColumns, // Use jobColumns
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
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
        const oldIndex = currentData.findIndex(item => item.id === active.id);
        const newIndex = currentData.findIndex(item => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return currentData; // Should not happen if IDs are correct
        return arrayMove(currentData, oldIndex, newIndex);
      })
    }
  }

  // Remove the outer Tabs component unless specific filtering/view tabs are needed *within* the table
  return (
    <div className="flex flex-col gap-4">
       {/* Removed the TabsList/Select for internal views like "Outline" from original table */}
      <div className="flex items-center justify-end gap-2 px-1">
           {/* Column Visibility Dropdown (Keep) */}
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
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
          {/* Add Filter button if needed */}
      </div>
      {/* Removed TabsContent wrapper */}
      <div className="overflow-hidden rounded-lg border">
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
      {/* Pagination Controls (Keep) */}
      <div className="flex items-center justify-between px-2">
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
