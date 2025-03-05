/**
 * Data Generation Client Service
 * 
 * Client-side service for interacting with the data generation API.
 */

import { JobConfiguration, JobStatus, RateLimitStatus } from '@/lib/models/data-generation/types';

/**
 * Client-side service for interacting with the data generation API
 */
export class DataGenerationClient {
  private apiUrl = '/api/data-generation';
  
  /**
   * Create a new data generation job
   */
  async createJob(config: JobConfiguration & { projectId: string }): Promise<string> {
    const response = await fetch(`${this.apiUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create job');
    }
    
    const data = await response.json();
    return data.jobId;
  }
  
  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${this.apiUrl}/jobs/${jobId}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get job status');
    }
    
    return await response.json();
  }
  
  /**
   * Get job history
   */
  async getJobHistory(options?: {
    limit?: number;
    offset?: number;
    status?: JobStatus['status'];
    startDate?: Date;
    endDate?: Date;
  }): Promise<JobStatus[]> {
    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (options?.limit) {
      queryParams.append('limit', options.limit.toString());
    }
    
    if (options?.offset) {
      queryParams.append('offset', options.offset.toString());
    }
    
    if (options?.status) {
      queryParams.append('status', options.status);
    }
    
    if (options?.startDate) {
      queryParams.append('startDate', options.startDate.toISOString());
    }
    
    if (options?.endDate) {
      queryParams.append('endDate', options.endDate.toISOString());
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `${this.apiUrl}/jobs?${queryString}` : `${this.apiUrl}/jobs`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get job history');
    }
    
    const data = await response.json();
    return data.jobs;
  }
  
  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const response = await fetch(`${this.apiUrl}/jobs/${jobId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel job');
    }
    
    const data = await response.json();
    return data.success;
  }
  
  /**
   * Resume a job
   */
  async resumeJob(jobId: string): Promise<boolean> {
    const response = await fetch(`${this.apiUrl}/jobs/${jobId}?action=resume`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to resume job');
    }
    
    const data = await response.json();
    return data.success;
  }
  
  /**
   * Get rate limit status
   */
  async getRateLimitStatus(): Promise<RateLimitStatus> {
    const response = await fetch(`${this.apiUrl}/rate-limits`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get rate limit status');
    }
    
    return await response.json();
  }
  
  /**
   * Get retention policy
   */
  async getRetentionPolicy(): Promise<number> {
    const response = await fetch(`${this.apiUrl}/retention`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get retention policy');
    }
    
    const data = await response.json();
    return data.retentionDays;
  }
  
  /**
   * Update retention policy
   */
  async updateRetentionPolicy(retentionDays: number): Promise<boolean> {
    const response = await fetch(`${this.apiUrl}/retention`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ retentionDays }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update retention policy');
    }
    
    const data = await response.json();
    return data.success;
  }
  
  /**
   * Check pipeline health
   */
  async checkPipelineHealth() {
    const response = await fetch(`${this.apiUrl}/health`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check pipeline health');
    }
    
    return await response.json();
  }
}

// Export singleton instance
export const dataGenerationClient = new DataGenerationClient(); 