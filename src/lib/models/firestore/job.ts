/**
 * Firestore Data Generation Job Model
 * 
 * Represents a data generation job in the SynDataGen platform.
 */

import { Timestamp } from 'firebase-admin/firestore';

export const JOB_COLLECTION = 'jobs';

/**
 * Job status options
 */
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Job output format options
 */
export type OutputFormat = 'csv' | 'json' | 'parquet';

/**
 * Data quality level options
 */
export type DataQuality = 'draft' | 'production';

/**
 * Firestore Data Generation Job document structure
 */
export interface DataGenerationJob {
  id: string;            // Unique job identifier
  projectId: string;     // Reference to the project
  customerId: string;    // Reference to the customer
  name: string;          // Job name
  description: string;   // Job description
  createdAt: Timestamp;  // Creation timestamp
  status: JobStatus;
  gcpJobId?: string;     // GCP job identifier
  
  // Job configuration
  config: {
    inputDataset?: {
      storageUri?: string;  // URI to input data in the bucket
      format?: string;      // Data format
    };
    parameters: {
      dataType: string;    // Type of data to generate
      recordCount: number; // Number of records to generate
      format: OutputFormat; // Output format
      quality: DataQuality; // Data quality level
      schema: Record<string, any>; // Data schema specification
    };
    outputConfig: {
      destination: string; // Output destination path in bucket
    };
  };
  
  // Progress tracking
  progress: {
    status: string;
    percentComplete: number;
    startTime?: Timestamp;
    endTime?: Timestamp;
    error?: {
      code: string;
      message: string;
    };
  };
  
  metadata?: Record<string, any>; // Flexible metadata field
}

/**
 * Input for creating a new data generation job
 */
export interface CreateJobInput {
  name: string;
  description: string;
  projectId: string;
  customerId: string;
  inputDataset?: {
    storageUri?: string;
    format?: string;
  };
  parameters: {
    dataType: string;
    recordCount: number;
    format: OutputFormat;
    quality: DataQuality;
    schema: Record<string, any>;
  };
  outputConfig: {
    destination: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Creates a default job progress object
 */
export function createDefaultJobProgress(): DataGenerationJob['progress'] {
  return {
    status: 'Initializing',
    percentComplete: 0,
    startTime: Timestamp.now()
  };
} 