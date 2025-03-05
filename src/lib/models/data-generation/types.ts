/**
 * Data Generation Job Types and Interfaces
 * 
 * This module defines the core types and interfaces for the data generation system.
 */

/**
 * Configuration for a data generation job
 */
export interface JobConfiguration {
  // Core Parameters
  dataType: string;           // Type of data to generate
  dataSize: number;           // Size of the dataset to generate
  inputFormat: string;        // Format of input data (CSV, JSON, Parquet, etc.)
  outputFormat: string;       // Format of output data (matching input format)
  
  // Storage Configuration
  inputBucket: string;        // Project-specific bucket for input data
  outputBucket: string;       // Project-specific bucket for output data
  inputPath: string;          // Path to input data in bucket
  outputPath: string;         // Path for output data in bucket
  
  // Job Control
  isAsync: boolean;          // Whether to process asynchronously
  timeout: number;           // Maximum job runtime in seconds
  resumeWindow: number;      // Time window for job resumption in seconds
  
  // Advanced Configuration (Extensible)
  parameters: Record<string, any>;  // Additional pipeline-specific parameters
}

/**
 * Status of a data generation job stage
 */
export interface JobStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  progress?: number;
}

/**
 * Error information for a data generation job
 */
export interface JobError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Metadata about a data generation job
 */
export interface JobMetadata {
  inputSize: number;          // Size of input data in bytes
  outputSize?: number;        // Size of output data in bytes
  processingTime?: number;    // Total processing time in milliseconds
  retryCount: number;         // Number of retries attempted
  expirationDate?: Date;      // When this job record will be deleted (6 months by default)
}

/**
 * Status of a data generation job
 */
export interface JobStatus {
  jobId: string;
  customerId: string;         // Owner of the job
  projectId: string;          // Project the job belongs to
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;           // Percentage complete (0-100)
  startTime: Date;
  endTime?: Date;
  lastUpdated: Date;
  error?: JobError;
  stages: JobStage[];
  metadata: JobMetadata;
  configuration: JobConfiguration;  // The original job configuration
}

/**
 * Rate limit status for a customer
 */
export interface RateLimitStatus {
  customerId: string;
  currentJobs: number;        // Number of currently running jobs
  maxJobs: number;            // Maximum allowed concurrent jobs (default: 5)
  cooldownPeriod: number;     // Cooldown period in seconds after cancellation (default: 30-60)
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
  retentionDays: number;      // Number of days to retain job history (default: 180 days)
  lastUpdated: Date;
}

/**
 * Response from a job creation request
 */
export interface JobCreationResponse {
  jobId: string;
  status: 'accepted' | 'rejected';
  message?: string;
}

/**
 * Configuration for a webhook
 */
export interface WebhookConfig {
  url: string;               // Webhook destination URL
  secret: string;            // Secret for signing webhook payloads
  events: ('job.created' | 'job.updated' | 'job.completed' | 'job.failed')[];
}

/**
 * Payload for a webhook event
 */
export interface WebhookPayload {
  event: string;
  jobId: string;
  timestamp: string;
  data: JobStatus;
  signature: string;        // HMAC signature of the payload for verification
}

/**
 * Health status of the pipeline
 */
export interface PipelineHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  metrics?: Record<string, number>;
  timestamp: Date;
} 