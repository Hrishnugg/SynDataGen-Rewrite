/**
 * Job Management Service Interface
 * 
 * This file defines the interface for the Job Management service.
 * All implementations should adhere to this interface.
 */

import { 
  JobStatusValue, 
  JobStatus, 
  JobProgress,
  JobProgressType,
  JobError, 
  JobData, 
  JobFilter,
  JobUpdate,
  JobCreationOptions, 
  Job,
  RateLimitStatus
} from '@/lib/models/data-generation';

// Re-export these types for use in other files
export type { Job, JobStatus };

/**
 * Job Management Service Error
 */
export class JobManagementServiceError extends Error {
  constructor(message: string, public code?: string, public details?: unknown) {
    super(message);
    this.name = 'JobManagementServiceError';
  }
}

/**
 * Job Management Service Interface
 */
export interface IJobManagementService<TData = unknown, TResult = unknown> {
  /**
   * Create a new job
   * @param type Job type
   * @param data Job data
   * @param options Creation options
   */
  createJob(
    type: string, 
    data?: JobData<TData>, 
    options?: JobCreationOptions
  ): Promise<Job<TData, TResult>>;

  /**
   * Get a job by ID
   * @param id Job ID
   */
  getJob(id: string): Promise<Job<TData, TResult> | null>;

  /**
   * Update a job
   * @param id Job ID
   * @param updates Job updates
   */
  updateJob(
    id: string, 
    updates: JobUpdate<TData, TResult>
  ): Promise<Job<TData, TResult> | null>;

  /**
   * Update job status
   * @param id Job ID
   * @param statusUpdate Status update containing new status
   */
  updateJobStatus(
    id: string,
    statusUpdate: { status: JobStatusValue }
  ): Promise<boolean>;

  /**
   * List jobs with filtering
   * @param filter Job filter
   * @param page Page number
   * @param pageSize Page size
   */
  listJobs(
    filter?: JobFilter,
    page?: number,
    pageSize?: number
  ): Promise<{
    jobs: Job<TData, TResult>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;

  /**
   * Start a job
   * @param id Job ID
   */
  startJob(id: string): Promise<boolean>;

  /**
   * Pause a job
   * @param id Job ID
   */
  pauseJob(id: string): Promise<boolean>;

  /**
   * Subscribe to job updates
   * @param id Job ID
   * @param callback Callback function
   */
  subscribeToJobUpdates(
    id: string,
    callback: (job: Job<TData, TResult>) => void
  ): () => void;

  /**
   * Check rate limit for a customer
   * @param customerId Customer ID
   */
  checkRateLimit(customerId: string): Promise<boolean>;

  /**
   * Get all jobs (with optional filtering)
   * @param filter Job filter
   */
  getJobs(
    filter?: JobFilter
  ): Promise<Job<TData, TResult>[]>;

  /**
   * Cancel a job
   * @param id Job ID
   */
  cancelJob(id: string): Promise<boolean>;

  /**
   * Delete a job
   * @param id Job ID
   */
  deleteJob(id: string): Promise<boolean>;

  /**
   * Get job status
   */
  getJobStatus(id: string): Promise<{
    id: string;
    status: JobStatusValue;
    progress?: JobProgressType;
    error?: JobError;
    createdBy: string;
  } | null>;

  /**
   * Get rate limit status for a customer
   * @param customerId Customer ID
   */
  getRateLimitStatus(customerId: string): Promise<RateLimitStatus>;

  /**
   * Get retention policy for a customer
   * @param customerId Customer ID
   */
  getRetentionPolicy(customerId: string): Promise<{
    customerId: string;
    retentionDays: number;
    lastUpdated: Date;
  }>;

  /**
   * Get job retention policy for a customer
   * @param customerId Customer ID
   */
  getJobRetentionPolicy(customerId: string): Promise<number>;

  /**
   * Set job retention policy for a customer
   * @param customerId Customer ID
   * @param retentionDays Number of days to retain jobs
   */
  setJobRetentionPolicy(customerId: string, retentionDays: number): Promise<boolean>;
}
