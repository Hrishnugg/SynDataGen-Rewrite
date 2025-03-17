/**
 * Re-export performance test types from the main types file
 */

// Define the types locally instead of importing them
export interface PerformanceTestProgress {
  percentComplete: number;
  currentStep: string;
  elapsedTime: number;
  estimatedTimeRemaining?: number;
  jobsCreated?: number;
  totalJobs?: number;
  jobsCompleted?: number;
  jobsFailed?: number;
  activeJobs?: number;
  rateLimitHits?: number;
  averageResponseTimeMs?: number;
  elapsedTimeMs?: number;
}

export interface PerformanceTestResults {
  throughput: number;
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  successRate: number;
  duration: number;
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  metrics: Record<string, any>;
  responseTimesMs?: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  testDurationMs?: number;
  jobsCreated?: number;
  jobsCompleted?: number;
  errors?: {
    count: number;
    byType: Record<string, number>;
  };
}

export interface JobError {
  code: string;
  message: string;
  details?: any;
}

export interface PerformanceTestConfig {
  concurrency: number;
  duration: number;
  rampUp?: number;
  targetRPS?: number;
  testType: 'load' | 'stress' | 'soak' | 'spike';
  endpoint?: string;
  payloadSize?: number;
  dataType?: string;
  concurrentUsers?: number;
  jobsPerUser?: number;
  delayBetweenJobsMs?: number;
  maxTestDurationMs?: number;
  jobTemplate?: any;
  onProgress?: (progress: PerformanceTestProgress) => void;
  onComplete?: (results: PerformanceTestResults) => void;
  onError?: (error: JobError) => void;
}

// Helper function to run performance tests
export const runPerformanceTest = (config: PerformanceTestConfig): (() => void) => {
  console.log('Running performance test with config:', config);
  return () => console.log('Test stopped');
};
