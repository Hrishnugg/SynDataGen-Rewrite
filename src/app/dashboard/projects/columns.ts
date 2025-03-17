/**
 * Project Type Definition and Column Configuration
 * 
 * This module defines the Project interface and related column configurations
 * for project data tables and other components.
 */

import { ColumnDef } from "@tanstack/react-table";

/**
 * Project interface defining the structure of a project in the system
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId?: string;
  creatorName?: string;
  status: 'active' | 'archived' | 'deleted';
  jobCount?: number;
  lastRunAt?: Date;
  settings?: Record<string, any>;
  // Additional properties used in the codebase
  customerId?: string;
  storage?: {
    bucket?: string;
    bucketName?: string;
    folder?: string;
    region?: string;
    usedStorage?: number;
    isMock?: boolean;
  };
  metadata?: {
    apiCreditsUsed?: number;
    apiCreditsRemaining?: number;
    estimatedRemainingCapacity?: number;
    storageUsed?: number;
  };
  owner?: string | { userId: string; role: string };
  teamMembers?: Array<string | { userId: string; role: string }>;
}

/**
 * Column definitions for the project data table
 */
export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
  },
  {
    accessorKey: "updatedAt",
    header: "Last Modified",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "jobCount",
    header: "Jobs",
  }
];
