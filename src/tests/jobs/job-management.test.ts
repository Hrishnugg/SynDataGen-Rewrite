/**
 * Job Management Service Tests
 * 
 * This file contains tests for the job management service to ensure
 * that job creation, retrieval, and updates work correctly
 * after our TypeScript fixes.
 */

import { JobService } from '../../features/data-generation/services/job-service';
import { FirestoreService } from '../../lib/api/services/firestore-service';
import { JobStateMachine } from '../../lib/models/data-generation/job-state-machine';
import { mockDeep, mockReset } from 'jest-mock-extended';
import { JobStatus, JobConfiguration } from '../../lib/models/data-generation/types';

// Mock Firestore and job state machine
const mockFirestoreService = mockDeep<FirestoreService>();
const mockJobStateMachine = mockDeep<JobStateMachine>();

// Create sample job data
const sampleJobConfig: JobConfiguration = {
  projectId: 'test-project',
  datasetName: 'test-dataset',
  recordCount: 100,
  schema: {
    fields: [
      { name: 'id', type: 'string', rules: { pattern: 'uuid' } },
      { name: 'name', type: 'string', rules: { pattern: 'name' } },
      { name: 'email', type: 'string', rules: { pattern: 'email' } }
    ]
  },
  format: 'json',
  outputLocation: 'firestore'
};

const sampleJob = {
  id: 'job-123',
  projectId: 'test-project',
  status: 'created' as JobStatus,
  progress: 0,
  configuration: sampleJobConfig,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  completedAt: null,
  errorMessage: null,
  output: null
};

describe('Job Management Service', () => {
  let jobService: JobService;
  
  beforeEach(() => {
    // Reset all mocks
    mockReset(mockFirestoreService);
    mockReset(mockJobStateMachine);
    
    // Set up Firestore mock for job retrieval
    mockFirestoreService.getDocument.mockImplementation(async (path) => {
      if (path === 'projects/test-project/jobs/job-123') {
        return { ...sampleJob };
      }
      return null;
    });
    
    // Set up Firestore mock for job creation
    mockFirestoreService.createDocument.mockImplementation(async (path, data) => {
      if (path.startsWith('projects/')) {
        return 'job-123';
      }
      return '';
    });
    
    // Set up Firestore mock for job listing
    mockFirestoreService.queryDocuments.mockImplementation(async (collection, conditions) => {
      if (collection === 'projects/test-project/jobs') {
        return [{ ...sampleJob }];
      }
      return [];
    });
    
    // Set up Firestore mock for job update
    mockFirestoreService.updateDocument.mockImplementation(async (path, data) => {
      // Mock successful update
      return;
    });
    
    // Initialize job service with mocks
    jobService = new JobService(mockFirestoreService, mockJobStateMachine);
  });
  
  describe('createJob', () => {
    it('should create a new job', async () => {
      const result = await jobService.createJob('test-project', sampleJobConfig);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('job-123');
      expect(mockFirestoreService.createDocument).toHaveBeenCalledWith(
        expect.stringMatching(/^projects\/test-project\/jobs\/.+/),
        expect.objectContaining({
          projectId: 'test-project',
          configuration: sampleJobConfig,
          status: 'created'
        })
      );
    });
    
    it('should throw an error if creation fails', async () => {
      // Mock a failure
      mockFirestoreService.createDocument.mockRejectedValueOnce(new Error('Creation failed'));
      
      await expect(
        jobService.createJob('test-project', sampleJobConfig)
      ).rejects.toThrow('Creation failed');
    });
    
    it('should initiate the job state machine', async () => {
      await jobService.createJob('test-project', sampleJobConfig);
      
      expect(mockJobStateMachine.initiate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job-123',
          projectId: 'test-project'
        })
      );
    });
  });
  
  describe('getJob', () => {
    it('should retrieve a job by ID', async () => {
      const job = await jobService.getJob('test-project', 'job-123');
      
      expect(job).toBeDefined();
      expect(job?.id).toBe('job-123');
      expect(job?.projectId).toBe('test-project');
      expect(mockFirestoreService.getDocument).toHaveBeenCalledWith(
        'projects/test-project/jobs/job-123'
      );
    });
    
    it('should return null for non-existent jobs', async () => {
      mockFirestoreService.getDocument.mockResolvedValueOnce(null);
      
      const job = await jobService.getJob('test-project', 'non-existent');
      
      expect(job).toBeNull();
    });
    
    it('should throw if retrieval fails', async () => {
      mockFirestoreService.getDocument.mockRejectedValueOnce(new Error('Retrieval failed'));
      
      await expect(
        jobService.getJob('test-project', 'job-123')
      ).rejects.toThrow('Retrieval failed');
    });
  });
  
  describe('listJobs', () => {
    it('should list all jobs for a project', async () => {
      const jobs = await jobService.listJobs('test-project');
      
      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe('job-123');
      expect(mockFirestoreService.queryDocuments).toHaveBeenCalledWith(
        'projects/test-project/jobs',
        expect.any(Array)
      );
    });
    
    it('should filter jobs by status', async () => {
      await jobService.listJobs('test-project', { status: 'completed' });
      
      expect(mockFirestoreService.queryDocuments).toHaveBeenCalledWith(
        'projects/test-project/jobs',
        expect.arrayContaining([
          expect.objectContaining({ field: 'status', operator: '==', value: 'completed' })
        ])
      );
    });
    
    it('should return empty array if no jobs match', async () => {
      mockFirestoreService.queryDocuments.mockResolvedValueOnce([]);
      
      const jobs = await jobService.listJobs('test-project');
      
      expect(jobs).toHaveLength(0);
    });
    
    it('should throw if listing fails', async () => {
      mockFirestoreService.queryDocuments.mockRejectedValueOnce(new Error('Listing failed'));
      
      await expect(
        jobService.listJobs('test-project')
      ).rejects.toThrow('Listing failed');
    });
  });
  
  describe('updateJobStatus', () => {
    it('should update a job status', async () => {
      await jobService.updateJobStatus('test-project', 'job-123', 'running', 10);
      
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith(
        'projects/test-project/jobs/job-123',
        expect.objectContaining({
          status: 'running',
          progress: 10,
          updatedAt: expect.any(String)
        })
      );
    });
    
    it('should set completedAt when job is completed', async () => {
      await jobService.updateJobStatus('test-project', 'job-123', 'completed', 100);
      
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith(
        'projects/test-project/jobs/job-123',
        expect.objectContaining({
          status: 'completed',
          progress: 100,
          completedAt: expect.any(String)
        })
      );
    });
    
    it('should set errorMessage when job fails', async () => {
      await jobService.updateJobStatus('test-project', 'job-123', 'failed', 50, 'Process error');
      
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith(
        'projects/test-project/jobs/job-123',
        expect.objectContaining({
          status: 'failed',
          progress: 50,
          errorMessage: 'Process error'
        })
      );
    });
    
    it('should update the job state machine', async () => {
      await jobService.updateJobStatus('test-project', 'job-123', 'running', 10);
      
      expect(mockJobStateMachine.transition).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'job-123',
          projectId: 'test-project'
        }),
        'running'
      );
    });
    
    it('should throw if update fails', async () => {
      mockFirestoreService.updateDocument.mockRejectedValueOnce(new Error('Update failed'));
      
      await expect(
        jobService.updateJobStatus('test-project', 'job-123', 'running', 10)
      ).rejects.toThrow('Update failed');
    });
  });
  
  describe('setJobOutput', () => {
    it('should set the job output location', async () => {
      const outputLocation = {
        type: 'firestore',
        path: 'projects/test-project/datasets/test-dataset'
      };
      
      await jobService.setJobOutput('test-project', 'job-123', outputLocation);
      
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith(
        'projects/test-project/jobs/job-123',
        expect.objectContaining({
          output: outputLocation,
          updatedAt: expect.any(String)
        })
      );
    });
    
    it('should throw if setting output fails', async () => {
      mockFirestoreService.updateDocument.mockRejectedValueOnce(new Error('Output update failed'));
      
      await expect(
        jobService.setJobOutput('test-project', 'job-123', { type: 'firestore', path: 'path' })
      ).rejects.toThrow('Output update failed');
    });
  });
  
  describe('deleteJob', () => {
    it('should delete a job', async () => {
      await jobService.deleteJob('test-project', 'job-123');
      
      expect(mockFirestoreService.deleteDocument).toHaveBeenCalledWith(
        'projects/test-project/jobs/job-123'
      );
    });
    
    it('should throw if deletion fails', async () => {
      mockFirestoreService.deleteDocument.mockRejectedValueOnce(new Error('Deletion failed'));
      
      await expect(
        jobService.deleteJob('test-project', 'job-123')
      ).rejects.toThrow('Deletion failed');
    });
  });
}); 