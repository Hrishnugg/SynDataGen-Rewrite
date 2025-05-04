export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

// Simplified Job type for frontend list/display - expand as needed from OpenAPI spec
export interface Job {
  id: string;
  projectId: string;
  userId: string; // ID of user who created the job
  status: JobStatus;
  jobType: string;
  jobConfig: string; // Likely JSON string or object
  pipelineJobID?: string;
  resultURI?: string;
  error?: string;
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  startedAt?: string; // ISO Date string
  completedAt?: string; // ISO Date string
}

// Request/Response types
export interface CreateJobRequest {
  projectId: string; // Needed by backend service, though maybe redundant if passed in URL
  jobType: string;
  jobConfig: string;
}

export interface ListJobsParams {
  // projectId: string; // Passed in URL
  limit?: number;
  offset?: number;
  // status?: JobStatus; // Add if backend supports status filtering for jobs
}

export interface ListJobsResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

// Type matching backend ListJobsAcrossProjects response structure
export interface ListAllJobsResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

// Params for the listAll query
export interface ListAllJobsParams {
  limit?: number;
  offset?: number;
  statusFilter?: JobStatus; // Corresponds to backend statusFilter
} 