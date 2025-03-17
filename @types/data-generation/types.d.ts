/**
 * Type declarations for data generation
 */

declare module '@/lib/models/data-generation/types' {
  export interface JobConfiguration {
    name?: string;
    description?: string;
    schemaId?: string;
    schema?: Record<string, unknown>;
    count?: number;
    format?: 'json' | 'csv' | 'ndjson';
    options?: Record<string, unknown>;
    [key: string]: unknown;
  }
  
  export interface JobCreationResponse {
    jobId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    message?: string;
  }
  
  export interface JobDetails {
    id: string;
    name?: string;
    description?: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    error?: string;
    createdAt: string | Date;
    startedAt?: string | Date;
    completedAt?: string | Date;
    config?: JobConfiguration;
    result?: Record<string, unknown>;
  }
  
  export interface JobStatus {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: {
      percentComplete: number;
      currentStep?: string;
      stepsCompleted?: number;
      totalSteps?: number;
    };
    error?: {
      message: string;
      code?: string;
      details?: unknown;
    };
  }
  
  export interface RateLimitStatus {
    currentUsage: number;
    limit: number;
    resetTime?: string | number | Date;
    available?: boolean;
    limitReached?: boolean;
    refillTime?: string | number | Date;
    limitType?: string;
    description?: string;
  }
}

// Also support the relative path import
declare module '../../models/data-generation/types' {
  export * from '@/lib/models/data-generation/types';
}

declare module '@/lib/models/data-generation/job-state-machine' {
  export interface JobStateMachine {
    getState(jobId: string): string;
    canTransition(jobId: string, targetState: string): boolean;
    transition(jobId: string, targetState: string): boolean;
  }
  
  export interface JobStateMachineState {
    state: string;
    allowedTransitions: string[];
  }
  
  export function createJobStateMachine(): JobStateMachine;
}

// Also support the relative path import
declare module '../../models/data-generation/job-state-machine' {
  export * from '@/lib/models/data-generation/job-state-machine';
}
