/**
 * Project Type Definitions
 * 
 * This file contains types and interfaces for projects and related functionality.
 */

/**
 * Storage configuration for a project
 */
export interface Storage {
  bucketName: string;
  region: string;
  usedStorage: number;
  isMock?: boolean;
}

/**
 * Project entity definition
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId?: string;
  creatorName?: string;
  status: "active" | "archived" | "deleted";
  jobCount?: number;
  customerId?: string;
  lastJobDate?: Date;
  lastRunAt?: Date;
  storage?: Storage;
  settings?: Record<string, any>;
  teamMembers?: Array<string | { userId: string; role: string }>;
}
