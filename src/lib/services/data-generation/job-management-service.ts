/**
 * Placeholder job management service for the pipeline service tests
 */

export const jobManagementService = {
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
}; 