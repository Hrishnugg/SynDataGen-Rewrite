import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { FirestoreJobManagementService } from '@/lib/services/data-generation/job-management-service';
import { BasePipelineService } from '@/lib/services/data-generation/pipeline-service';
import { JobConfiguration, JobCreationResponse, JobStatus, JobError, PipelineHealth } from '@/lib/models/data-generation/types';

// Mock the Firestore
jest.mock('@/lib/firebase', () => {
  return {
    getFirebaseFirestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue(Promise.resolve({
            exists: true,
            data: jest.fn().mockReturnValue({
              jobId: 'test-job-123',
              status: 'running',
              customerId: 'customer-123',
              projectId: 'project-123',
              createdAt: new Date(),
              updatedAt: new Date()
            })
          })),
          set: jest.fn().mockReturnValue(Promise.resolve()),
          update: jest.fn().mockReturnValue(Promise.resolve())
        }),
        add: jest.fn().mockReturnValue(Promise.resolve({
          id: 'test-job-123'
        })),
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockReturnValue(Promise.resolve({
            empty: false,
            docs: [
              {
                id: 'test-job-123',
                data: jest.fn().mockReturnValue({
                  status: 'running',
                  customerId: 'customer-123',
                  projectId: 'project-123'
                })
              }
            ]
          }))
        })
      }),
      batch: jest.fn().mockReturnValue({
        set: jest.fn(),
        update: jest.fn(),
        commit: jest.fn().mockReturnValue(Promise.resolve())
      })
    })
  };
});

// Mock the pipeline service
class MockPipelineService extends BasePipelineService {
  async submitJob(jobId: string, config: JobConfiguration): Promise<JobCreationResponse> {
    return {
      jobId,
      status: 'accepted'
    };
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
      status: 'running',
      progress: 50,
      stages: [],
      customerId: 'customer-123',
      projectId: 'project-123',
      startTime: new Date(),
      lastUpdated: new Date(),
      metadata: {
        inputSize: 0,
        retryCount: 0
      },
      configuration: {} as JobConfiguration
    };
  }

  async checkHealth(): Promise<PipelineHealth> {
    return {
      status: 'healthy',
      timestamp: new Date()
    };
  }
}

jest.mock('@/lib/services/data-generation/pipeline-service', () => {
  const actual = jest.requireActual('@/lib/services/data-generation/pipeline-service');
  return {
    BasePipelineService: actual.BasePipelineService,
    getPipelineService: jest.fn().mockReturnValue(new MockPipelineService())
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

describe('Job Management Service', () => {
  let jobService: FirestoreJobManagementService;
  let pipelineService: MockPipelineService;
  
  // Test data
  const customerId = 'test-customer';
  const projectId = 'test-project';
  const jobId = 'test-job-123';
  
  // Mock Firestore document and collection references
  const mockDoc = {
    set: jest.fn().mockReturnValue(Promise.resolve()),
    update: jest.fn().mockReturnValue(Promise.resolve()),
    get: jest.fn().mockReturnValue(Promise.resolve({
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
        metadata: {
          inputSize: 0,
          retryCount: 0
        },
        configuration: testJobConfig
      })
    })),
    delete: jest.fn().mockReturnValue(Promise.resolve())
  };

  const mockCollection = {
    doc: jest.fn().mockReturnValue(mockDoc),
    add: jest.fn().mockReturnValue(Promise.resolve({ id: jobId })),
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnValue(Promise.resolve({
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
            metadata: {
              inputSize: 0,
              retryCount: 0
            },
            configuration: testJobConfig
          }),
          ref: mockDoc
        }
      ]
    }))
  };

  // Mock Firestore instance
  const mockFirestore = {
    collection: jest.fn().mockReturnValue(mockCollection),
    FieldValue: {
      serverTimestamp: jest.fn().mockReturnValue('server-timestamp'),
      increment: jest.fn((num) => `increment-${num}`),
      arrayUnion: jest.fn((...args) => `array-union-${args.join('-')}`),
      arrayRemove: jest.fn((...args) => `array-remove-${args.join('-')}`),
      delete: jest.fn().mockReturnValue('field-delete')
    },
    batch: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      commit: jest.fn().mockReturnValue(Promise.resolve())
    }),
    runTransaction: jest.fn((callback: any) => {
      const transaction = {
        get: jest.fn().mockReturnValue(Promise.resolve({
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
            metadata: {
              inputSize: 0,
              retryCount: 0
            },
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

  const mockBatch = {
    set: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    commit: jest.fn().mockReturnValue(Promise.resolve())
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock getFirebaseFirestore
    jest.spyOn(global, 'getFirebaseFirestore').mockReturnValue(mockFirestore);
    
    // Create service instances
    jobService = new FirestoreJobManagementService();
    pipelineService = new MockPipelineService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Job Creation', () => {
    it('should create a new job in Firestore', async () => {
      const result = await jobService.createJob(customerId, projectId, testJobConfig);
      
      expect(result).toBeDefined();
      expect(result.jobId).toBe(jobId);
      expect(result.status).toBe('accepted');
      
      // Verify that Firestore collection.add was called with correct data
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId,
          projectId,
          status: 'queued',
          progress: 0,
          configuration: testJobConfig
        })
      );
    });
    
    it('should handle job creation failures gracefully', async () => {
      // Mock Firestore add to throw an error
      mockCollection.add.mockImplementationOnce(() => {
        throw new Error('Firestore error');
      });
      
      const result = await jobService.createJob(customerId, projectId, testJobConfig);
      
      expect(result.status).toBe('rejected');
      expect(result.message).toContain('Failed to create job');
    });
  });

  describe('Job Status Management', () => {
    it('should get job status from Firestore', async () => {
      const status = await jobService.getJobStatus(jobId);
      
      expect(status).toBeDefined();
      expect(status.jobId).toBe(jobId);
      expect(status.customerId).toBe(customerId);
      expect(status.projectId).toBe(projectId);
      
      // Verify that Firestore doc.get was called
      expect(mockDoc.get).toHaveBeenCalled();
    });
    
    it('should throw an error if job does not exist', async () => {
      // Mock Firestore to return non-existent document
      mockDoc.get.mockImplementationOnce(() => Promise.resolve({
        exists: false,
        data: () => null
      }));
      
      await expect(jobService.getJobStatus('non-existent-job'))
        .rejects.toThrow('Job with ID non-existent-job not found');
    });
    
    it('should update job status in Firestore', async () => {
      await jobService.updateJobStatus(jobId, 'running');
      
      // Verify job status was updated
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          lastUpdated: expect.anything()
        })
      );
    });
    
    it('should update job status with error information', async () => {
      const error: JobError = {
        code: 'PROCESSING_ERROR',
        message: 'Failed to process data'
      };
      
      await jobService.updateJobStatus(jobId, 'failed', error);
      
      // Verify job status and error were updated
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error,
          lastUpdated: expect.anything()
        })
      );
    });
  });

  describe('Job Control Operations', () => {
    it('should cancel a job', async () => {
      // Mock to ensure we can read the job
      mockDoc.get.mockImplementationOnce(() => Promise.resolve({
        exists: true,
        data: () => ({
          id: jobId,
          customerId,
          projectId,
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
        })
      }));
      
      const result = await jobService.cancelJob(jobId, 'user-123');
      
      expect(result).toBe(true);
      
      // Verify job status was updated to cancelled
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          lastUpdated: expect.anything()
        })
      );
    });
    
    it('should resume a paused job', async () => {
      // Mock to ensure we can read the job
      mockDoc.get.mockImplementationOnce(() => Promise.resolve({
        exists: true,
        data: () => ({
          id: jobId,
          customerId,
          projectId,
          status: 'paused',
          progress: 25,
          startTime: new Date(),
          lastUpdated: new Date(),
          stages: [],
          metadata: {
            inputSize: 0,
            retryCount: 0
          },
          configuration: testJobConfig
        })
      }));
      
      const result = await jobService.resumeJob(jobId, 'user-123');
      
      expect(result).toBe(true);
      
      // Verify job status was updated to running
      expect(mockDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          lastUpdated: expect.anything()
        })
      );
    });
  });
  
  describe('Rate Limiting', () => {
    it('should check rate limit before creating a job', async () => {
      // Mock rate limit check
      const rateLimitSpy = jest.spyOn(jobService, 'checkRateLimit').mockReturnValue(Promise.resolve(true));
      
      await jobService.createJob(customerId, projectId, testJobConfig);
      
      expect(rateLimitSpy).toHaveBeenCalledWith(customerId);
    });
    
    it('should reject job creation if rate limited', async () => {
      // Mock rate limit check to return false
      jest.spyOn(jobService, 'checkRateLimit').mockReturnValue(Promise.resolve(false));
      
      const result = await jobService.createJob(customerId, projectId, testJobConfig);
      
      expect(result.status).toBe('rejected');
      expect(result.message).toContain('Rate limit exceeded');
    });
  });
}); 