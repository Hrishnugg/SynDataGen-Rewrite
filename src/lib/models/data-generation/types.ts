/**
 * Data Generation Types
 * 
 * This file defines the core types used throughout the data generation system.
 */

/**
 * Job Status Value
 * Represents the possible status values a job can have
 */
export type JobStatusValue = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'pending' | 'accepted' | 'rejected';

/**
 * Job Progress
 */
export interface JobProgress {
  percentComplete: number;
  currentStep?: string;
  stepsCompleted?: number;
  totalSteps?: number;
  startTime?: Date;
  endTime?: Date | null;
  estimatedTimeRemaining?: number;
}

/**
 * Job Progress Type
 * This type allows for both simple number progress and detailed JobProgress objects
 */
export type JobProgressType = number | JobProgress;

/**
 * Job Error
 * Represents an error that occurred during job execution
 */
export interface JobError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Job Status
 * Represents the current status of a job
 */
export interface JobStatus {
  id: string;
  jobId: string;
  status: JobStatusValue;
  progress: JobProgressType;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: JobError;
  stages?: JobStage[];
  name?: string;
  startTime?: Date;
  configuration?: JobConfiguration;
  customerId?: string;
  projectId?: string;
}

/**
 * JobDetails extends JobStatus-like properties with additional fields used in the application
 * Note: We don't directly extend JobStatus due to Date vs string type conflicts
 */
export interface JobDetails {
  id: string;
  name: string;
  status: JobStatusValue;
  progress: JobProgressType;
  recordsGenerated: number;
  createdAt: string;
  completedAt?: string;
  startedAt?: string;
  updatedAt?: string;
  targetRecords?: number;
  outputFormat?: string;
  configuration?: JobConfiguration;
  config?: any; // Added for backward compatibility
  logs?: Array<any>;
  metadata?: any;
  fileSizes?: Record<string, number>;
  schema?: any;
  customerId?: string;
  projectId?: string;
  createdBy?: string;
  error?: JobError;
  stages?: JobStage[];
  description?: string; 
  retentionPeriod?: {
    expiresAt: string; // ISO date string
    canExtend: boolean;
    extensionPeriodDays?: number;
  };
  jobId?: string; // Added to be compatible with JobStatus
}

/**
 * Job Stage 
 */
export interface JobStage {
  name: string;
  status: JobStatusValue;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: JobError;
}

/**
 * Job Configuration
 */
export interface JobConfiguration {
  // Basic configuration
  dataType: string;            // Type of data to generate
  dataSize: number;            // Size of data to generate in bytes
  
  // Format configuration
  inputFormat?: string;        // Input data format
  outputFormat?: string;       // Output data format
  
  // Storage Configuration
  inputBucket?: string;        // Project-specific bucket for input data
  outputBucket?: string;       // Project-specific bucket for output data
  inputPath?: string;          // Path to input data in bucket
  outputPath?: string;         // Path for output data in bucket
  
  // Job Control
  isAsync?: boolean;          // Whether to process asynchronously
  timeout?: number;           // Maximum job runtime in seconds
  resumeWindow?: number;      // Time window for job resumption in seconds
  
  // Additional fields
  projectId?: string;
  datasetName?: string;
  recordCount?: number;
  schema?: {
    fields: Array<{
      name: string;
      type: string;
      rules?: {
        [key: string]: any;
        pattern?: string;
      };
    }>;
  };
  format?: string;
  outputLocation?: string;
  
  // Fields needed by security.ts
  name?: string;              // Name of the job
  description?: string;       // Description of the job
  
  // Advanced Configuration (Extensible)
  parameters?: Record<string, any>;  // Additional pipeline-specific parameters
}

/**
 * Job Creation Response
 */
export interface JobCreationResponse {
  jobId: string;
  status: string;
  message: string;
  timestamp?: string;
}

/**
 * Pipeline Health
 * Represents the health status of the pipeline
 */
export interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: string;
  metrics: {
    activeJobs: number;
    queuedJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTimeMs: number;
  };
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTimeMs: number;
}

/**
 * Webhook Configuration
 */
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  projectId?: string;
  customerId?: string;
  description?: string;
}

/**
 * Webhook Payload
 */
export interface WebhookPayload {
  event: string;
  jobId: string;
  timestamp: string;
  customerId: string;
  projectId?: string;
  status?: JobStatusValue;
  data?: any;
}

/**
 * Metadata about a data generation job
 */
export interface JobMetadata {
  inputSize?: number;
  retryCount?: number;
}

/**
 * Rate limit status for a customer
 */
export interface RateLimitStatus {
  customerId?: string;
  currentJobs: number;
  maxJobs: number;
  cooldownPeriod: number;
  cooldownJobs?: {            // Jobs currently in cooldown
    jobId: string;
    cooldownUntil: Date;
  }[];
}

/**
 * Retention policy for job data
 */
export interface RetentionPolicy {
  customerId: string;
  retentionDays: number;
  lastUpdated: Date;
}

/**
 * Job Data
 */
export interface JobData<T = any> {
  parameters: T;
  options?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Job Results
 */
export interface JobResult<T = any> {
  data: T;
  metadata?: Record<string, unknown>;
  stats?: {
    duration: number;
    processedItems: number;
    errors: number;
    warnings: number;
  };
  duration: number;
  processedItems: number;
  errors: number;
  warnings: number;
}

/**
 * Job object
 */
export interface Job<TData = any, TResult = any> {
  id: string;
  type: string;
  name?: string;
  description?: string;
  status: JobStatusValue;
  projectId?: string;
  customerId?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: JobProgressType;
  data?: JobData<TData>;
  result?: JobResult<TResult>;
  error?: JobError;
  tags?: string[];
  priority?: number;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Job Filter
 */
export interface JobFilter {
  type?: string;
  status?: JobStatusValue;
  projectId?: string;
  customerId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  tags?: string[];
}

/**
 * Job Update
 */
export interface JobUpdate<TData = any, TResult = any> {
  status?: JobStatusValue;
  progress?: JobProgressType;
  data?: Partial<JobData<TData>>;
  result?: Partial<JobResult<TResult>>;
  error?: JobError;
  tags?: string[];
  priority?: number;
  name?: string;
  description?: string;
}

/**
 * Job Creation Options
 */
export interface JobCreationOptions {
  priority?: number;
  tags?: string[];
  startImmediately?: boolean;
}

/**
 * Performance Test Progress
 */
export interface PerformanceTestProgress {
  percentComplete: number;
  currentStep: string;
  elapsedTime: number;
  estimatedTimeRemaining?: number;
  jobsCreated?: number;
  totalJobs?: number;
  jobsCompleted?: number;
  jobsFailed?: number;
  activeJobs?: number;
  rateLimitHits?: number;
  averageResponseTimeMs?: number;
  elapsedTimeMs?: number;
}

/**
 * Performance Test Results
 */
export interface PerformanceTestResults {
  throughput: number;
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  successRate: number;
  duration: number;
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  metrics: Record<string, any>;
  responseTimesMs?: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  testDurationMs?: number;
  jobsCreated?: number;
  jobsCompleted?: number;
  errors?: {
    count: number;
    byType: Record<string, number>;
  };
}

/**
 * Performance Test Configuration
 */
export interface PerformanceTestConfig {
  concurrency: number;
  duration: number;
  rampUp?: number;
  targetRPS?: number;
  testType: 'load' | 'stress' | 'soak' | 'spike';
  endpoint?: string;
  payloadSize?: number;
  dataType?: string;
  concurrentUsers?: number;
  jobsPerUser?: number;
  delayBetweenJobsMs?: number;
  maxTestDurationMs?: number;
  jobTemplate?: any;
  onProgress?: (progress: PerformanceTestProgress) => void;
  onComplete?: (results: PerformanceTestResults) => void;
  onError?: (error: any) => void;
}

// Export a namespace for backward compatibility
export * from './job-state-machine';