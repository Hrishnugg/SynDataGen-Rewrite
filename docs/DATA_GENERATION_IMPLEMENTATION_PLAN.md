# Data Generation System Implementation Plan

## Overview
This document outlines the implementation plan for the data generation system, designed to be modular and extensible for future pipeline integration. The system will serve as a bridge between our Next.js application and the external data generation pipeline hosted on Google Cloud.

## 1. Core Job Management System

### 1.1 Job Data Model
```typescript
interface JobConfiguration {
  // Core Parameters
  dataType: string;           // Type of data to generate
  dataSize: number;          // Size of the dataset to generate
  inputFormat: string;       // Format of input data (CSV, JSON, Parquet, etc.)
  outputFormat: string;      // Format of output data (matching input format)
  
  // Storage Configuration
  inputBucket: string;       // Project-specific bucket for input data
  outputBucket: string;      // Project-specific bucket for output data
  inputPath: string;         // Path to input data in bucket
  outputPath: string;        // Path for output data in bucket
  
  // Job Control
  isAsync: boolean;         // Whether to process asynchronously
  timeout: number;          // Maximum job runtime in seconds
  resumeWindow: number;     // Time window for job resumption in seconds
  
  // Advanced Configuration (Extensible)
  parameters: Record<string, any>;  // Additional pipeline-specific parameters
}

interface JobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;         // Percentage complete
  startTime: Date;
  endTime?: Date;
  lastUpdated: Date;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  stages: {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
    progress?: number;
  }[];
  metadata: {
    inputSize: number;
    outputSize?: number;
    processingTime?: number;
    retryCount: number;
    expirationDate?: Date;  // When this job record will be deleted (6 months by default)
  };
}
```

### 1.2 Job Management Service
```typescript
interface JobManagementService {
  // Core Job Operations
  createJob(config: JobConfiguration): Promise<string>;  // Returns jobId
  getJobStatus(jobId: string): Promise<JobStatus>;
  cancelJob(jobId: string): Promise<boolean>;
  resumeJob(jobId: string): Promise<boolean>;
  
  // Job Monitoring
  subscribeToJobUpdates(jobId: string, callback: (status: JobStatus) => void): () => void;
  getJobHistory(customerId: string, options?: {
    limit?: number;
    offset?: number;
    status?: JobStatus['status'];
    startDate?: Date;
    endDate?: Date;
  }): Promise<JobStatus[]>;
  
  // Rate Limiting
  checkRateLimit(customerId: string): Promise<boolean>;
  getRateLimitStatus(customerId: string): Promise<{
    currentJobs: number;
    maxJobs: number;  // Default: 5 concurrent jobs
    cooldownPeriod: number;  // Default: 30-60 seconds after cancellation
  }>;
  
  // Data Retention
  cleanupExpiredJobs(): Promise<number>;  // Returns count of cleaned up jobs
  setJobRetentionPolicy(customerId: string, retentionDays: number): Promise<boolean>;
  getJobRetentionPolicy(customerId: string): Promise<number>;  // Default: 180 days (6 months)
}
```

## 2. Pipeline Integration Layer

### 2.1 Pipeline Interface
```typescript
interface PipelineService {
  // Job Submission
  submitJob(config: JobConfiguration): Promise<{
    jobId: string;
    status: 'accepted' | 'rejected';
    message?: string;
  }>;
  
  // Job Control
  cancelJob(jobId: string): Promise<boolean>;
  resumeJob(jobId: string): Promise<boolean>;
  
  // Status Updates
  getJobStatus(jobId: string): Promise<JobStatus>;
  
  // Health Check
  checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
    metrics?: Record<string, number>;
  }>;
}
```

### 2.2 Webhook System
```typescript
interface WebhookConfig {
  url: string;
  secret: string;
  events: ('job.created' | 'job.updated' | 'job.completed' | 'job.failed')[];
}

interface WebhookPayload {
  event: string;
  jobId: string;
  timestamp: string;
  data: JobStatus;
  signature: string;
}
```

## 3. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [x] Implement Job Management Service
  - [x] Create job data model and interfaces
  - [x] Implement job state machine
  - [x] Add rate limiting functionality (5 concurrent jobs per customer)
  - [x] Add data retention policy (6-month default retention)
  - [x] Create job persistence layer in Firestore

- [x] Set up Pipeline Integration
  - [x] Create pipeline interface
  - [x] Implement webhook system
  - [x] Add health check endpoints
  - [x] Set up error handling and retries
  - [x] Implement cooldown period (30-60 seconds after cancellation)

### Phase 2: API Implementation (Week 2)
- [x] Create REST API endpoints
  - [x] Job creation and configuration
  - [x] Job status and control
  - [x] Job history and monitoring
  - [x] Rate limit management
  - [x] Data retention management

- [x] Implement Webhook System
  - [x] Webhook registration and management
  - [x] Event handling and delivery
  - [x] Retry mechanism for failed deliveries
  - [x] Webhook security and validation

### Phase 3: User Interface (Week 3) - IN PROGRESS
- [x] Build Job Management UI
  - [x] Job creation form
  - [x] Job status dashboard with real-time updates
  - [x] Job history view using shadcn UI datatable component
  - [x] Rate limit monitoring and visualization
  - [x] Scheduled cleanup indicators for data retention

- [x] Implement Data Viewer
  - [x] Excel/Sheets-like tabular data viewer
  - [x] Support for different data formats (CSV, JSON, Parquet)
  - [x] Column filtering and sorting
  - [x] Basic data visualization options
  - [x] Download functionality for viewed data

- [x] Implement Real-time Updates
  - [x] WebSocket integration
  - [x] Progress visualization
  - [x] Status notifications
  - [x] Error handling and display

### Phase 4: Testing and Mock Integration (Week 4)
- [x] Implement Mock Pipeline
  - [x] Create mock pipeline service for testing
  - [x] Simulate different job scenarios and statuses
  - [x] Test webhook delivery with the mock service
  - [x] Validate end-to-end flow with simulated data

- [x] Comprehensive Testing
  - [x] Unit tests for core services
  - [x] Integration tests with mock pipeline
  - [x] UI component testing
  - [x] Performance testing with simulated load

- [x] Security Implementation
  - [x] Customer isolation
  - [x] Rate limiting enforcement
  - [x] Access control
  - [x] Data validation

- [ ] Prepare for Pipeline Integration
  - [ ] Document integration points
  - [ ] Create integration test plan for when pipeline is ready
  - [ ] Set up monitoring for integration testing

## 4. Security Considerations

### 4.1 Customer Isolation
- Each customer's jobs run in isolated environments
- Project-specific storage buckets
- Separate service accounts per customer
- Strict access controls on storage and compute resources

### 4.2 Rate Limiting
- Maximum 5 concurrent jobs per customer
- 30-60 second cooldown period after job cancellation
- Storage quota enforcement
- API rate limiting

### 4.3 Data Protection
- Encryption at rest for all data
- Secure transfer of data between services
- Access logging for sensitive operations
- Regular security audits

### 4.4 Data Retention
- 6-month retention period for job history by default
- Automated cleanup of expired job data
- Option for customers to request earlier deletion
- Compliance with data protection regulations

## 5. Monitoring and Observability

### 5.1 Metrics Collection
- Job success/failure rates
- Processing time
- Resource utilization
- Rate limit hits
- Webhook delivery success rates
- Data retention and cleanup metrics

### 5.2 Alerting
- Job failures
- System health issues
- Rate limit violations
- Storage quota warnings
- Data retention issues

### 5.3 Logging
- Job execution logs
- System events
- Security events
- Performance metrics
- Data cleanup events

## 6. UI Components

### 6.1 Job Management Interface
- Use shadcn UI datatable component for job listing and management
- Responsive design for desktop and mobile viewing
- Filtering and sorting capabilities
- Action buttons for job control
- Status indicators with color coding

### 6.2 Data Viewer Component
- Excel/Sheets-like interface for viewing tabular data
- Column resizing and reordering
- Data type detection and formatting
- Pagination for large datasets
- Search and filter capabilities
- Export functionality

### 6.3 Job Creation Form
- Step-by-step wizard interface
- Input validation
- File upload for input data
- Configuration options based on data type
- Preview capability before submission

### 6.4 Dashboard Components
- Job status summary cards
- Recent jobs timeline
- Rate limit usage indicators
- Storage usage visualization
- Error and warning notifications

## 7. Future Considerations

### 7.1 Extensibility
- Support for additional data types
- New output formats
- Advanced job configurations
- Custom pipeline integrations

### 7.2 Performance Optimization
- Batch processing
- Caching strategies
- Resource optimization
- Cost management

### 7.3 Advanced Features
- Job scheduling
- Data versioning
- Advanced analytics
- Custom reporting

### 7.4 Pipeline Integration
- Seamless integration when pipeline is ready
- Minimal code changes required
- Feature flag for enabling real pipeline
- Gradual rollout strategy

## Questions for Future Discussion

1. Should we implement a job queue system for better resource management?
2. Do we need to support job templates for common configurations?
3. Should we implement job dependencies for complex workflows?
4. Do we need to support custom validation rules for generated data?
5. Should we implement a preview system for generated data?
6. Do we need to support data transformation between different formats?
7. Should we implement a job cost estimation system?
8. Do we need to support custom webhook endpoints per customer?
9. Should we allow customization of the retention period per customer?
10. Do we need to implement more advanced data visualization in the viewer component? 