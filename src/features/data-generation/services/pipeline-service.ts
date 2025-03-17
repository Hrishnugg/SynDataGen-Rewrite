/**
 * Pipeline Service
 * 
 * This service is responsible for managing data generation pipelines,
 * including job submission, status tracking, and pipeline health monitoring.
 */

import { 
  JobStatus, 
  JobConfiguration,
  PipelineHealth,
  JobCreationResponse,
  JobProgressType,
  JobStatusValue,
  JobError,
  JobStage
} from '../../../lib/models/data-generation/types';

/**
 * Base Pipeline Service that defines the common interface
 * for all pipeline implementations
 */
export abstract class BasePipelineService {
  /**
   * Submit a job to the pipeline
   */
  abstract submitJob(jobId: string, config: JobConfiguration): Promise<JobCreationResponse>;

  /**
   * Cancel a running job
   */
  abstract cancelJob(jobId: string): Promise<boolean>;

  /**
   * Resume a paused job
   */
  abstract resumeJob(jobId: string): Promise<boolean>;

  /**
   * Get the status of a job
   */
  abstract getJobStatus(jobId: string): Promise<JobStatus>;

  /**
   * Check the health of the pipeline
   */
  abstract checkHealth(): Promise<PipelineHealth>;
}

/**
 * Mock implementation of the Pipeline Service
 */
export class MockPipelineService extends BasePipelineService {
  private jobStatuses: Map<string, JobStatus> = new Map();
  private apiUrl: string;

  constructor(apiUrl: string = 'https://mock-pipeline-api.example.com') {
    super();
    this.apiUrl = apiUrl;
  }

  async submitJob(jobId: string, config: JobConfiguration): Promise<JobCreationResponse> {
    console.log(`[MockPipelineService] Submitting job ${jobId} with config:`, config);
    
    // Initialize the job status
    const jobStatus: JobStatus = {
      id: jobId,
      jobId,
      status: 'running' as JobStatusValue,
      progress: {
        percentComplete: 50,
        currentStep: 'processing'
      },
      stages: [
        { 
          name: 'preparation', 
          status: 'completed' as JobStatusValue, 
          progress: 100 
        },
        { 
          name: 'processing', 
          status: 'running' as JobStatusValue, 
          progress: 50 
        },
        { 
          name: 'finalization', 
          status: 'pending' as JobStatusValue, 
          progress: 0 
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: undefined,
      error: undefined
    };
    
    this.jobStatuses.set(jobId, jobStatus);
    
    return {
      jobId,
      status: 'pending', 
      message: 'Job submitted successfully'
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    console.log(`[MockPipelineService] Cancelling job ${jobId}`);
    
    const job = this.jobStatuses.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.status = 'cancelled' as JobStatusValue;
    job.updatedAt = new Date();
    
    return true;
  }

  async resumeJob(jobId: string): Promise<boolean> {
    console.log(`[MockPipelineService] Resuming job ${jobId}`);
    
    const job = this.jobStatuses.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    // Check if job can be resumed (must be paused or failed)
    if (job.status !== 'paused' && job.status !== 'failed') {
      throw new Error(`Cannot resume job with status ${job.status}`);
    }
    
    job.status = 'running' as JobStatusValue;
    job.updatedAt = new Date();
    
    // Simulate progress
    setTimeout(() => this.simulateJobProgress(jobId, 60), 2000);
    
    return true;
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    console.log(`[MockPipelineService] Getting status for job ${jobId}`);
    
    const job = this.jobStatuses.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    return job;
  }

  async checkHealth(): Promise<PipelineHealth> {
    console.log(`[MockPipelineService] Checking pipeline health`);
    
    return {
      status: 'healthy',
      message: 'Pipeline is operational',
      timestamp: new Date().toISOString(),
      metrics: {
        activeJobs: 2,
        queuedJobs: 1,
        completedJobs: 10,
        failedJobs: 1,
        averageProcessingTimeMs: 5000
      },
      activeJobs: 2,
      queuedJobs: 1,
      completedJobs: 10,
      failedJobs: 1,
      averageProcessingTimeMs: 5000
    };
  }

  // Simulate job progress
  async simulateJobProgress(jobId: string, progress: number): Promise<void> {
    console.log(`[MockPipelineService] Simulating progress for job ${jobId}: ${progress}%`);
    
    const job = this.jobStatuses.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.progress = {
      percentComplete: progress,
      currentStep: progress < 100 ? 'processing' : 'completed'
    };
    
    if (job.stages) {
      if (progress >= 30 && progress < 60) {
        job.stages[0].status = 'completed' as JobStatusValue;
        job.stages[0].progress = 100;
        job.stages[1].status = 'running' as JobStatusValue;
        job.stages[1].progress = (progress - 30) * 100 / 30;
      } else if (progress >= 60 && progress < 100) {
        job.stages[0].status = 'completed' as JobStatusValue;
        job.stages[0].progress = 100;
        job.stages[1].status = 'completed' as JobStatusValue;
        job.stages[1].progress = 100;
        job.stages[2].status = 'running' as JobStatusValue;
        job.stages[2].progress = (progress - 60) * 100 / 40;
      } else if (progress >= 100) {
        job.stages[0].status = 'completed' as JobStatusValue;
        job.stages[0].progress = 100;
        job.stages[1].status = 'completed' as JobStatusValue;
        job.stages[1].progress = 100;
        job.stages[2].status = 'completed' as JobStatusValue;
        job.stages[2].progress = 100;
      }
    }
    
    job.updatedAt = new Date();
    
    if (progress < 100) {
      setTimeout(() => this.simulateJobProgress(jobId, progress + 10), 2000);
    } else {
      this.simulateJobCompletion(jobId);
    }
  }

  // Simulate job completion
  async simulateJobCompletion(jobId: string): Promise<void> {
    console.log(`[MockPipelineService] Simulating completion for job ${jobId}`);
    
    const job = this.jobStatuses.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.status = 'completed' as JobStatusValue;
    job.progress = {
      percentComplete: 100,
      currentStep: 'completed'
    };
    
    if (job.stages) {
      job.stages.forEach((stage: JobStage) => {
        stage.status = 'completed' as JobStatusValue;
        stage.progress = 100;
      });
    }
    
    job.updatedAt = new Date();
    job.completedAt = new Date();
  }

  // Simulate job failure
  async simulateJobFailure(jobId: string, errorMessage: string): Promise<void> {
    console.log(`[MockPipelineService] Simulating failure for job ${jobId}: ${errorMessage}`);
    
    const job = this.jobStatuses.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.status = 'failed' as JobStatusValue;
    job.progress = {
      percentComplete: job.progress && typeof job.progress === 'object' ? job.progress.percentComplete : 0,
      currentStep: 'failed'
    };
    
    job.error = {
      code: 'PIPELINE_ERROR',
      message: errorMessage
    };
    
    if (job.stages) {
      // Mark the current stage as failed
      const runningStage = job.stages.find((stage: JobStage) => stage.status === 'running');
      if (runningStage) {
        runningStage.status = 'failed' as JobStatusValue;
        runningStage.error = {
          code: 'STAGE_ERROR',
          message: errorMessage
        };
      }
    }
    
    job.updatedAt = new Date();
  }
}

/**
 * Real Pipeline Service implementation for production use
 */
export class RealPipelineService extends BasePipelineService {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    super();
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async submitJob(jobId: string, config: JobConfiguration): Promise<JobCreationResponse> {
    console.log(`[RealPipelineService] Submitting job ${jobId} to ${this.apiUrl}`);
    
    // In a real implementation, this would make an API call to the pipeline service
    // For now, we'll just return a mock response
    return {
      jobId,
      status: 'pending',
      message: 'Job submitted to production pipeline'
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    console.log(`[RealPipelineService] Cancelling job ${jobId} on ${this.apiUrl}`);
    
    // In a real implementation, this would make an API call to the pipeline service
    // For now, we'll just return true
    return true;
  }

  async resumeJob(jobId: string): Promise<boolean> {
    console.log(`[RealPipelineService] Resuming job ${jobId} on ${this.apiUrl}`);
    
    // In a real implementation, this would make an API call to the pipeline service
    // For now, we'll just return true
    return true;
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    console.log(`[RealPipelineService] Getting status for job ${jobId} from ${this.apiUrl}`);
    
    // In a real implementation, this would make an API call to the pipeline service
    // For now, we'll just return a mock status
    return {
      id: jobId,
      jobId,
      status: 'running' as JobStatusValue,
      progress: {
        percentComplete: 75,
        currentStep: 'processing'
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: undefined,
      error: undefined,
      stages: [
        { 
          name: 'preparation', 
          status: 'completed' as JobStatusValue, 
          progress: 100 
        },
        { 
          name: 'processing', 
          status: 'running' as JobStatusValue, 
          progress: 75 
        },
        { 
          name: 'finalization', 
          status: 'pending' as JobStatusValue, 
          progress: 0 
        }
      ]
    };
  }

  async checkHealth(): Promise<PipelineHealth> {
    console.log(`[RealPipelineService] Checking health of pipeline at ${this.apiUrl}`);
    
    // In a real implementation, this would make an API call to the pipeline service
    // For now, we'll just return a mock health status
    return {
      status: 'healthy',
      message: 'Production pipeline is operational',
      timestamp: new Date().toISOString(),
      metrics: {
        activeJobs: 5,
        queuedJobs: 3,
        completedJobs: 120,
        failedJobs: 2,
        averageProcessingTimeMs: 8500
      },
      activeJobs: 5,
      queuedJobs: 3,
      completedJobs: 120,
      failedJobs: 2,
      averageProcessingTimeMs: 8500
    };
  }
}

// Get the pipeline service singleton instance
// This provides access to the pipeline service throughout the application
export function getPipelineService(): BasePipelineService {
  // In a real application, this would be configured based on environment
  // For development, use the mock service
  // For production, use the real service with proper configuration
  
  if (process.env.NODE_ENV === 'production') {
    return new RealPipelineService(
      process.env.PIPELINE_API_URL || 'https://api.example.com/pipeline',
      process.env.PIPELINE_API_KEY || 'default-key'
    );
  } else {
    return new MockPipelineService();
  }
}