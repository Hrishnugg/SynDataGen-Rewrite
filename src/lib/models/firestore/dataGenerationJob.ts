import { ProjectMetadata } from '@/types/metadata';

/**
 * Firestore Data Generation Job Model
 * 
 * Defines the structure and types for data generation jobs in Firestore.
 */

/**
 * Data Generation Job model for Firestore
 */
export interface DataGenerationJob {
  id: string;            // Unique job identifier
  projectId: string;     // Reference to the project
  customerId: string;    // Reference to the customer
  name: string;          // Job name
  description: string;   // Job description
  createdAt: Date;       // Creation timestamp
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  gcpJobId: string;      // GCP job identifier
  
  // Job configuration
  config: {
    inputDataset?: {
      storageUri?: string;  // URI to input data in the bucket
      format?: string;      // Data format
    };
    parameters: {
      dataType: string;    // Type of data to generate
      recordCount: number; // Number of records to generate
      format: 'csv' | 'json' | 'parquet'; // Output format
      quality: 'draft' | 'production';    // Data quality level
      schema: object;      // Data schema specification
    };
    outputConfig: {
      destination: string; // Output destination path in bucket
    };
  };
  
  // Progress tracking
  progress: {
    status: string;
    percentComplete: number;
    startTime?: Date;
    endTime?: Date;
    error?: {
      code: string;
      message: string;
    };
  };
  
  metadata?: ProjectMetadata; // Additional job metadata
}

/**
 * Input type for creating a new data generation job
 */
export interface CreateDataGenerationJobInput {
  projectId: string;
  customerId: string;
  name: string;
  description?: string;
  
  config: {
    inputDataset?: {
      storageUri?: string;
      format?: string;
    };
    parameters: {
      dataType: string;
      recordCount: number;
      format: 'csv' | 'json' | 'parquet';
      quality: 'draft' | 'production';
      schema: object;
    };
    outputConfig: {
      destination: string;
    };
  };
  
  metadata?: ProjectMetadata;
}

/**
 * Firestore collection name for data generation jobs
 */
export const DATA_GENERATION_JOB_COLLECTION = 'dataGenerationJobs';

/**
 * Convert a Firestore document to a DataGenerationJob object
 * @param doc Firestore document data
 * @param id Document ID
 * @returns DataGenerationJob object
 */
export function firestoreToDataGenerationJob(doc: FirebaseFirestore.DocumentData, id: string): DataGenerationJob {
  return {
    id,
    projectId: doc.projectId,
    customerId: doc.customerId,
    name: doc.name,
    description: doc.description || '',
    createdAt: doc.createdAt?.toDate() || new Date(),
    status: doc.status || 'queued',
    gcpJobId: doc.gcpJobId || '',
    
    config: {
      inputDataset: doc.config?.inputDataset || {},
      parameters: {
        dataType: doc.config?.parameters?.dataType || '',
        recordCount: doc.config?.parameters?.recordCount || 0,
        format: doc.config?.parameters?.format || 'csv',
        quality: doc.config?.parameters?.quality || 'draft',
        schema: doc.config?.parameters?.schema || {}
      },
      outputConfig: {
        destination: doc.config?.outputConfig?.destination || ''
      }
    },
    
    progress: {
      status: doc.progress?.status || 'pending',
      percentComplete: doc.progress?.percentComplete || 0,
      startTime: doc.progress?.startTime?.toDate() || undefined,
      endTime: doc.progress?.endTime?.toDate() || undefined,
      error: doc.progress?.error || undefined
    },
    
    metadata: doc.metadata || {}
  };
}

/**
 * Convert a DataGenerationJob object to Firestore document data
 * @param job DataGenerationJob object
 * @returns Firestore document data
 */
export function dataGenerationJobToFirestore(job: DataGenerationJob): FirebaseFirestore.DocumentData {
  return {
    projectId: job.projectId,
    customerId: job.customerId,
    name: job.name,
    description: job.description,
    createdAt: job.createdAt,
    status: job.status,
    gcpJobId: job.gcpJobId,
    
    config: {
      inputDataset: job.config.inputDataset || {},
      parameters: {
        dataType: job.config.parameters.dataType,
        recordCount: job.config.parameters.recordCount,
        format: job.config.parameters.format,
        quality: job.config.parameters.quality,
        schema: job.config.parameters.schema
      },
      outputConfig: {
        destination: job.config.outputConfig.destination
      }
    },
    
    progress: {
      status: job.progress.status,
      percentComplete: job.progress.percentComplete,
      startTime: job.progress.startTime,
      endTime: job.progress.endTime,
      error: job.progress.error
    },
    
    metadata: job.metadata || {}
  };
} 