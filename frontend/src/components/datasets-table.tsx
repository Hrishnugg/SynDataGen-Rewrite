'use client'

import * as React from "react"
import { useRouter, useParams } from 'next/navigation';
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
  IconDownload,
  IconFileDescription,
  IconTrash,
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
import { formatBytes } from "@/lib/utils"

// Define DatasetSummary Type (matching projectApiSlice)
interface DatasetSummary {
  name: string;
  size: number; // bytes
  lastUpdated: string; // ISO string
  uri: string;
}

// Remove schema and old type
// export const datasetSchema = z.object({ ... });
// type Dataset = z.infer<typeof datasetSchema>;

export type { ColumnDef } from "@tanstack/react-table";

// Remove DragHandle if not needed for datasets

// Define Dataset Columns based on DatasetSummary
const datasetColumns: ColumnDef<DatasetSummary>[] = [
  // Remove drag column if not needed
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
    header: () => <div className="w-full text-left">Dataset Name</div>,
    // Add link to download? Or just display name?
    cell: ({ row }) => <div className="text-left font-medium truncate">{row.original.name}</div>,
    enableHiding: false,
  },
  // Add/remove columns as needed
  // { 
  //   accessorKey: "type", // Not available in ObjectSummary
  //   header: () => <div className="text-center">Type</div>,
  //   cell: ({ row }) => <div className="text-center"><Badge variant="secondary">{row.original.type}</Badge></div>,
  // },
  // { 
  //   accessorKey: "rowCount", // Not available in ObjectSummary
  //   header: () => <div className="text-right">Rows</div>,
  //   cell: ({ row }) => <div className="text-right font-medium">{row.original.rowCount.toLocaleString()}</div>,
  // },
  {
    accessorKey: "size",
    header: () => <div className="text-right">Size</div>,
    // Format size from bytes
    cell: ({ row }) => <div className="text-right font-medium">{formatBytes(row.original.size)}</div>,
  },
  {
    accessorKey: "lastUpdated",
    header: () => <div className="text-right pr-4">Last Updated</div>,
    // Format date
    cell: ({ row }) => <div className="text-right pr-4">{new Date(row.original.lastUpdated).toLocaleString()}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
        const dataset = row.original;
        // Function to handle download (replace alert)
        const handleDownload = () => {
            // TODO: Implement actual download logic
            // Maybe requires a signed URL from backend?
            alert(`Download ${dataset.name} from ${dataset.uri}`);
        };
        const handleDelete = () => {
             // TODO: Implement actual delete logic (needs backend endpoint & GCS deletion)
             alert(`Delete ${dataset.name}`);
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon">
                <IconDotsVertical />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleDownload}>
                 <IconDownload className="mr-2 h-4 w-4" /> Download
              </DropdownMenuItem>
              {/* Remove schema view for now */}
              {/* <DropdownMenuItem onClick={() => alert(`View schema for ${dataset.name}`)}> 
                 <IconFileDescription className="mr-2 h-4 w-4" /> View Schema
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                 <IconTrash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
    },
  },
]

// Remove DraggableRow if not using drag-and-drop for datasets

// Update props to accept DatasetSummary[]
interface DatasetsTableProps {
  data: DatasetSummary[]; 
  headerActions?: React.ReactNode;
}

export function DatasetsTable({ data: initialData, headerActions }: DatasetsTableProps) {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;

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

  // Update dataIds type if needed (use dataset name or URI as unique ID if no persistent ID)
  const dataIds = React.useMemo<UniqueIdentifier[]>(() => initialData?.map(({ name }) => name) || [], [initialData]);

  const table = useReactTable({
    data: initialData, // Use initialData directly
    columns: datasetColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.name, // Use name as row ID for now
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

  // ... handleDragEnd (remove if not used) ...

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2"></div>
        <div className="flex items-center gap-2">
          {headerActions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
                      {column.id.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        {/* Remove DndContext if not using drag-and-drop */}
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
                 // Remove SortableContext if not used
                 table.getRowModel().rows.map((row) => {
                   const datasetName = row.original.name;
                   return (
                     // Render simple TableRow if DraggableRow removed
                     <TableRow 
                       key={row.id} 
                       data-state={row.getIsSelected() && "selected"}
                       onClick={() => router.push(`/projects/${projectId}/datasets/${datasetName}`)} 
                       className="cursor-pointer hover:bg-muted/50"
                     >
                       {row.getVisibleCells().map((cell) => (
                         <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                       ))}
                     </TableRow>
                   );
                 })
              ) : (
                <TableRow>
                  <TableCell colSpan={datasetColumns.length} className="h-24 text-center">
                    No datasets found for this project.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        {/* Remove /DndContext */}
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
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
  );
}
