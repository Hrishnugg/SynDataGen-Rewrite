/**
 * DataTable Component
 * 
 * An Excel/Sheets-like component for viewing tabular data with features like
 * column resizing, sorting, filtering, and pagination.
 */

import React, { useState, useEffect } from 'react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ChevronDown, ChevronUp, Filter, Download, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface DataTableProps {
  data: Record<string, any>[];
  isLoading?: boolean;
  onDownload?: (format: 'csv' | 'json' | 'parquet') => void;
  columns?: Record<string, any>[];
  pagination?: {
    pageSize: number;
    pageIndex: number;
  };
}

export function DataTable({ data, isLoading = false, onDownload, columns, pagination }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(pagination?.pageIndex || 1);
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 10);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [tableColumns, setTableColumns] = useState<string[]>(columns ? Object.keys(columns) : []);
  
  // Extract column names from data
  useEffect(() => {
    if (data.length > 0 && !columns) {
      setTableColumns(Object.keys(data[0]));
    }
  }, [data, columns]);
  
  // Apply sorting
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue === bValue) return 0;
      
      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime() 
          : bValue.getTime() - aValue.getTime();
      }
      
      // Default string comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      return sortDirection === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortColumn, sortDirection]);
  
  // Apply filters
  const filteredData = React.useMemo(() => {
    return sortedData.filter(row => {
      return Object.entries(filters).every(([column, filterValue]) => {
        if (!filterValue) return true;
        
        const cellValue = row[column];
        if (cellValue === null || cellValue === undefined) return false;
        
        return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
      });
    });
  }, [sortedData, filters]);
  
  // Paginate data
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);
  
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  
  // Handle sort toggle
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Handle filter change
  const handleFilterChange = (column: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };
  
  // Detect data type for a column
  const detectColumnType = (column: string): 'string' | 'number' | 'date' | 'boolean' => {
    if (data.length === 0) return 'string';
    
    const sample = data[0][column];
    
    if (typeof sample === 'number') return 'number';
    if (typeof sample === 'boolean') return 'boolean';
    if (sample instanceof Date) return 'date';
    
    // Try to detect if string is actually a date
    if (typeof sample === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/;
      if (datePattern.test(sample)) return 'date';
    }
    
    return 'string';
  };
  
  // Format cell value based on type
  const formatCellValue = (value: any, column: string): string => {
    if (value === null || value === undefined) return '';
    
    const type = detectColumnType(column);
    
    switch (type) {
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value);
      case 'date':
        try {
          const date = value instanceof Date ? value : new Date(value);
          return date.toLocaleString();
        } catch (e) {
          return String(value);
        }
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  };
  
  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {[1, 2, 3, 4, 5].map(i => (
                  <TableHead key={i}>
                    <Skeleton className="h-6 w-full" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map(row => (
                <TableRow key={row}>
                  {[1, 2, 3, 4, 5].map(col => (
                    <TableCell key={`${row}-${col}`}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-10 w-[300px]" />
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (data.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredData.length} rows
          </span>
          
          {Object.entries(filters).map(([column, value]) => 
            value ? (
              <Badge key={column} variant="outline" className="flex gap-1 items-center">
                {column}: {value}
                <button 
                  onClick={() => handleFilterChange(column, '')}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ) : null
          )}
          
          {Object.values(filters).some(Boolean) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setFilters({});
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
        
        {onDownload && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDownload('csv')}>
                Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload('json')}>
                Download as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload('parquet')}>
                Download as Parquet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {tableColumns.map(column => (
                <TableHead key={column} className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSort(column)}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      {column}
                      {sortColumn === column ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Filter className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <div className="p-2">
                          <Input
                            placeholder={`Filter ${column}...`}
                            value={filters[column] || ''}
                            onChange={e => handleFilterChange(column, e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleFilterChange(column, '')}>
                          Clear Filter
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {tableColumns.map(column => (
                  <TableCell key={`${rowIndex}-${column}`}>
                    {formatCellValue(row[column], column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Rows per page:
          </span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            {[10, 25, 50, 100].map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = currentPage <= 3
                ? i + 1
                : currentPage + i - 2;
                
              if (pageNum > totalPages) return null;
              
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setCurrentPage(pageNum)}
                    isActive={currentPage === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
} 