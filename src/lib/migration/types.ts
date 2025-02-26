/**
 * Migration Types
 * 
 * Type definitions for the migration process from MongoDB to Firestore.
 */

/**
 * Options for the migration process
 */
export interface MigrationOptions {
  /** Source MongoDB database name (if different from default) */
  sourceDb?: string;
  
  /** Query to filter documents from source collection */
  query?: Record<string, any>;
  
  /** Sort order for document extraction */
  sort?: Record<string, 1 | -1>;
  
  /** Number of documents to process in each batch */
  batchSize?: number;
  
  /** Whether to validate documents before loading to Firestore */
  validate?: boolean;
  
  /** Schema for validation (if validation is enabled) */
  validationSchema?: Record<string, any>;
  
  /** Whether to run a dry-run without writing to Firestore */
  dryRun?: boolean;
  
  /** Target Firestore collection (if different from source) */
  targetCollection?: string;
  
  /** Whether to delete source data after migration */
  deleteSource?: boolean;
}

/**
 * Error information during migration
 */
export interface MigrationError {
  /** Document ID or identifier (if available) */
  document?: string;
  
  /** Error message */
  error: string;
  
  /** Phase where the error occurred */
  phase: 'extract' | 'transform' | 'validate' | 'load' | 'process';
  
  /** Any additional details */
  details?: Record<string, any>;
}

/**
 * Validation report for migrated data
 */
export interface ValidationReport {
  /** Total number of documents processed */
  totalDocuments: number;
  
  /** Number of documents that passed validation */
  validDocuments: number;
  
  /** Number of documents that failed validation */
  invalidDocuments: number;
  
  /** Validation error details */
  validationErrors: MigrationError[];
}

/**
 * Statistics for a migration run
 */
export interface MigrationStats {
  /** Collection name that was migrated */
  collection: string;
  
  /** Start time of the migration */
  startTime: Date;
  
  /** End time of the migration (null if not completed) */
  endTime: Date | null;
  
  /** Number of documents processed */
  documentsProcessed: number;
  
  /** Number of documents successfully migrated */
  documentsSucceeded: number;
  
  /** Number of documents that failed to migrate */
  documentsFailed: number;
  
  /** Validation report (if validation was enabled) */
  validationReport: ValidationReport | null;
  
  /** Array of errors encountered during migration */
  errors: MigrationError[];
}

/**
 * Validation result for a batch of documents
 */
export interface ValidationResult {
  /** Indexes of valid documents */
  validIndexes: number[];
  
  /** Indexes of invalid documents */
  invalidIndexes: number[];
  
  /** Error messages for invalid documents */
  errors: Record<number, string>;
  
  /** Whether the validation passed for all documents */
  allValid: boolean;
}

/**
 * A transformation function for converting MongoDB documents to Firestore format
 */
export type TransformFunction<T = any, R = any> = (document: T) => R;

/**
 * Options for document transformation
 */
export interface TransformOptions {
  /** Whether to include MongoDB _id in the result */
  includeId?: boolean;
  
  /** Whether to convert ObjectId to string */
  stringifyIds?: boolean;
  
  /** Custom field mappings */
  fieldMappings?: Record<string, string>;
  
  /** Fields to exclude from result */
  excludeFields?: string[];
  
  /** Default values for missing fields */
  defaultValues?: Record<string, any>;
}

/**
 * Firestore Load Result
 */
export interface FirestoreLoadResult {
  /** Number of documents successfully loaded */
  success: number;
  
  /** Number of documents that failed to load */
  failed: number;
  
  /** Array of document IDs that were loaded successfully */
  successIds: string[];
  
  /** Map of failed document IDs and corresponding errors */
  errors: Record<string, string>;
}
