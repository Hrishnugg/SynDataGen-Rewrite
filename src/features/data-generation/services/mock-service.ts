/**
 * Mock Job Management Service
 * 
 * Mock implementation of the JobManagementService interface for development.
 * Instead of returning fake data, it now returns empty data structures to
 * allow for easier testing of UI components.
 */

import { IJobManagementService, JobManagementServiceError } from './job-management-service.interface';
import { 
  Job, 
  JobData, 
  JobUpdate, 
  JobFilter, 
  JobCreationOptions, 
  JobStatusValue, 
  JobProgressType, 
  JobError,
  JobCreationResponse,
  RetentionPolicy,
  RateLimitStatus
} from '@/lib/models/data-generation';

/**
 * Mock Job Management Service
 * 
 * Mock implementation of the JobManagementService
 * Returns empty states instead of mock data
 */
export class MockJobManagementService<TData = unknown, TResult = unknown> implements IJobManagementService {
  private subscriptions: Map<string, Set<(status: JobStatusValue) => void>> = new Map();
  private jobs: Job<TData, TResult>[] = [];

  // Create a job
  async createJob(
    type: string,
    data?: JobData<TData>,
    options?: JobCreationOptions
  ): Promise<Job<TData, TResult>> {
    const id = `job-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const job: Job<TData, TResult> = {
      id,
      type,
      status: options?.startImmediately ? 'running' : 'pending',
      createdAt: now,
      updatedAt: now,
      data: data ? { ...data } : undefined,
      tags: options?.tags || [],
      priority: options?.priority || 0,
      retryCount: 0,
      maxRetries: 3
    };
    
    this.jobs.push(job);
    
    // Simulate job starting if startImmediately is true
    if (options?.startImmediately) {
      setTimeout(() => this.startJob(id), 100);
    }
    
    return job;
  }

  // Get job by ID
  async getJob(id: string): Promise<Job<TData, TResult> | null> {
    const job = this.jobs.find(j => j.id === id);
    return job ? job : null;
  }

  // Update a job
  async updateJob(
    id: string,
    updates: JobUpdate<TData, TResult>
  ): Promise<Job<TData, TResult> | null> {
    const jobIndex = this.jobs.findIndex(j => j.id === id);
    if (jobIndex === -1) return null;
    
    const job = this.jobs[jobIndex];
    
    // Handle result updates with proper type safety
    let updatedResult = job.result;
    if (updates.result) {
      if (job.result) {
        // If job already has a result, merge with updates
        updatedResult = {
          ...job.result,
          data: updates.result.data !== undefined ? updates.result.data : job.result.data,
          metadata: updates.result.metadata !== undefined 
            ? { ...job.result.metadata, ...updates.result.metadata }
            : job.result.metadata,
          stats: updates.result.stats !== undefined
            ? { ...job.result.stats, ...updates.result.stats }
            : job.result.stats,
          duration: updates.result.duration !== undefined ? updates.result.duration : job.result.duration,
          processedItems: updates.result.processedItems !== undefined ? updates.result.processedItems : job.result.processedItems,
          errors: updates.result.errors !== undefined ? updates.result.errors : job.result.errors,
          warnings: updates.result.warnings !== undefined ? updates.result.warnings : job.result.warnings
        };
      } else if (updates.result.data !== undefined) {
        // If job doesn't have a result yet but update has data, create a new result
        const stats = updates.result.stats || {
          duration: 0,
          processedItems: 0,
          errors: 0,
          warnings: 0
        };
        
        updatedResult = {
          data: updates.result.data,
          metadata: updates.result.metadata || {},
          stats,
          duration: updates.result.duration || stats.duration,
          processedItems: updates.result.processedItems || stats.processedItems,
          errors: updates.result.errors || stats.errors,
          warnings: updates.result.warnings || stats.warnings
        };
      }
    }
    
    const updatedJob: Job<TData, TResult> = {
      ...job,
      updatedAt: new Date(),
      status: updates.status !== undefined ? updates.status : job.status,
      progress: updates.progress !== undefined ? updates.progress : job.progress,
      data: updates.data 
        ? { ...job.data, parameters: updates.data.parameters || job.data?.parameters } as JobData<TData>
        : job.data,
      result: updatedResult,
      error: updates.error !== undefined ? updates.error : job.error,
      tags: updates.tags !== undefined ? updates.tags : job.tags,
      priority: updates.priority !== undefined ? updates.priority : job.priority,
      name: updates.name !== undefined ? updates.name : job.name,
      description: updates.description !== undefined ? updates.description : job.description
    };
    
    this.jobs[jobIndex] = updatedJob;
    
    // Notify subscribers
    this.notifySubscribers(id, updatedJob.status);
    
    return updatedJob;
  }

  // Update job status with the correct interface signature
  async updateJobStatus(id: string, statusUpdate: { status: JobStatusValue }): Promise<boolean> {
    const job = await this.getJob(id);
    
    if (!job) {
      return false;
    }
    
    await this.updateJob(id, { status: statusUpdate.status });
    return true;
  }

  // Filter jobs based on criteria
  private filterJobs(jobs: Job<TData, TResult>[], filter?: JobFilter): Job<TData, TResult>[] {
    if (!filter) return [...jobs];

    return jobs.filter(job => {
      // Filter by type
      if (filter.type && job.type !== filter.type) {
        return false;
      }

      // Filter by status
      if (filter.status && job.status !== filter.status) {
        return false;
      }

      // Filter by project ID
      if (filter.projectId && job.projectId !== filter.projectId) {
        return false;
      }

      // Filter by customer ID
      if (filter.customerId && job.customerId !== filter.customerId) {
        return false;
      }

      // Filter by created after date
      if (filter.createdAfter && job.createdAt && job.createdAt < filter.createdAfter) {
        return false;
      }

      // Filter by created before date
      if (filter.createdBefore && job.createdAt && job.createdAt > filter.createdBefore) {
        return false;
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        if (!job.tags) return false;
        
        // Check if any of the filter tags are in the job tags
        const hasMatchingTag = filter.tags.some(tag => job.tags?.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }

  // List jobs with pagination
  async listJobs(
    filter?: JobFilter,
    page?: number,
    pageSize?: number
  ): Promise<{
    jobs: Job<TData, TResult>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const effectivePage = page || 1;
    const effectivePageSize = pageSize || 10;
    
    let filteredJobs = this.filterJobs([...this.jobs], filter);
    
    const total = filteredJobs.length;
    const totalPages = Math.ceil(total / effectivePageSize);
    
    const start = (effectivePage - 1) * effectivePageSize;
    const end = start + effectivePageSize;
    const paginatedJobs = filteredJobs.slice(start, end);
    
    return {
      jobs: paginatedJobs,
      total,
      page: effectivePage,
      pageSize: effectivePageSize,
      totalPages
    };
  }

  // Start a job
  async startJob(id: string): Promise<boolean> {
    return this.updateJobStatus(id, { status: 'running' });
  }

  // Pause a job
  async pauseJob(id: string): Promise<boolean> {
    return this.updateJobStatus(id, { status: 'paused' });
  }

  // Subscribe to job updates
  subscribeToJobUpdates(
    id: string,
    callback: (job: Job<TData, TResult>) => void
  ): () => void {
    // Create a new subscription set if it doesn't exist
    if (!this.subscriptions.has(id)) {
      this.subscriptions.set(id, new Set());
    }
    
    // Find the job to ensure it exists
    const job = this.jobs.find(j => j.id === id);
    if (!job) {
      // Return a no-op unsubscribe function if job doesn't exist
      return () => {};
    }
    
    // Create an adapted callback that ensures the job is properly typed
    const adaptedCallback = (status: JobStatusValue) => {
      const updatedJob = this.jobs.find(j => j.id === id);
      if (updatedJob) {
        callback({
          ...updatedJob,
          status: status || updatedJob.status
        });
      }
    };
    
    this.subscriptions.get(id)?.add(adaptedCallback);
    
    return () => {
      const subs = this.subscriptions.get(id);
      if (subs) {
        subs.delete(adaptedCallback);
      }
    };
  }

  // Helper to notify subscribers
  private notifySubscribers(id: string, status: JobStatusValue): void {
    if (this.subscriptions.has(id)) {
      this.subscriptions.get(id)?.forEach(callback => callback(status));
    }
  }

  // Get all jobs
  async getJobs(filter?: JobFilter): Promise<Job<TData, TResult>[]> {
    return this.filterJobs(this.jobs, filter);
  }

  // Delete a job
  async deleteJob(id: string): Promise<boolean> {
    const jobIndex = this.jobs.findIndex(j => j.id === id);
    
    if (jobIndex === -1) {
      return false;
    }
    
    this.jobs.splice(jobIndex, 1);
    return true;
  }

  // Cancel a job
  async cancelJob(id: string): Promise<boolean> {
    return this.updateJobStatus(id, { status: 'cancelled' });
  }

  // Check rate limit for a customer
  async checkRateLimit(customerId: string): Promise<boolean> {
    // Mock implementation always returns not rate limited
    return false;
  }

  // Set job retention policy
  async setJobRetentionPolicy(customerId: string, retentionDays: number): Promise<boolean> {
    // Mock implementation always succeeds
    return true;
  }

  // Get job retention policy
  async getJobRetentionPolicy(customerId: string): Promise<number> {
    // Mock implementation returns default retention period
    return 180; // 180 days
  }

  // Get job status
  async getJobStatus(id: string): Promise<{
    id: string;
    status: JobStatusValue;
    progress?: JobProgressType;
    error?: JobError;
    createdBy: string;
  } | null> {
    const job = await this.getJob(id);
    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      createdBy: job.createdBy || '',
    };
  }

  // Get rate limit status
  async getRateLimitStatus(customerId: string): Promise<RateLimitStatus> {
    return {
      customerId,
      currentJobs: 0,
      maxJobs: 5,
      cooldownPeriod: 60,
      cooldownJobs: []
    };
  }
  
  // Get retention policy
  async getRetentionPolicy(customerId: string): Promise<RetentionPolicy> {
    return {
      customerId,
      retentionDays: 180,
      lastUpdated: new Date()
    };
  }
}