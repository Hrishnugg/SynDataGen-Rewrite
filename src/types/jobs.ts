/**
 * jobs Type Definitions
 * 
 * This file contains type definitions for jobs in the application.
 */


/**
 * Data for a job
 */
export interface JobData {
  parameters?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}


/**
 * Result of a job
 */
export interface JobResult {
  outputs?: Record<string, unknown>;
  metrics?: Record<string, number>;
  logs?: string[];
  metadata?: Record<string, unknown>;
}

