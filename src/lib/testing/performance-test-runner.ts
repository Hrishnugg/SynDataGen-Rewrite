/**
 * Performance Test Runner
 * 
 * Utility for running performance tests on the data generation system.
 * This allows simulating multiple concurrent users and jobs to test system performance under load.
 */

import { dataGenerationClient } from '../services/data-generation';
import { JobConfiguration } from '../models/data-generation/types';

export interface PerformanceTestConfig {
  // Test parameters
  concurrentUsers: number;        // Number of simulated concurrent users
  jobsPerUser: number;            // Number of jobs to create per user
  delayBetweenJobsMs: number;     // Delay between job creation in milliseconds
  
  // Job configuration
  jobTemplate: Omit<JobConfiguration, 'name'>;  // Template for job configuration
  
  // Test duration
  maxTestDurationMs: number;      // Maximum test duration in milliseconds
  
  // Callbacks
  onProgress?: (progress: PerformanceTestProgress) => void;  // Called periodically with test progress
  onComplete?: (results: PerformanceTestResults) => void;    // Called when test completes
  onError?: (error: Error) => void;                         // Called when an error occurs
}

export interface PerformanceTestProgress {
  elapsedTimeMs: number;          // Elapsed time in milliseconds
  totalJobs: number;              // Total number of jobs to create
  jobsCreated: number;            // Number of jobs created so far
  jobsCompleted: number;          // Number of jobs completed so far
  jobsFailed: number;             // Number of jobs failed so far
  activeJobs: number;             // Number of jobs currently active
  rateLimitHits: number;          // Number of rate limit hits
  averageResponseTimeMs: number;  // Average response time in milliseconds
}

export interface PerformanceTestResults extends PerformanceTestProgress {
  testDurationMs: number;         // Total test duration in milliseconds
  throughput: number;             // Jobs per second
  successRate: number;            // Percentage of successful jobs
  responseTimesMs: {              // Response time statistics in milliseconds
    min: number;
    max: number;
    avg: number;
    p50: number;  // 50th percentile (median)
    p90: number;  // 90th percentile
    p95: number;  // 95th percentile
    p99: number;  // 99th percentile
  };
  errors: {                       // Error statistics
    count: number;
    byType: Record<string, number>;
  };
}

/**
 * Runs a performance test on the data generation system.
 * 
 * @param config Test configuration
 * @returns A function to stop the test early
 */
export function runPerformanceTest(config: PerformanceTestConfig): () => void {
  const startTime = Date.now();
  let stopRequested = false;
  
  // Test state
  const state = {
    jobsCreated: 0,
    jobsCompleted: 0,
    jobsFailed: 0,
    activeJobs: 0,
    rateLimitHits: 0,
    responseTimes: [] as number[],
    errors: {
      count: 0,
      byType: {} as Record<string, number>,
    },
  };
  
  // Progress reporting interval
  const progressInterval = setInterval(() => {
    if (stopRequested) {
      clearInterval(progressInterval);
      return;
    }
    
    const elapsedTimeMs = Date.now() - startTime;
    
    // Calculate average response time
    const averageResponseTimeMs = state.responseTimes.length > 0
      ? state.responseTimes.reduce((sum, time) => sum + time, 0) / state.responseTimes.length
      : 0;
    
    // Report progress
    if (config.onProgress) {
      config.onProgress({
        elapsedTimeMs,
        totalJobs: config.concurrentUsers * config.jobsPerUser,
        jobsCreated: state.jobsCreated,
        jobsCompleted: state.jobsCompleted,
        jobsFailed: state.jobsFailed,
        activeJobs: state.activeJobs,
        rateLimitHits: state.rateLimitHits,
        averageResponseTimeMs,
      });
    }
    
    // Check if test should complete
    if (
      elapsedTimeMs >= config.maxTestDurationMs ||
      (state.jobsCompleted + state.jobsFailed) >= (config.concurrentUsers * config.jobsPerUser)
    ) {
      completeTest();
    }
  }, 1000);
  
  // Function to complete the test
  const completeTest = () => {
    clearInterval(progressInterval);
    
    if (config.onComplete) {
      const testDurationMs = Date.now() - startTime;
      const totalJobs = state.jobsCreated;
      const successRate = totalJobs > 0 ? (state.jobsCompleted / totalJobs) * 100 : 0;
      const throughput = testDurationMs > 0 ? (totalJobs / (testDurationMs / 1000)) : 0;
      
      // Sort response times for percentile calculations
      const sortedResponseTimes = [...state.responseTimes].sort((a, b) => a - b);
      
      // Calculate percentiles
      const getPercentile = (percentile: number) => {
        if (sortedResponseTimes.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sortedResponseTimes.length) - 1;
        return sortedResponseTimes[Math.max(0, Math.min(index, sortedResponseTimes.length - 1))];
      };
      
      config.onComplete({
        elapsedTimeMs: testDurationMs,
        totalJobs: config.concurrentUsers * config.jobsPerUser,
        jobsCreated: state.jobsCreated,
        jobsCompleted: state.jobsCompleted,
        jobsFailed: state.jobsFailed,
        activeJobs: state.activeJobs,
        rateLimitHits: state.rateLimitHits,
        averageResponseTimeMs: state.responseTimes.length > 0
          ? state.responseTimes.reduce((sum, time) => sum + time, 0) / state.responseTimes.length
          : 0,
        testDurationMs,
        throughput,
        successRate,
        responseTimesMs: {
          min: sortedResponseTimes.length > 0 ? sortedResponseTimes[0] : 0,
          max: sortedResponseTimes.length > 0 ? sortedResponseTimes[sortedResponseTimes.length - 1] : 0,
          avg: state.responseTimes.length > 0
            ? state.responseTimes.reduce((sum, time) => sum + time, 0) / state.responseTimes.length
            : 0,
          p50: getPercentile(50),
          p90: getPercentile(90),
          p95: getPercentile(95),
          p99: getPercentile(99),
        },
        errors: state.errors,
      });
    }
  };
  
  // Function to simulate a user creating jobs
  const simulateUser = async (userId: number) => {
    for (let i = 0; i < config.jobsPerUser; i++) {
      if (stopRequested) break;
      
      try {
        // Create job configuration
        const jobConfig = {
          ...config.jobTemplate,
          name: `Performance Test - User ${userId} - Job ${i + 1}`,
        };
        
        // Measure response time
        const startTime = Date.now();
        
        try {
          // Create job
          const jobId = await dataGenerationClient.createJob(jobConfig);
          
          // Record response time
          const responseTime = Date.now() - startTime;
          state.responseTimes.push(responseTime);
          
          // Update state
          state.jobsCreated++;
          state.activeJobs++;
          
          // Monitor job until completion
          monitorJob(jobId);
        } catch (error) {
          // Check if it's a rate limit error
          if (error instanceof Error && error.message.includes('rate limit')) {
            state.rateLimitHits++;
            
            // Wait for a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
            i--; // Retry this job
          } else {
            // Record other errors
            const errorType = error instanceof Error ? error.name : 'Unknown';
            state.errors.byType[errorType] = (state.errors.byType[errorType] || 0) + 1;
            state.errors.count++;
            state.jobsFailed++;
            
            if (config.onError) {
              config.onError(error instanceof Error ? error : new Error(String(error)));
            }
          }
        }
      } catch (error) {
        // Handle unexpected errors
        state.errors.count++;
        
        if (config.onError) {
          config.onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      // Delay between jobs
      if (i < config.jobsPerUser - 1 && !stopRequested) {
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenJobsMs));
      }
    }
  };
  
  // Function to monitor a job until completion
  const monitorJob = async (jobId: string) => {
    let isComplete = false;
    
    while (!isComplete && !stopRequested) {
      try {
        // Get job status
        const status = await dataGenerationClient.getJobStatus(jobId);
        
        // Check if job is complete
        if (
          status.status === 'completed' ||
          status.status === 'failed' ||
          status.status === 'cancelled'
        ) {
          isComplete = true;
          state.activeJobs--;
          
          if (status.status === 'completed') {
            state.jobsCompleted++;
          } else {
            state.jobsFailed++;
          }
        }
      } catch (error) {
        // Record error
        const errorType = error instanceof Error ? error.name : 'Unknown';
        state.errors.byType[errorType] = (state.errors.byType[errorType] || 0) + 1;
        state.errors.count++;
        
        if (config.onError) {
          config.onError(error instanceof Error ? error : new Error(String(error)));
        }
        
        // Consider job failed after error in monitoring
        isComplete = true;
        state.activeJobs--;
        state.jobsFailed++;
      }
      
      // Delay between status checks
      if (!isComplete && !stopRequested) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };
  
  // Start simulating users
  for (let i = 0; i < config.concurrentUsers; i++) {
    simulateUser(i + 1);
    
    // Small delay between starting users to avoid thundering herd
    if (i < config.concurrentUsers - 1) {
      setTimeout(() => {}, 500);
    }
  }
  
  // Return function to stop the test
  return () => {
    stopRequested = true;
    clearInterval(progressInterval);
  };
} 