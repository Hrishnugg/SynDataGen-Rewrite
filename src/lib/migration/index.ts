/**
 * MongoDB to Firestore Migration Utilities
 * 
 * Utilities for migrating data from MongoDB to Firestore.
 */

// Standard Node.js imports
import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb';

// Import types
import { 
  MigrationOptions, 
  MigrationStats, 
  MigrationError,
  ValidationReport
} from './types';

// Import validation utilities
import { validateMigrationData, getValidationSchema } from './validation';

// Import transformers
import { getTransformer } from './transformers';

// Import Firestore loader
import { loadToFirestore, initializeFirestore, isFirestoreReady, handleFirestoreError } from './firestore';

// MongoDB connection instance
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

/**
 * Initialize MongoDB connection
 * 
 * @param uri MongoDB connection URI
 * @param dbName Optional database name (if not included in URI)
 * @param options Optional MongoDB client options
 * @returns MongoDB database instance
 */
export async function initMongoDB(
  uri: string, 
  dbName?: string,
  options: MongoClientOptions = {}
): Promise<Db> {
  if (!mongoClient) {
    try {
      // Set default connection options for better reliability
      const defaultOptions: MongoClientOptions = {
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 30000,
        retryWrites: true,
        retryReads: true,
        ...options
      };
      
      mongoClient = new MongoClient(uri, defaultOptions);
      await mongoClient.connect();
      console.log('Connected to MongoDB');
    } catch (error: any) {
      console.error('Failed to connect to MongoDB:', error.message || error);
      throw error;
    }
  }
  
  const db = mongoClient.db(dbName);
  mongoDb = db;
  return db;
}

/**
 * Close MongoDB connection
 */
export async function closeMongoDB(): Promise<void> {
  if (mongoClient) {
    try {
      await mongoClient.close();
      mongoClient = null;
      mongoDb = null;
      console.log('MongoDB connection closed');
    } catch (error: any) {
      console.error('Error closing MongoDB connection:', error.message || error);
      // Still set the client to null even if there's an error
      mongoClient = null;
      mongoDb = null;
      throw error;
    }
  }
}

/**
 * Get a list of all collections in the MongoDB database
 * 
 * @param db MongoDB database instance
 * @returns Array of collection names
 */
export async function listMongoCollections(db?: Db): Promise<string[]> {
  const database = db || mongoDb;
  if (!database) {
    throw new Error('MongoDB not initialized. Call initMongoDB first.');
  }
  
  try {
    const collections = await database.listCollections().toArray();
    return collections.map(c => c.name);
  } catch (error: any) {
    console.error('Failed to list collections:', error.message || error);
    throw error;
  }
}

/**
 * Get collection statistics
 * 
 * @param collectionName Name of the collection
 * @param db MongoDB database instance
 * @returns Collection statistics
 */
export async function getCollectionStats(
  collectionName: string,
  db?: Db
): Promise<{ count: number; avgDocSize: number; totalSize: number }> {
  const database = db || mongoDb;
  if (!database) {
    throw new Error('MongoDB not initialized. Call initMongoDB first.');
  }
  
  try {
    const collection = database.collection(collectionName);
    const count = await collection.countDocuments();
    
    // Get collection stats
    const stats = await database.command({ collStats: collectionName });
    
    const avgDocSize = count > 0 ? stats.avgObjSize || 0 : 0;
    const totalSize = stats.size || 0;
    
    return { count, avgDocSize, totalSize };
  } catch (error: any) {
    console.error(`Failed to get stats for ${collectionName}:`, error.message || error);
    throw error;
  }
}

/**
 * Extract documents from a MongoDB collection
 * 
 * @param collectionName Name of the collection
 * @param options Extraction options
 * @param db MongoDB database instance
 * @returns Array of documents
 */
export async function extractData(
  collectionName: string,
  options: {
    query?: Record<string, any>;
    sort?: Record<string, 1 | -1>;
    limit?: number;
    skip?: number;
  } = {},
  db?: Db
): Promise<Record<string, any>[]> {
  const database = db || mongoDb;
  if (!database) {
    throw new Error('MongoDB not initialized. Call initMongoDB first.');
  }
  
  try {
    const { query = {}, sort = { _id: 1 }, limit, skip } = options;
    
    const collection = database.collection(collectionName);
    let cursor = collection.find(query).sort(sort);
    
    if (skip) {
      cursor = cursor.skip(skip);
    }
    
    if (limit) {
      cursor = cursor.limit(limit);
    }
    
    return await cursor.toArray();
  } catch (error: any) {
    console.error(`Failed to extract data from ${collectionName}:`, error.message || error);
    throw error;
  }
}

/**
 * Run complete migration process for a collection
 * 
 * @param collectionName MongoDB collection name to migrate
 * @param options Migration options
 * @returns Migration statistics
 */
export async function migrateCollection(
  collectionName: string,
  options: MigrationOptions = {}
): Promise<MigrationStats> {
  // Set default options
  const {
    sourceDb,
    query = {},
    sort = { _id: 1 },
    batchSize = 100,
    validate = true,
    validationSchema,
    dryRun = false,
    targetCollection = collectionName,
    deleteSource = false
  } = options;
  
  // Initialize stats object
  const stats: MigrationStats = {
    collection: collectionName,
    startTime: new Date(),
    endTime: null,
    documentsProcessed: 0,
    documentsSucceeded: 0,
    documentsFailed: 0,
    validationReport: null,
    errors: []
  };
  
  try {
    // Check MongoDB connection
    if (!mongoDb) {
      throw new Error('MongoDB not initialized. Call initMongoDB first.');
    }
    
    // Check Firestore readiness if not a dry run
    if (!dryRun) {
      const isReady = await isFirestoreReady();
      if (!isReady) {
        throw new Error('Firestore is not ready. Call initializeFirestore first.');
      }
    }
    
    // Use the correct database (either the provided source or the default)
    const db = sourceDb && mongoClient ? mongoClient.db(sourceDb) : mongoDb;
    if (!db) {
      throw new Error('Failed to get database reference');
    }
    
    const collection = db.collection(collectionName);
    
    // Get total document count for progress reporting
    const totalCount = await collection.countDocuments(query);
    console.log(`Found ${totalCount} documents in ${collectionName} to migrate`);
    
    // Prepare validation schema
    let schema = validationSchema;
    if (validate && !schema) {
      schema = getValidationSchema(collectionName);
    }
    
    // Get transformer for this collection
    const transformer = getTransformer(collectionName);
    
    // Track validation metrics
    const validationReport: ValidationReport = {
      totalDocuments: 0,
      validDocuments: 0,
      invalidDocuments: 0,
      validationErrors: []
    };
    
    // Process in batches
    let processed = 0;
    while (processed < totalCount) {
      // Extract a batch of documents
      const documents = await extractData(
        collectionName,
        {
          query,
          sort,
          limit: batchSize,
          skip: processed
        },
        db
      );
      
      if (documents.length === 0) break;
      
      // Update processed count
      processed += documents.length;
      stats.documentsProcessed += documents.length;
      
      console.log(`Processing batch: ${processed} / ${totalCount}`);
      
      try {
        // Transform documents
        const transformedDocs = documents.map(doc => {
          try {
            return transformer(doc);
          } catch (error: any) {
            stats.documentsFailed++;
            stats.errors.push({
              document: doc._id?.toString() || 'unknown',
              error: error.message || 'Transform error',
              phase: 'transform'
            });
            return null;
          }
        }).filter(doc => doc !== null) as Record<string, any>[];
        
        // Validate documents if required
        if (validate && schema) {
          const validationResult = await validateMigrationData(transformedDocs, schema);
          
          // Update validation report
          validationReport.totalDocuments += transformedDocs.length;
          validationReport.validDocuments += validationResult.validIndexes.length;
          validationReport.invalidDocuments += validationResult.invalidIndexes.length;
          
          // Add validation errors to the report
          validationResult.invalidIndexes.forEach(index => {
            const docId = documents[index]._id?.toString() || `doc-${index}`;
            validationReport.validationErrors.push({
              document: docId,
              error: validationResult.errors[index],
              phase: 'validate'
            });
          });
          
          // If some documents are invalid, filter them out
          if (!validationResult.allValid) {
            console.warn(`${validationResult.invalidIndexes.length} documents failed validation`);
            
            // Only keep valid documents for loading
            const validDocs = validationResult.validIndexes.map(index => transformedDocs[index]);
            transformedDocs.length = 0;
            transformedDocs.push(...validDocs);
          }
        }
        
        // Load to Firestore if not a dry run and we have documents to load
        if (!dryRun && transformedDocs.length > 0) {
          try {
            const loadResult = await loadToFirestore(
              transformedDocs,
              targetCollection,
              {
                useBatch: true,
                batchSize: 500,
                generateIds: true,
                merge: false
              }
            );
            
            stats.documentsSucceeded += loadResult.success;
            stats.documentsFailed += loadResult.failed;
            
            // Add any load errors to stats
            Object.entries(loadResult.errors).forEach(([docId, errorMsg]) => {
              stats.errors.push({
                document: docId,
                error: errorMsg,
                phase: 'load'
              });
            });
            
          } catch (error: any) {
            console.error(`Error loading batch to Firestore:`, error.message || error);
            stats.documentsFailed += transformedDocs.length;
            stats.errors.push({
              error: error.message || 'Unknown error during Firestore load',
              phase: 'load'
            });
          }
        } else if (dryRun) {
          // In dry run, we consider all documents as succeeded
          stats.documentsSucceeded += transformedDocs.length;
        }
        
        // Delete source documents if requested and not in dry run
        if (deleteSource && !dryRun) {
          const docIds = documents.map(doc => doc._id);
          try {
            await collection.deleteMany({ _id: { $in: docIds } });
          } catch (error: any) {
            console.error(`Error deleting source documents:`, error.message || error);
            stats.errors.push({
              error: error.message || 'Unknown error deleting source documents',
              phase: 'process'
            });
          }
        }
      } catch (batchError: any) {
        console.error(`Error processing batch:`, batchError.message || batchError);
        stats.documentsFailed += documents.length;
        stats.errors.push({
          error: batchError.message || 'Unknown batch processing error',
          phase: 'process'
        });
      }
    }
    
    // Set validation report in stats
    if (validate) {
      stats.validationReport = validationReport;
    }
    
  } catch (error: any) {
    console.error(`Migration error for ${collectionName}:`, error.message || error);
    stats.errors.push({
      error: error.message || 'Unknown migration error',
      phase: 'process'
    });
  } finally {
    // Finalize stats
    stats.endTime = new Date();
  }
  
  return stats;
}

/**
 * Run a complete migration for multiple collections
 * 
 * @param collections Array of collection names to migrate
 * @param options Migration options
 * @returns Map of collection names to migration stats
 */
export async function migrateCollections(
  collections: string[],
  options: MigrationOptions = {}
): Promise<Map<string, MigrationStats>> {
  const results = new Map<string, MigrationStats>();
  
  for (const collectionName of collections) {
    console.log(`Migrating collection: ${collectionName}`);
    try {
      const stats = await migrateCollection(collectionName, options);
      results.set(collectionName, stats);
    } catch (error: any) {
      console.error(`Failed to migrate ${collectionName}:`, error.message || error);
      
      // Add failed stats
      results.set(collectionName, {
        collection: collectionName,
        startTime: new Date(),
        endTime: new Date(),
        documentsProcessed: 0,
        documentsSucceeded: 0,
        documentsFailed: 0,
        validationReport: null,
        errors: [{
          error: error.message || 'Unknown error',
          phase: 'process'
        }]
      });
    }
  }
  
  return results;
}

/**
 * Process a batch of documents through transformation and optional validation
 * 
 * @param documents Source documents to process
 * @param transformer Function to transform documents
 * @param options Processing options
 * @returns Statistics and processed documents
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
  // Initialize results
  const result = {
    total: documents.length,
    transformed: 0,
    failed: 0,
    transformedDocuments: [] as Record<string, any>[],
    validationResults: options.validateData ? {
      valid: [] as Record<string, any>[],
      invalid: [] as Record<string, any>[],
      errors: [] as { document: string; error: string }[]
    } : undefined,
    errors: [] as MigrationError[]
  };

  try {
    // Transform documents
    for (const doc of documents) {
      try {
        const transformed = transformer(doc);
        result.transformedDocuments.push(transformed);
        result.transformed++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          document: doc._id?.toString() || 'unknown',
          error: error.message || 'Unknown transformation error',
          phase: 'transform'
        });
      }
    }

    // Validate if requested
    if (options.validateData) {
      // Find or create validation schema
      let schema = options.validationSchema;
      if (!schema && options.collectionName) {
        schema = getValidationSchema(options.collectionName);
      }

      if (schema) {
        // Validate the transformed documents
        const validationResult = await validateMigrationData(result.transformedDocuments, schema);
        
        // Filter valid documents
        result.transformedDocuments = result.transformedDocuments.filter((_, index) => 
          validationResult.validIndexes.includes(index)
        );
        
        // Populate validation results
        if (result.validationResults) {
          result.validationResults.valid = validationResult.validIndexes.map(i => 
            result.transformedDocuments[i]
          );
          
          result.validationResults.invalid = validationResult.invalidIndexes.map(i => 
            result.transformedDocuments[i]
          );
          
          for (const index of validationResult.invalidIndexes) {
            const doc = result.transformedDocuments[index];
            result.validationResults.errors.push({
              document: doc.id || doc._id?.toString() || `doc-${index}`,
              error: validationResult.errors[index] || 'Validation failed'
            });
          }
        }
      }
    }

    return result;
  } catch (error: any) {
    // Catch unexpected errors
    result.errors.push({
      error: error.message || 'Unexpected error during processing',
      phase: 'process'
    });
    
    return result;
  }
}

// Export all types and utilities
export * from './types';
export { validateMigrationData, getValidationSchema } from './validation';
export { getTransformer } from './transformers';
export { loadToFirestore, initializeFirestore, isFirestoreReady, handleFirestoreError } from './firestore';
