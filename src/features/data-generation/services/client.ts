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
  async getJobs(filters?: Record<string, any>): Promise<JobStatus[]> {
    const url = new URL(`${this.apiUrl}/jobs`, window.location.origin);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get job history');
    }
    
    return await response.json();
  }
  
  /**
   * Get detailed job information
   */
  async getJobDetails(jobId: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/jobs/${jobId}/details`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get job details');
    }
    
    return await response.json();
  }
  
  /**
   * Get preview data for a job
   */
  async getJobPreviewData(jobId: string, options?: { limit?: number; offset?: number }): Promise<any> {
    const url = new URL(`${this.apiUrl}/jobs/${jobId}/preview`, window.location.origin);
    
    if (options) {
      if (options.limit) url.searchParams.append('limit', String(options.limit));
      if (options.offset) url.searchParams.append('offset', String(options.offset));
    }
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get job preview data');
    }
    
    return await response.json();
  }
  
  /**
   * Download job data in specified format
   */
  async downloadJobData(jobId: string, format: string): Promise<Blob> {
    const response = await fetch(`${this.apiUrl}/jobs/${jobId}/download?format=${format}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to download job data');
    }
    
    return await response.blob();
  }
  
  /**
   * Extend retention period for a job
   */
  async extendJobRetention(jobId: string, days: number): Promise<void> {
    const response = await fetch(`${this.apiUrl}/jobs/${jobId}/retention`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ days }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extend job retention');
    }
  }
  
  /**
   * Request early deletion of a job
   */
  async requestEarlyDeletion(jobId: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/jobs/${jobId}/delete`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to request early deletion');
    }
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