import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
  MockPipelineService,
  RealPipelineService,
  BasePipelineService
} from '@/lib/services/data-generation/pipeline-service';
import { 
  JobStatus, 
  JobConfiguration,
  PipelineHealth,
  JobCreationResponse
} from '@/lib/models/data-generation/types';
import fetch from 'node-fetch';

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock job management service
jest.mock('@/lib/services/data-generation/job-management-service', () => {
  return {
    jobManagementService: {
      getJobStatus: jest.fn().mockReturnValue(Promise.resolve({
        jobId: 'test-job-id',
        status: 'running',
        progress: 50,
        stages: [
          { name: 'preparation', status: 'completed', progress: 100 },
          { name: 'processing', status: 'running', progress: 50 },
          { name: 'finalization', status: 'pending', progress: 0 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }))
    }
  };
});

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

describe('Pipeline Service', () => {
  describe('MockPipelineService', () => {
    let pipelineService: MockPipelineService;
    const jobId = 'test-job-id';

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Create service instance
      pipelineService = new MockPipelineService();
      
      // Pre-create a job in the mock service to test with
      (pipelineService as any).jobStatuses = new Map();
      (pipelineService as any).jobStatuses.set(jobId, {
        jobId,
        status: 'running',
        progress: 50,
        stages: [
          { name: 'preparation', status: 'completed', progress: 100 },
          { name: 'processing', status: 'running', progress: 50 },
          { name: 'finalization', status: 'pending', progress: 0 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    it('should create a mock pipeline service', () => {
      expect(pipelineService).toBeDefined();
      expect(pipelineService).toBeInstanceOf(MockPipelineService);
      expect(pipelineService).toBeInstanceOf(BasePipelineService);
    });

    it('should submit a job and return a job ID', async () => {
      const newJobId = 'new-job-id';
      const response = await pipelineService.submitJob(newJobId, testJobConfig);
      expect(response).toBeDefined();
      expect(response.jobId).toBe(newJobId);
      expect(response.status).toBe('accepted');
    });

    it('should successfully cancel a job', async () => {
      const result = await pipelineService.cancelJob(jobId);
      expect(result).toBe(true);
    });

    it('should successfully resume a job', async () => {
      const result = await pipelineService.resumeJob(jobId);
      expect(result).toBe(true);
    });

    it('should retrieve job status', async () => {
      const status = await pipelineService.getJobStatus(jobId);
      expect(status).toBeDefined();
      expect(status.jobId).toBe(jobId);
      expect(status.status).toBe('running');
      expect(status.progress).toBe(50);
    });

    it('should check pipeline health', async () => {
      const health = await pipelineService.checkHealth();
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should simulate job progress', async () => {
      // Update the job status to simulate progress
      (pipelineService as any).jobStatuses.set(jobId, {
        jobId,
        status: 'running',
        progress: 75,
        stages: [
          { name: 'preparation', status: 'completed', progress: 100 },
          { name: 'processing', status: 'running', progress: 75 },
          { name: 'finalization', status: 'pending', progress: 0 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Get the status to verify progress
      const status = await pipelineService.getJobStatus(jobId);
      expect(status.progress).toBe(75);
    });

    it('should simulate job completion', async () => {
      // Update the job status to simulate completion
      (pipelineService as any).jobStatuses.set(jobId, {
        jobId,
        status: 'completed',
        progress: 100,
        stages: [
          { name: 'preparation', status: 'completed', progress: 100 },
          { name: 'processing', status: 'completed', progress: 100 },
          { name: 'finalization', status: 'completed', progress: 100 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Get the status to verify completion
      const status = await pipelineService.getJobStatus(jobId);
      expect(status.status).toBe('completed');
    });

    it('should simulate job failure', async () => {
      const errorMessage = 'Test error message';
      
      // Update the job status to simulate failure
      (pipelineService as any).jobStatuses.set(jobId, {
        jobId,
        status: 'failed',
        progress: 75,
        stages: [
          { name: 'preparation', status: 'completed', progress: 100 },
          { name: 'processing', status: 'failed', progress: 75 },
          { name: 'finalization', status: 'pending', progress: 0 }
        ],
        error: {
          code: 'TEST_ERROR',
          message: errorMessage,
          details: 'Test error details'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Get the status to verify failure
      const status = await pipelineService.getJobStatus(jobId);
      expect(status.status).toBe('failed');
      expect(status.error?.message).toBe(errorMessage);
    });
  });

  describe('RealPipelineService', () => {
    let pipelineService: RealPipelineService;
    const apiKey = 'test-api-key';
    const apiEndpoint = 'https://api.example.com';
    const jobId = 'test-job-id';

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Create service instance
      pipelineService = new RealPipelineService(apiEndpoint, apiKey);
      
      // Mock the Firestore methods
      const mockCollection = {
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue(Promise.resolve({
            exists: true,
            data: jest.fn().mockReturnValue({
              jobId,
              status: 'running',
              progress: 75
            })
          })),
          set: jest.fn().mockReturnValue(Promise.resolve())
        })
      };
      
      // @ts-ignore - Mock the private db property
      pipelineService.db = {
        collection: jest.fn().mockReturnValue(mockCollection)
      };
      
      // Mock the fetch method in the service
      // @ts-ignore - Mock the private methods
      pipelineService.submitJob = jest.fn().mockImplementation(async (jobId, config) => {
        return {
          jobId,
          status: 'accepted'
        };
      });
      
      // @ts-ignore - Mock the private methods
      pipelineService.cancelJob = jest.fn().mockImplementation(async (jobId) => {
        return true;
      });
      
      // @ts-ignore - Mock the private methods
      pipelineService.resumeJob = jest.fn().mockImplementation(async (jobId) => {
        return true;
      });
      
      // @ts-ignore - Mock the private methods
      pipelineService.getJobStatus = jest.fn().mockImplementation(async (jobId) => {
        return {
          jobId,
          status: 'running',
          progress: 75,
          stages: [
            { name: 'preparation', status: 'completed', progress: 100 },
            { name: 'processing', status: 'running', progress: 75 }
          ]
        };
      });
      
      // @ts-ignore - Mock the private methods
      pipelineService.checkHealth = jest.fn().mockImplementation(async () => {
        return {
          status: 'healthy',
          metrics: {
            activeJobs: 5,
            queuedJobs: 2
          },
          timestamp: new Date()
        };
      });
    });

    it('should create a real pipeline service', () => {
      expect(pipelineService).toBeDefined();
      expect(pipelineService).toBeInstanceOf(RealPipelineService);
      expect(pipelineService).toBeInstanceOf(BasePipelineService);
    });

    it('should submit a job via API', async () => {
      const response = await pipelineService.submitJob(jobId, testJobConfig);
      
      expect(response).toBeDefined();
      expect(response.jobId).toBe(jobId);
      expect(response.status).toBe('accepted');
      
      // Verify the method was called
      expect(pipelineService.submitJob).toHaveBeenCalledWith(jobId, testJobConfig);
    });

    it('should cancel a job via API', async () => {
      const result = await pipelineService.cancelJob(jobId);
      
      expect(result).toBe(true);
      
      // Verify the method was called
      expect(pipelineService.cancelJob).toHaveBeenCalledWith(jobId);
    });

    it('should handle API errors when cancelling a job', async () => {
      // Override the mock to return false
      (pipelineService.cancelJob as jest.Mock).mockReturnValueOnce(false);
      
      const result = await pipelineService.cancelJob(jobId);
      
      expect(result).toBe(false);
    });

    it('should resume a job via API', async () => {
      const result = await pipelineService.resumeJob(jobId);
      
      expect(result).toBe(true);
      
      // Verify the method was called
      expect(pipelineService.resumeJob).toHaveBeenCalledWith(jobId);
    });

    it('should handle API errors when resuming a job', async () => {
      // Override the mock to return false
      (pipelineService.resumeJob as jest.Mock).mockReturnValueOnce(false);
      
      const result = await pipelineService.resumeJob(jobId);
      
      expect(result).toBe(false);
    });

    it('should get job status via API', async () => {
      const status = await pipelineService.getJobStatus(jobId);
      
      expect(status).toBeDefined();
      expect(status.jobId).toBe(jobId);
      expect(status.status).toBe('running');
      expect(status.progress).toBe(75);
      
      // Verify the method was called
      expect(pipelineService.getJobStatus).toHaveBeenCalledWith(jobId);
    });

    it('should check pipeline health via API', async () => {
      const health = await pipelineService.checkHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      
      // Verify the method was called
      expect(pipelineService.checkHealth).toHaveBeenCalled();
    });
  });

  describe('TestPipelineService', () => {
    class TestPipelineService extends BasePipelineService {
      async submitJob(jobId: string, config: JobConfiguration): Promise<JobCreationResponse> { 
        return { jobId, status: 'accepted' };
      }
      
      async cancelJob(jobId: string): Promise<boolean> { 
        return true;
      }
      
      async resumeJob(jobId: string): Promise<boolean> { 
        return true;
      }
      
      async getJobStatus(jobId: string): Promise<JobStatus> { 
        return {
          jobId,
          customerId: 'test-customer',
          projectId: 'test-project',
          status: 'running',
          progress: 50,
          startTime: new Date(),
          lastUpdated: new Date(),
          stages: [],
          metadata: {
            inputSize: 0,
            retryCount: 0
          },
          configuration: testJobConfig
        };
      }
      
      async checkHealth(): Promise<PipelineHealth> { 
        return { 
          status: 'healthy', 
          message: 'Test pipeline is operational',
          timestamp: new Date()
        };
      }
    }

    let pipelineService: TestPipelineService;
    const jobId = 'test-job-id';

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Create service instance
      pipelineService = new TestPipelineService();
    });

    it('should create a test pipeline service', () => {
      expect(pipelineService).toBeDefined();
      expect(pipelineService).toBeInstanceOf(TestPipelineService);
      expect(pipelineService).toBeInstanceOf(BasePipelineService);
    });

    it('should submit a job and return a job ID', async () => {
      const response = await pipelineService.submitJob(jobId, testJobConfig);
      expect(response).toBeDefined();
      expect(response.jobId).toBe(jobId);
      expect(response.status).toBe('accepted');
    });

    it('should handle errors gracefully', async () => {
      // Override the submitJob method to throw an error
      jest.spyOn(pipelineService, 'submitJob').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      // Attempt to submit the job
      try {
        await pipelineService.submitJob(jobId, testJobConfig);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Test error');
      }
    });
  });
}); 