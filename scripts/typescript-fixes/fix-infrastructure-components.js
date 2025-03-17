/**
 * Fix Infrastructure Components
 * 
 * This script addresses TypeScript issues in critical infrastructure components:
 * 1. Firebase services
 * 2. GCP services
 * 3. Core service implementations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const LIB_DIR = path.join(SRC_DIR, 'lib');
const FIREBASE_DIR = path.join(LIB_DIR, 'firebase');
const GCP_DIR = path.join(LIB_DIR, 'gcp');
const API_SERVICES_DIR = path.join(LIB_DIR, 'api/services');
const FEATURES_DIR = path.join(SRC_DIR, 'features');
const DATA_GEN_DIR = path.join(FEATURES_DIR, 'data-generation/services');

// Critical files
const CRITICAL_FILES = {
  FIREBASE_TS: path.join(FIREBASE_DIR, 'firebase.ts'),
  FIREBASE_AUTH_TS: path.join(FIREBASE_DIR, 'auth.ts'),
  GCP_FIRESTORE_TS: path.join(GCP_DIR, 'firestore.ts'),
  FIRESTORE_SERVICE_TS: path.join(API_SERVICES_DIR, 'firestore-service.ts'),
  JOB_MANAGEMENT_SERVICE_TS: path.join(DATA_GEN_DIR, 'job-management-service.ts'),
};

/**
 * Create an interface file for Firestore service
 */
function createFirestoreServiceInterface() {
  const filePath = path.join(API_SERVICES_DIR, 'firestore-service.interface.ts');
  console.log(`Creating Firestore service interface at ${filePath}...`);
  
  const content = `/**
 * Firestore Service Interface
 * 
 * This file defines the interface for the Firestore service.
 * All implementations should adhere to this interface.
 */

import { Firestore, CollectionReference, DocumentReference, DocumentData } from 'firebase-admin/firestore';

/**
 * Query options for Firestore queries
 */
export interface FirestoreQueryOptions {
  where?: Array<{
    field: string;
    operator: '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: unknown;
  }>;
  orderBy?: Array<{
    field: string;
    direction?: 'asc' | 'desc';
  }>;
  limit?: number;
  startAfter?: DocumentData;
  endBefore?: DocumentData;
  page?: number;
  pageSize?: number;
}

/**
 * Pagination result for paginated queries
 */
export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Error class for Firestore service
 */
export class FirestoreServiceError extends Error {
  constructor(message: string, public code?: string, public details?: unknown) {
    super(message);
    this.name = 'FirestoreServiceError';
  }
}

/**
 * Interface for Firestore service
 */
export interface IFirestoreService {
  /**
   * Initialize the Firestore service
   */
  initialize(): Promise<void>;
  
  /**
   * Get a collection reference
   */
  collection(path: string): CollectionReference | null;
  
  /**
   * Get a document reference
   */
  doc(path: string): DocumentReference | null;
  
  /**
   * Create a document
   */
  createDocument<T extends Record<string, unknown>>(collectionPath: string, data: T): Promise<string>;
  
  /**
   * Update a document
   */
  updateDocument<T extends Record<string, unknown>>(path: string, data: Partial<T>): Promise<void>;
  
  /**
   * Delete a document
   */
  deleteDocument(path: string): Promise<void>;
  
  /**
   * Get a document by path
   */
  getDocument<T>(path: string): Promise<T | null>;
  
  /**
   * Query documents
   */
  queryDocuments<T>(collectionPath: string, conditions: FirestoreQueryOptions): Promise<T[]>;
  
  /**
   * Get paginated documents
   */
  getPaginatedDocuments<T>(collectionPath: string, options: FirestoreQueryOptions): Promise<PaginationResult<T>>;
}

/**
 * Factory function to get Firestore service
 */
export function getFirestoreService(firestoreInstance?: Firestore): IFirestoreService {
  // This is just a placeholder for the interface file
  // The actual implementation will be in firestore-service.ts
  throw new Error('This is just an interface definition, not an implementation');
}
`;
  
  fs.writeFileSync(filePath, content);
  console.log(`Created Firestore service interface at ${filePath}`);
  return filePath;
}

/**
 * Create an interface file for Job Management service
 */
function createJobManagementServiceInterface() {
  const filePath = path.join(DATA_GEN_DIR, 'job-management-service.interface.ts');
  console.log(`Creating Job Management service interface at ${filePath}...`);
  
  const content = `/**
 * Job Management Service Interface
 * 
 * This file defines the interface for the Job Management service.
 * All implementations should adhere to this interface.
 */

/**
 * Job status enum
 */
export type JobStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

/**
 * Job progress interface
 */
export interface JobProgress {
  percentComplete: number;
  currentStep?: string;
  stepsCompleted?: number;
  totalSteps?: number;
  startTime?: Date;
  endTime?: Date | null;
  estimatedTimeRemaining?: number;
}

/**
 * Job error interface
 */
export interface JobError {
  message: string;
  code?: string;
  details?: unknown;
  timestamp?: Date;
  recoverable?: boolean;
}

/**
 * Job data interface - generic to allow different types of jobs
 */
export interface JobData<T = unknown> {
  parameters: T;
  options?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Job result interface - generic to allow different types of results
 */
export interface JobResult<T = unknown> {
  data: T;
  metadata?: Record<string, unknown>;
  stats?: {
    duration: number;
    processedItems: number;
    errors: number;
    warnings: number;
  };
}

/**
 * Job interface
 */
export interface Job<TData = unknown, TResult = unknown> {
  id: string;
  type: string;
  name?: string;
  description?: string;
  status: JobStatus;
  projectId?: string;
  customerId?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress?: JobProgress;
  data?: JobData<TData>;
  result?: JobResult<TResult>;
  error?: JobError;
  tags?: string[];
  priority?: number;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Job filter interface
 */
export interface JobFilter {
  type?: string;
  status?: JobStatus;
  projectId?: string;
  customerId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  tags?: string[];
}

/**
 * Job update interface
 */
export interface JobUpdate<TData = unknown, TResult = unknown> {
  status?: JobStatus;
  progress?: Partial<JobProgress>;
  data?: Partial<JobData<TData>>;
  result?: Partial<JobResult<TResult>>;
  error?: JobError;
  tags?: string[];
  priority?: number;
  name?: string;
  description?: string;
}

/**
 * Job creation options
 */
export interface JobCreationOptions {
  priority?: number;
  tags?: string[];
  startImmediately?: boolean;
}

/**
 * Job Management Service Error
 */
export class JobManagementServiceError extends Error {
  constructor(message: string, public code?: string, public details?: unknown) {
    super(message);
    this.name = 'JobManagementServiceError';
  }
}

/**
 * Job Management Service Interface
 */
export interface IJobManagementService {
  /**
   * Create a new job
   */
  createJob<TData = unknown>(
    type: string, 
    data?: JobData<TData>, 
    options?: JobCreationOptions
  ): Promise<Job<TData>>;
  
  /**
   * Get a job by ID
   */
  getJob<TData = unknown, TResult = unknown>(id: string): Promise<Job<TData, TResult> | null>;
  
  /**
   * Update a job
   */
  updateJob<TData = unknown, TResult = unknown>(
    id: string, 
    updates: JobUpdate<TData, TResult>
  ): Promise<Job<TData, TResult> | null>;
  
  /**
   * List jobs with filtering
   */
  listJobs<TData = unknown, TResult = unknown>(
    filter?: JobFilter,
    page?: number,
    pageSize?: number
  ): Promise<{
    jobs: Job<TData, TResult>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  
  /**
   * Start a job
   */
  startJob(id: string): Promise<boolean>;
  
  /**
   * Pause a job
   */
  pauseJob(id: string): Promise<boolean>;
  
  /**
   * Cancel a job
   */
  cancelJob(id: string): Promise<boolean>;
  
  /**
   * Delete a job
   */
  deleteJob(id: string): Promise<boolean>;
  
  /**
   * Get job status
   */
  getJobStatus(id: string): Promise<{
    id: string;
    status: JobStatus;
    progress?: JobProgress;
    error?: JobError;
  } | null>;
  
  /**
   * Subscribe to job updates
   */
  subscribeToJobUpdates(
    id: string, 
    callback: (job: Job) => void
  ): () => void;
}
`;
  
  fs.writeFileSync(filePath, content);
  console.log(`Created Job Management service interface at ${filePath}`);
  return filePath;
}

/**
 * Update Firestore service to implement interface
 */
function updateFirestoreService(interfacePath) {
  const filePath = CRITICAL_FILES.FIRESTORE_SERVICE_TS;
  console.log(`Updating Firestore service at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for interface
  const importStatement = `import { IFirestoreService, FirestoreQueryOptions, PaginationResult, FirestoreServiceError } from './firestore-service.interface';`;
  
  // Update class definition to implement interface
  content = content.replace(
    /export class FirestoreService {/,
    `export class FirestoreService implements IFirestoreService {`
  );
  
  // Add import at the top
  content = content.replace(
    /import { Firestore, CollectionReference, DocumentReference } from 'firebase-admin\/firestore';/,
    `import { Firestore, CollectionReference, DocumentReference, DocumentData } from 'firebase-admin/firestore';\n${importStatement}`
  );
  
  // Fix method signatures
  content = content.replace(
    /async createDocument\(collectionPath: string, data: any\): Promise<string>/,
    `async createDocument<T extends Record<string, unknown>>(collectionPath: string, data: T): Promise<string>`
  );
  
  content = content.replace(
    /async updateDocument\(path: string, data: any\): Promise<void>/,
    `async updateDocument<T extends Record<string, unknown>>(path: string, data: Partial<T>): Promise<void>`
  );
  
  content = content.replace(
    /async getDocument\(path: string\): Promise<any>/,
    `async getDocument<T>(path: string): Promise<T | null>`
  );
  
  content = content.replace(
    /async queryDocuments\(collectionPath: string, conditions: any\[\]\): Promise<any\[\]>/,
    `async queryDocuments<T>(collectionPath: string, conditions: FirestoreQueryOptions): Promise<T[]>`
  );
  
  // Add missing method for paginated documents
  const paginatedMethodImplementation = `
  /**
   * Get paginated documents
   */
  async getPaginatedDocuments<T>(collectionPath: string, options: FirestoreQueryOptions): Promise<PaginationResult<T>> {
    console.log(\`Get paginated documents in \${collectionPath} stub called\`);
    return {
      items: [],
      total: 0,
      page: options.page || 1,
      pageSize: options.pageSize || 10,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    };
  }`;
  
  // Add the new method before the class closing bracket
  content = content.replace(
    /}\s+export default FirestoreService;/,
    `${paginatedMethodImplementation}\n}\n\nexport default FirestoreService;`
  );
  
  // Add factory function to get FirestoreService
  const factoryFunction = `
/**
 * Get an instance of the FirestoreService
 */
export function getFirestoreService(firestoreInstance?: Firestore): IFirestoreService {
  return new FirestoreService(firestoreInstance);
}`;
  
  // Add the factory function after the class export
  content = content.replace(
    /export default FirestoreService;/,
    `export default FirestoreService;\n${factoryFunction}`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated Firestore service at ${filePath}`);
}

/**
 * Update Job Management service to implement interface
 */
function updateJobManagementService(interfacePath) {
  const filePath = CRITICAL_FILES.JOB_MANAGEMENT_SERVICE_TS;
  console.log(`Updating Job Management service at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for interface
  const importStatement = `import { IJobManagementService, JobStatus, JobProgress, JobError, JobData, JobResult, JobFilter, JobUpdate, JobCreationOptions, JobManagementServiceError } from './job-management-service.interface';`;
  
  // Update the Job interface to align with the interface file
  content = content.replace(
    /export interface Job {[\s\S]+?}/,
    `// Re-export interface from the interface file
export { Job, JobStatus, JobProgress, JobError, JobData, JobResult, JobFilter, JobUpdate, JobCreationOptions, JobManagementServiceError } from './job-management-service.interface';`
  );
  
  // Update class definition to implement interface
  content = content.replace(
    /export class JobManagementService {/,
    `export class JobManagementService implements IJobManagementService {`
  );
  
  // Add import at the top
  content = content.replace(
    /\/\*\*\n \* Job Management Service - Stub implementation/,
    `/**\n * Job Management Service - Stub implementation\n */\n\n${importStatement}`
  );
  
  // Fix method signatures and implementations
  content = content.replace(
    /async createJob\(type: string, data\?: any\): Promise<Job>/,
    `async createJob<TData = unknown>(type: string, data?: JobData<TData>, options?: JobCreationOptions): Promise<Job<TData>>`
  );
  
  content = content.replace(
    /async getJob\(id: string\): Promise<Job \| null>/,
    `async getJob<TData = unknown, TResult = unknown>(id: string): Promise<Job<TData, TResult> | null>`
  );
  
  content = content.replace(
    /async updateJob\(id: string, updates: Partial<Job>\): Promise<Job \| null>/,
    `async updateJob<TData = unknown, TResult = unknown>(id: string, updates: JobUpdate<TData, TResult>): Promise<Job<TData, TResult> | null>`
  );
  
  content = content.replace(
    /async listJobs\(filter\?: Partial<Job>\): Promise<Job\[\]>/,
    `async listJobs<TData = unknown, TResult = unknown>(
    filter?: JobFilter,
    page?: number,
    pageSize?: number
  ): Promise<{
    jobs: Job<TData, TResult>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>`
  );
  
  // Fix implementation of listJobs
  content = content.replace(
    /async listJobs[\s\S]+?return \[\];(\s+})/,
    `async listJobs<TData = unknown, TResult = unknown>(
    filter?: JobFilter,
    page?: number,
    pageSize?: number
  ): Promise<{
    jobs: Job<TData, TResult>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    console.log('List jobs stub called');
    return {
      jobs: [],
      total: 0,
      page: page || 1,
      pageSize: pageSize || 10,
      totalPages: 0
    };
  }`
  );
  
  // Add missing methods
  const missingMethods = `
  /**
   * Start a job
   */
  async startJob(id: string): Promise<boolean> {
    console.log(\`Start job \${id} stub called\`);
    return true;
  }
  
  /**
   * Pause a job
   */
  async pauseJob(id: string): Promise<boolean> {
    console.log(\`Pause job \${id} stub called\`);
    return true;
  }
  
  /**
   * Cancel a job
   */
  async cancelJob(id: string): Promise<boolean> {
    console.log(\`Cancel job \${id} stub called\`);
    return true;
  }
  
  /**
   * Delete a job
   */
  async deleteJob(id: string): Promise<boolean> {
    console.log(\`Delete job \${id} stub called\`);
    return true;
  }
  
  /**
   * Get job status
   */
  async getJobStatus(id: string): Promise<{
    id: string;
    status: JobStatus;
    progress?: JobProgress;
    error?: JobError;
  } | null> {
    console.log(\`Get job status \${id} stub called\`);
    return null;
  }
  
  /**
   * Subscribe to job updates
   */
  subscribeToJobUpdates(
    id: string, 
    callback: (job: Job) => void
  ): () => void {
    console.log(\`Subscribe to job updates \${id} stub called\`);
    return () => {}; // Unsubscribe function
  }`;
  
  // Add the missing methods before the class closing bracket
  content = content.replace(
    /}\s+export default JobManagementService;/,
    `${missingMethods}\n}\n\nexport default JobManagementService;`
  );
  
  // Create instance of the service
  const serviceInstance = `
/**
 * Singleton instance of the job management service
 */
export const jobManagementService = new JobManagementService();`;
  
  // Add the singleton instance after the class export
  content = content.replace(
    /export default JobManagementService;/,
    `export default JobManagementService;\n${serviceInstance}`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated Job Management service at ${filePath}`);
}

/**
 * Update tsconfig.json to include previously excluded files
 */
function updateTsConfig() {
  const filePath = path.join(ROOT_DIR, 'tsconfig.json');
  console.log(`Updating tsconfig.json at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Parse the tsconfig.json file
  try {
    const tsconfig = JSON.parse(content);
    
    // Create a backup of the original exclude array
    if (tsconfig.exclude) {
      tsconfig.originalExclude = [...tsconfig.exclude];
    }
    
    // Filter out the infrastructure files from the exclude array
    if (tsconfig.exclude) {
      tsconfig.exclude = tsconfig.exclude.filter(pattern => {
        return ![
          "src/lib/gcp/**/*", 
          "src/lib/api/services/firestore-service.ts",
          "src/features/data-generation/services/job-management-service.ts",
          "src/lib/firebase/**/*"
        ].includes(pattern);
      });
    }
    
    // Write the updated tsconfig.json file
    fs.writeFileSync(filePath, JSON.stringify(tsconfig, null, 2));
    console.log(`Updated tsconfig.json at ${filePath}`);
  } catch (error) {
    console.error(`Error updating tsconfig.json: ${error.message}`);
  }
}

/**
 * Fix Firebase auth imports
 */
function fixFirebaseAuthImports() {
  const filePath = CRITICAL_FILES.FIREBASE_AUTH_TS;
  console.log(`Fixing Firebase auth imports at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix import for validateFirebaseCredentials
  content = content.replace(
    /import { validateFirebaseCredentials } from '@\/lib\/gcp\/firestore\/initFirestore';/,
    `// Import from the correct location
import { validateFirebaseCredentials } from '@/lib/gcp/serviceAccount';`
  );
  
  // Fix import for FirestoreServiceError
  content = content.replace(
    /import { FirestoreServiceError } from '@\/lib\/api\/services\/firestore-service';/,
    `// Import from the interface file
import { FirestoreServiceError } from '@/lib/api/services/firestore-service.interface';`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Firebase auth imports at ${filePath}`);
}

/**
 * Create a stub for validateFirebaseCredentials in serviceAccount.ts
 */
function addValidateFirebaseCredentials() {
  const filePath = path.join(GCP_DIR, 'serviceAccount.ts');
  console.log(`Adding validateFirebaseCredentials to ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add validateFirebaseCredentials function if it doesn't exist
  if (!content.includes('export function validateFirebaseCredentials')) {
    const validateFunction = `
/**
 * Validate Firebase credentials
 * 
 * @param credentials The credentials to validate
 * @returns A validation result
 */
export function validateFirebaseCredentials(credentials: any): { valid: boolean; error?: string } {
  try {
    if (!credentials) {
      return { valid: false, error: 'No credentials provided' };
    }
    
    if (!credentials.projectId) {
      return { valid: false, error: 'Missing projectId in credentials' };
    }
    
    if (!credentials.clientEmail) {
      return { valid: false, error: 'Missing clientEmail in credentials' };
    }
    
    if (!credentials.privateKey) {
      return { valid: false, error: 'Missing privateKey in credentials' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}`;
    
    // Add the function before the last export
    content = content.replace(
      /export default/,
      `${validateFunction}\n\nexport default`
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`Added validateFirebaseCredentials to ${filePath}`);
  } else {
    console.log(`validateFirebaseCredentials already exists in ${filePath}`);
  }
}

/**
 * Fix GCP Firestore ts-ignore comments
 */
function fixGcpFirestoreTsIgnore() {
  const filePath = CRITICAL_FILES.GCP_FIRESTORE_TS;
  console.log(`Fixing GCP Firestore ts-ignore comments at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Define the global state interface at the top of the file
  const globalStateInterface = `
// Define global state for TypeScript
declare global {
  var __firestoreState: {
    initialized: boolean;
    instance: Firestore | null;
    settingsApplied: boolean;
  };
}`;
  
  // Add the interface after the imports
  content = content.replace(
    /import { getFirestore, Firestore, DocumentData, QuerySnapshot, Query, DocumentReference } from 'firebase-admin\/firestore';/,
    `import { getFirestore, Firestore, DocumentData, QuerySnapshot, Query, DocumentReference } from 'firebase-admin/firestore';\n${globalStateInterface}`
  );
  
  // Replace ts-ignore comments with proper typing
  content = content.replace(
    /\/\/ @ts-ignore - Global state might exist from initFirestore\.ts\s+if \(global\.__firestoreState\?\.initialized && global\.__firestoreState\?\.instance\) {/,
    `// Check if global state exists
    if (global.__firestoreState?.initialized && global.__firestoreState?.instance) {`
  );
  
  content = content.replace(
    /\/\/ @ts-ignore - Check if settings have been applied in global state\s+if \(!global\.__firestoreState\?\.settingsApplied\) {/,
    `// Check if settings have been applied in global state
    if (!global.__firestoreState?.settingsApplied) {`
  );
  
  content = content.replace(
    /\/\/ @ts-ignore - Mark settings as applied in global state if it exists\s+if \(global\.__firestoreState\) {/,
    `// Mark settings as applied in global state if it exists
      if (global.__firestoreState) {`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed GCP Firestore ts-ignore comments at ${filePath}`);
}

/**
 * Update mock service to align with JobManagementService interface
 */
function updateMockService() {
  const filePath = path.join(DATA_GEN_DIR, 'mock-service.ts');
  console.log(`Updating Mock Service at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for the interface
  const importStatement = `import { IJobManagementService, Job, JobStatus, JobProgress, JobError, JobData, JobResult, JobFilter, JobUpdate, JobCreationOptions } from './job-management-service.interface';`;
  
  // Update class definition to implement interface
  content = content.replace(
    /export class MockJobManagementService {/,
    `export class MockJobManagementService implements IJobManagementService {`
  );
  
  // Add import at the top of the file
  content = content.replace(
    /import { JobConfiguration, JobCreationResponse, JobDetails, JobStatus } from '@\/lib\/models\/data-generation\/types';/,
    `import { JobConfiguration, JobCreationResponse, JobDetails } from '@/lib/models/data-generation/types';\n${importStatement}`
  );
  
  // Add adapter methods to align with the interface
  const adapterMethods = `
  /**
   * Adapter methods to align with the JobManagementService interface
   */
  
  async createJob<TData = unknown>(
    type: string, 
    data?: JobData<TData>, 
    options?: JobCreationOptions
  ): Promise<Job<TData>> {
    // Adapt to the old method signature
    const projectId = (data?.parameters as any)?.projectId || 'unknown';
    const customerId = (data?.parameters as any)?.customerId || 'unknown';
    const config = (data?.parameters as any)?.config || {};
    
    const response = await this.createJob(customerId, projectId, config as JobConfiguration);
    
    // Convert to the expected interface
    return {
      id: response.jobId,
      type,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId,
      customerId,
      data: data as any,
    };
  }
  
  async getJob<TData = unknown, TResult = unknown>(id: string): Promise<Job<TData, TResult> | null> {
    const status = await this.getJobStatus(id);
    if (!status) return null;
    
    return {
      id,
      type: 'data-generation',
      status: status.status as JobStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: status.progress as JobProgress,
      error: status.error as JobError,
    };
  }
  
  async updateJob<TData = unknown, TResult = unknown>(
    id: string, 
    updates: JobUpdate<TData, TResult>
  ): Promise<Job<TData, TResult> | null> {
    if (updates.status) {
      await this.updateJobStatus(id, updates.status as any);
    }
    
    return this.getJob(id);
  }
  
  async listJobs<TData = unknown, TResult = unknown>(
    filter?: JobFilter,
    page?: number,
    pageSize?: number
  ): Promise<{
    jobs: Job<TData, TResult>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    return {
      jobs: [],
      total: 0,
      page: page || 1,
      pageSize: pageSize || 10,
      totalPages: 0
    };
  }
  
  async startJob(id: string): Promise<boolean> {
    await this.resumeJob(id);
    return true;
  }
  
  async pauseJob(id: string): Promise<boolean> {
    await this.updateJobStatus(id, 'paused');
    return true;
  }
  
  async deleteJob(id: string): Promise<boolean> {
    await this.cancelJob(id);
    return true;
  }`;
  
  // Add the adapter methods before the class closing bracket
  content = content.replace(
    /}\s*$/,
    `${adapterMethods}\n}`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated Mock Service at ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('Starting infrastructure component fixes...');
  
  try {
    // Step 1: Create interface files for critical services
    const firestoreServiceInterfacePath = createFirestoreServiceInterface();
    const jobManagementServiceInterfacePath = createJobManagementServiceInterface();
    
    // Step 2: Update service implementations to implement interfaces
    updateFirestoreService(firestoreServiceInterfacePath);
    updateJobManagementService(jobManagementServiceInterfacePath);
    
    // Step 3: Fix imports in Firebase auth
    fixFirebaseAuthImports();
    
    // Step 4: Add validateFirebaseCredentials to serviceAccount.ts
    addValidateFirebaseCredentials();
    
    // Step 5: Fix GCP Firestore ts-ignore comments
    fixGcpFirestoreTsIgnore();
    
    // Step 6: Update mock service to align with JobManagementService interface
    updateMockService();
    
    // Step 7: Update tsconfig.json to include previously excluded files
    updateTsConfig();
    
    // Run TypeScript compiler to check for errors
    console.log('Running TypeScript compiler to check for errors...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('TypeScript compilation successful!');
    } catch (error) {
      console.error('TypeScript compilation failed. Some manual fixes may be required.');
    }
    
    console.log('\nInfrastructure component fixes completed!');
    console.log('\nManual steps that may be required:');
    console.log('1. Review error messages from TypeScript compiler');
    console.log('2. Fix any remaining type errors in infrastructure components');
    console.log('3. Check for compatibility issues with existing code');
    console.log('4. Ensure proper interface implementations');
    
  } catch (error) {
    console.error('Error fixing infrastructure components:', error);
  }
}

// Run the script
main().catch(console.error); 