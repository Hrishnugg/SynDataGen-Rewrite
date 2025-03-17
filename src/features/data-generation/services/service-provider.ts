/**
 * Data Generation Service Provider
 * 
 * This module provides a unified way to access data generation services,
 * handling the selection between mock and real implementations based on environment.
 */

import { MockJobManagementService } from './mock-service';
import { JobManagementService } from './job-management-service';

/**
 * Get the appropriate job management service based on environment
 */
export function getJobManagementService(): JobManagementService {
  // Use mock service in development environment
  if (process.env.NODE_ENV === 'development') {
    return new MockJobManagementService() as unknown as JobManagementService;
  }
  
  // Use real service in production
  return new JobManagementService();
}

// Export a singleton instance for convenience
export const jobService = getJobManagementService();
