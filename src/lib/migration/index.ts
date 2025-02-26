/**
 * Migration Utilities (Stub Version)
 * 
 * This is a simplified version of the migration utilities for build compatibility.
 * The actual implementation is excluded from the build by tsconfig.json.
 */

// Type definitions (without MongoDB dependencies)
interface DbType {}
interface CollectionType {}
interface ClientType {}

// Import types
import { 
  MigrationOptions, 
  MigrationStats, 
  MigrationError,
  ValidationReport
} from './types';

// Import helpers (but not actually using them)
import { validateMigrationData, getValidationSchema } from './validation';
import { getTransformer } from './transformers';
import { loadToFirestore, initializeFirestore, isFirestoreReady, handleFirestoreError } from './firestore';

// Stub values
let mongoClient: ClientType | null = null;
let mongoDb: DbType | null = null;

/**
 * Stub for MongoDB connection initialization
 */
export async function initMongoDB(
  uri: string, 
  dbName?: string,
  options: any = {}
): Promise<DbType> {
  console.warn('MongoDB operations are not available in production build');
  return {} as DbType;
}

/**
 * Stub for closing MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  console.warn('MongoDB operations are not available in production build');
}

/**
 * Stub for listing MongoDB collections
 */
export async function listMongoCollections(db?: DbType): Promise<string[]> {
  console.warn('MongoDB operations are not available in production build');
  return [];
}

/**
 * Stub for getting collection statistics
 */
export async function getCollectionStats(
  collectionName: string,
  db?: DbType
): Promise<{ count: number; avgDocSize: number; totalSize: number }> {
  console.warn('MongoDB operations are not available in production build');
  return { count: 0, avgDocSize: 0, totalSize: 0 };
}

/**
 * Stub for extracting data from MongoDB
 */
export async function extractData(
  collectionName: string,
  options: {
    query?: Record<string, any>;
    sort?: Record<string, 1 | -1>;
    limit?: number;
    skip?: number;
  } = {},
  db?: DbType
): Promise<Record<string, any>[]> {
  console.warn('MongoDB operations are not available in production build');
  return [];
}

/**
 * Stub for migrating a collection
 */
export async function migrateCollection(
  collectionName: string,
  options: MigrationOptions = {}
): Promise<MigrationStats> {
  console.warn('MongoDB operations are not available in production build');
  return {
    collection: collectionName,
    startTime: new Date(),
    endTime: new Date(),
    documentsProcessed: 0,
    documentsSucceeded: 0,
    documentsFailed: 0,
    validationReport: null,
    errors: []
  };
}

/**
 * Stub for migrating multiple collections
 */
export async function migrateCollections(
  collections: string[],
  options: MigrationOptions = {}
): Promise<Map<string, MigrationStats>> {
  console.warn('MongoDB operations are not available in production build');
  const results = new Map<string, MigrationStats>();
  
  for (const collection of collections) {
    results.set(collection, {
      collection,
      startTime: new Date(),
      endTime: new Date(),
      documentsProcessed: 0,
      documentsSucceeded: 0,
      documentsFailed: 0,
      validationReport: null,
      errors: []
    });
  }
  
  return results;
}

/**
 * Stub for processing migration
 */
export async function processMigration(
  documents: Record<string, any>[],
  transformer: (doc: Record<string, any>) => Record<string, any>,
  options: {
    validateData?: boolean;
    validationSchema?: Record<string, any>;
    collectionName?: string;
  } = {}
): Promise<{
  total: number;
  transformed: number;
  failed: number;
  transformedDocuments: Record<string, any>[];
  validationResults?: {
    valid: Record<string, any>[];
    invalid: Record<string, any>[];
    errors: { document: string; error: string }[];
  };
  errors: MigrationError[];
}> {
  console.warn('MongoDB operations are not available in production build');
  return {
    total: 0,
    transformed: 0,
    failed: 0,
    transformedDocuments: [],
    errors: []
  };
}

// Export all types and utilities for API compatibility
export * from './types';
export { validateMigrationData, getValidationSchema } from './validation';
export { getTransformer } from './transformers';
export { loadToFirestore, initializeFirestore, isFirestoreReady, handleFirestoreError } from './firestore';
