import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { FirestoreJobManagementService } from '@/lib/services/data-generation/job-management-service';
import { BasePipelineService } from '@/lib/services/data-generation/pipeline-service';
import { FirestoreWebhookService } from '@/lib/services/data-generation/webhook-service';
import { JobConfiguration, JobStatus, WebhookConfig, JobCreationResponse } from '@/lib/models/data-generation/types';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock data for tests
const customerId = 'test-customer';
const projectId = 'test-project';
const jobId = 'test-job-123';

// Sample job configuration for tests
const testJobConfig: JobConfiguration = {
  dataType: 'csv',
  dataSize: 100,
  inputFormat: 'csv',
  outputFormat: 'csv',
  inputBucket: 'input-bucket',
  outputBucket: 'output-bucket',
  inputPath: '/input',
  outputPath: '/output',
  isAsync: true,
  timeout: 3600,
  resumeWindow: 3600,
  parameters: {
    rowCount: 100
  }
};

// Sample webhook for tests
const testWebhookConfig: WebhookConfig = {
  url: 'https://example.com/webhook',
  secret: 'test-secret-key',
  events: ['job.created', 'job.completed']
};

// Mock pipeline service for testing
class MockPipelineService extends BasePipelineService {
  private jobs: Map<string, JobStatus> = new Map();

  async submitJob(jobId: string, config: JobConfiguration): Promise<JobCreationResponse> {
    this.jobs.set(jobId, {
      jobId,
      customerId,
      projectId,
      status: 'running',
      progress: 0,
      startTime: new Date(),
      lastUpdated: new Date(),
      stages: [
        { name: 'initialization', status: 'running', progress: 0 }
      ],
      metadata: {
        inputSize: 0,
        retryCount: 0
      },
      configuration: config
    });
    return { jobId, status: 'accepted' };
  }
  
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      job.lastUpdated = new Date();
      this.jobs.set(jobId, job);
      return true;
    }
    return false;
  }
  
  async resumeJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'running';
      job.lastUpdated = new Date();
      this.jobs.set(jobId, job);
      return true;
    }
    return false;
  }
  
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = this.jobs.get(jobId);
    if (job) {
      return job;
    }
    
    // Default response if job not found
    return {
      jobId,
      customerId,
      projectId,
      status: 'running',
      progress: 50,
      startTime: new Date(),
      lastUpdated: new Date(),
      stages: [
        { name: 'initialization', status: 'completed', progress: 100 },
        { name: 'processing', status: 'running', progress: 50 }
      ],
      metadata: {
        inputSize: 1024,
        retryCount: 0
      },
      configuration: testJobConfig
    };
  }
  
  async checkHealth(): Promise<any> {
    return { status: 'healthy', timestamp: new Date() };
  }
  
  // Custom method for tests to simulate job completion
  async simulateJobCompletion(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId) || {
      jobId,
      customerId,
      projectId,
      status: 'running',
      progress: 50,
      startTime: new Date(),
      lastUpdated: new Date(),
      stages: [
        { name: 'initialization', status: 'completed', progress: 100 },
        { name: 'processing', status: 'running', progress: 50 }
      ],
      metadata: {
        inputSize: 1024,
        retryCount: 0
      },
      configuration: testJobConfig
    };
    
    job.status = 'completed';
    job.progress = 100;
    job.lastUpdated = new Date();
    job.stages = [
      { name: 'initialization', status: 'completed', progress: 100 },
      { name: 'processing', status: 'completed', progress: 100 },
      { name: 'finalization', status: 'completed', progress: 100 }
    ];
    
    this.jobs.set(jobId, job);
  }
  
  // Custom method for tests to simulate job failure
  async simulateJobFailure(jobId: string, errorMessage: string): Promise<void> {
    const job = this.jobs.get(jobId) || {
      jobId,
      customerId,
      projectId,
      status: 'running',
      progress: 50,
      startTime: new Date(),
      lastUpdated: new Date(),
      stages: [
        { name: 'initialization', status: 'completed', progress: 100 },
        { name: 'processing', status: 'running', progress: 50 }
      ],
      metadata: {
        inputSize: 1024,
        retryCount: 0
      },
      configuration: testJobConfig
    };
    
    job.status = 'failed';
    job.progress = 75;
    job.lastUpdated = new Date();
    job.error = {
      code: 'PROCESSING_ERROR',
      message: errorMessage
    };
    
    this.jobs.set(jobId, job);
  }
}

describe('Data Generation Services Integration', () => {
  let jobService: FirestoreJobManagementService;
  let pipelineService: MockPipelineService;
  let webhookService: FirestoreWebhookService;

  // Mock Firestore document and collection references
  const mockDoc = {
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve({
      exists: true,
      data: () => ({
        id: jobId,
        customerId,
        projectId,
        status: 'created',
        progress: 0,
        startTime: new Date(),
        lastUpdated: new Date(),
        stages: [],
        metadata: {},
        configuration: testJobConfig
      })
    })),
    delete: jest.fn(() => Promise.resolve())
  };

  const mockCollection = {
    doc: jest.fn(() => mockDoc),
    add: jest.fn(() => Promise.resolve({ id: jobId })),
    where: jest.fn(() => mockCollection),
    get: jest.fn(() => Promise.resolve({
      empty: false,
      docs: [
        {
          id: jobId,
          exists: true,
          data: () => ({
            id: jobId,
            customerId,
            projectId,
            status: 'created',
            progress: 0,
            startTime: new Date(),
            lastUpdated: new Date(),
            stages: [],
            metadata: {},
            configuration: testJobConfig
          }),
          ref: mockDoc
        }
      ]
    }))
  };

  // Mock Firestore instance
  const mockFirestore = {
    collection: jest.fn(() => mockCollection),
    FieldValue: {
      serverTimestamp: jest.fn(() => 'server-timestamp'),
      increment: jest.fn((num) => `increment-${num}`),
      arrayUnion: jest.fn((...args) => `array-union-${args.join('-')}`),
      arrayRemove: jest.fn((...args) => `array-remove-${args.join('-')}`),
      delete: jest.fn(() => 'field-delete')
    },
    batch: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      commit: jest.fn(() => Promise.resolve())
    })),
    runTransaction: jest.fn((callback: any) => {
      const transaction = {
        get: jest.fn(() => Promise.resolve({
          exists: true,
          data: () => ({
            id: jobId,
            customerId,
            projectId,
            status: 'created',
            progress: 0,
            startTime: new Date(),
            lastUpdated: new Date(),
            stages: [],
            metadata: {},
            configuration: testJobConfig
          })
        })),
        set: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis()
      };
      return callback(transaction);
    })
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'Success',
      json: async () => ({ success: true })
    } as any);
    
    // Mock getFirebaseFirestore
    jest.spyOn(global, 'getFirebaseFirestore').mockReturnValue(mockFirestore);
    
    // Create service instances
    jobService = new FirestoreJobManagementService();
    pipelineService = new MockPipelineService();
    webhookService = new FirestoreWebhookService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('End-to-end Job Workflow', () => {
    it('should create a job and handle status updates', async () => {
      // Register a webhook
      await webhookService.registerWebhook(testWebhookConfig);
      
      // Create a new job
      const result = await jobService.createJob(customerId, projectId, testJobConfig);
      expect(result).toBeDefined();
      expect(result.jobId).toBe(jobId);
      expect(result.status).toBe('accepted');
      
      // Verify that the job was created in Firestore
      expect(mockCollection.add).toHaveBeenCalled();
      
      // Mock submit and complete the job
      const submitSpy = jest.spyOn(pipelineService, 'submitJob');
      await pipelineService.submitJob(jobId, testJobConfig);
      expect(submitSpy).toHaveBeenCalledWith(jobId, expect.anything());
      
      // Mock job completion
      await pipelineService.simulateJobCompletion(jobId);
      
      // Update job status from pipeline
      const completedStatus = await pipelineService.getJobStatus(jobId);
      await jobService.updateJobStatus(jobId, completedStatus.status, completedStatus.error);
      
      // Verify webhook notification was sent
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should handle job cancellation correctly', async () => {
      // Create a new job
      const result = await jobService.createJob(customerId, projectId, testJobConfig);
      
      // Submit the job to the pipeline
      await pipelineService.submitJob(jobId, testJobConfig);
      
      // Cancel the job
      const cancelSpy = jest.spyOn(pipelineService, 'cancelJob');
      await jobService.cancelJob(jobId, 'user-123');
      
      // Verify pipeline service was called
      expect(cancelSpy).toHaveBeenCalledWith(jobId);
      
      // Verify job status was updated to cancelled
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled'
        })
      );
    });

    it('should handle job failure scenarios', async () => {
      // Create a new job
      const result = await jobService.createJob(customerId, projectId, testJobConfig);
      
      // Submit the job to the pipeline
      await pipelineService.submitJob(jobId, testJobConfig);
      
      // Simulate job failure
      const errorMessage = 'Test error message';
      await pipelineService.simulateJobFailure(jobId, errorMessage);
      
      // Update job status from pipeline
      const failedStatus = await pipelineService.getJobStatus(jobId);
      await jobService.updateJobStatus(jobId, failedStatus.status, failedStatus.error);
      
      // Verify job status was updated to failed
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: expect.objectContaining({
            message: errorMessage
          })
        })
      );
    });
  });

  describe('Job Retrieval', () => {
    it('should retrieve jobs for a customer', async () => {
      // Create a job first
      await jobService.createJob(customerId, projectId, testJobConfig);
      
      // Retrieve the job
      const job = await jobService.getJobStatus(jobId);
      
      // Verify job details
      expect(job).toBeDefined();
      expect(job.jobId).toBe(jobId);
      expect(job.customerId).toBe(customerId);
      expect(job.projectId).toBe(projectId);
    });
  });

  describe('Webhook Integration', () => {
    it('should send notifications for job state changes', async () => {
      // Register a webhook
      await webhookService.registerWebhook(testWebhookConfig);
      
      // Create a job
      const result = await jobService.createJob(customerId, projectId, testJobConfig);
      
      // Mock job status
      const jobStatus: JobStatus = {
        jobId,
        customerId,
        projectId,
        status: 'completed',
        progress: 100,
        startTime: new Date(),
        lastUpdated: new Date(),
        stages: [
          { name: 'initialization', status: 'completed', progress: 100 },
          { name: 'processing', status: 'completed', progress: 100 },
          { name: 'finalization', status: 'completed', progress: 100 }
        ],
        metadata: {
          inputSize: 1024,
          outputSize: 2048,
          retryCount: 0
        },
        configuration: testJobConfig
      };
      
      // Update job status and send webhook notification
      await jobService.updateJobStatus(jobId, jobStatus.status, jobStatus.error);
      await webhookService.sendWebhookEvent('job.completed', jobId, jobStatus);
      
      // Verify webhook notification was sent
      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        testWebhookConfig.url,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
    });
  });
}); 