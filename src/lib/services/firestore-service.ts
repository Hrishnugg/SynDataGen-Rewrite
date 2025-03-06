/**
 * Optimized Firestore Data Service
 * 
 * This service provides an optimized interface for Firestore operations
 * with enhanced caching, cursor-based pagination, and batch operations.
 */

import { getFirestoreInstance, initializeFirestore } from '../gcp/firestore/initFirestore';
import { 
  DocumentReference, 
  CollectionReference, 
  Query, 
  DocumentData, 
  Firestore,
  Transaction,
  WriteBatch,
  QueryDocumentSnapshot,
  FieldValue,
  FieldPath
} from 'firebase-admin/firestore';
import { timeOperation } from '../monitoring/firestore-metrics';
import { cacheService, CacheConfig } from './cache-service';

// Define error codes for Firestore service
export enum FIRESTORE_ERROR_CODES {
  INITIALIZATION_ERROR = 'firestore/initialization-error',
  CONNECTION_ERROR = 'firestore/connection-error',
  QUERY_ERROR = 'firestore/query-error',
  DOCUMENT_NOT_FOUND = 'firestore/document-not-found',
  WRITE_ERROR = 'firestore/write-error',
  DELETE_ERROR = 'firestore/delete-error',
  TRANSACTION_ERROR = 'firestore/transaction-error',
  BATCH_ERROR = 'firestore/batch-error',
  PERMISSION_ERROR = 'firestore/permission-error',
  VALIDATION_ERROR = 'firestore/validation-error',
  UNKNOWN_ERROR = 'firestore/unknown-error'
}

// Custom error class for Firestore service
export class FirestoreServiceError extends Error {
  code: string;
  details?: Record<string, any>;
  originalError?: any;

  constructor(code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'FirestoreServiceError';
    this.code = code;
    this.details = details;
    this.originalError = details?.originalError;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, FirestoreServiceError.prototype);
  }
}

// Enhanced query options
export interface FirestoreQueryOptions {
  where?: Array<{
    field: string;
    operator: '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: any;
  }>;
  orderBy?: Array<{
    field: string;
    direction?: 'asc' | 'desc';
  }>;
  limit?: number;
  startAfter?: DocumentData | QueryDocumentSnapshot;
  endBefore?: DocumentData | QueryDocumentSnapshot;
  select?: string[]; // Fields to select (projection)
  cacheTtl?: number; // Cache TTL in seconds
  skipCache?: boolean; // Skip cache for this operation
}

// Pagination result that includes the last document for cursor-based pagination
export interface PaginationResult<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Optimized Firestore Data Service Class
 */
export class FirestoreService {
  private db!: Firestore; // Use definite assignment assertion
  private initialized: boolean = false;
  private useBatchWrite: boolean = true; // Default to using batch writes for better performance

  constructor(private cacheConfig?: CacheConfig) {
    // Initialize db as null, it will be properly set in init()
  }

  /**
   * Initialize the Firestore service
   */
  async init(): Promise<void> {
    console.log(`[FirestoreService] init() called at ${new Date().toISOString()}`);
    
    // Check if already initialized
    if (this.initialized && this.db) {
      console.log('[FirestoreService] Already initialized, reusing existing Firestore instance');
      return;
    }
    
    try {
      console.log('[FirestoreService] Attempting to initialize Firestore...');
      
      // Check global Firestore state first
      // @ts-ignore - Global state might exist
      if (global.__firestoreState?.initialized && global.__firestoreState?.instance) {
        console.log('[Firestore:DEBUG] Using existing Firestore instance from global state');
        // @ts-ignore
        this.db = global.__firestoreState.instance;
        this.initialized = true;
        
        // Initialize the cache if configured
        if (this.cacheConfig?.enabled) {
          console.log('[FirestoreService] Initializing cache with config:', this.cacheConfig);
          try {
            cacheService.init(this.cacheConfig);
          } catch (cacheError) {
            // Don't let cache initialization failure stop Firestore initialization
            console.warn('[FirestoreService] Cache initialization failed, continuing without cache:', cacheError);
          }
        }
        
        console.log('[FirestoreService] Successfully initialized from global state');
        return;
      }
      
      // Try getFirestoreInstance() next - this should give us an instance if one exists
      try {
        let db = getFirestoreInstance();
        
        if (db) {
          console.log('[FirestoreService] Using existing Firestore instance from getFirestoreInstance');
          this.db = db;
          this.initialized = true;
          
          // Initialize the cache if configured
          if (this.cacheConfig?.enabled) {
            console.log('[FirestoreService] Initializing cache with config:', this.cacheConfig);
            try {
              cacheService.init(this.cacheConfig);
            } catch (cacheError) {
              // Don't let cache initialization failure stop Firestore initialization
              console.warn('[FirestoreService] Cache initialization failed, continuing without cache:', cacheError);
            }
          }
          
          console.log('[FirestoreService] Successfully initialized');
          return;
        }
      } catch (instanceError) {
        // Log but continue to try initializing directly
        console.warn('[FirestoreService] Error getting existing instance:', instanceError);
      }
      
      // If we get here, we need to initialize Firestore directly
      console.log('[FirestoreService] No existing instance found, calling initializeFirestore directly');
      try {
        const db = await initializeFirestore();
        if (!db) {
          throw new Error('Failed to initialize Firestore: null instance returned');
        }
        
        // Store the initialized Firestore instance
        this.db = db;
        this.initialized = true;
        
        // Initialize the cache if configured
        if (this.cacheConfig?.enabled) {
          console.log('[FirestoreService] Initializing cache with config:', this.cacheConfig);
          try {
            cacheService.init(this.cacheConfig);
          } catch (cacheError) {
            // Don't let cache initialization failure stop Firestore initialization
            console.warn('[FirestoreService] Cache initialization failed, continuing without cache:', cacheError);
          }
        }
        
        console.log('[FirestoreService] Successfully initialized');
      } catch (initError) {
        console.error('[FirestoreService] Error during initializeFirestore call:', initError);
        throw initError;
      }
    } catch (error) {
      console.error('[FirestoreService] Initialization failed:', error instanceof Error ? error.message : String(error));
      
      // Rethrow the error with our error code
      throw new FirestoreServiceError(
        FIRESTORE_ERROR_CODES.INITIALIZATION_ERROR,
        `Failed to initialize Firestore: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error }
      );
    }
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized || !this.db) {
      let retries = 2; // Allow a couple of retries
      let lastError: Error | null = null;
      
      while (retries >= 0 && (!this.initialized || !this.db)) {
        try {
          await this.init();
          if (this.initialized && this.db) {
            return; // Successfully initialized
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`Firestore initialization attempt failed (${retries} retries left):`, error);
          
          // If this is specifically the "already initialized" error, break immediately
          // as we should have handled it in init()
          if (lastError.message.includes('Firestore has already been initialized')) {
            break;
          }
          
          retries--;
          
          // Small delay before retrying
          if (retries >= 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      // If we get here and we're still not initialized, throw the last error
      if (!this.initialized || !this.db) {
        console.error('All Firestore initialization attempts failed');
        throw new FirestoreServiceError(
          FIRESTORE_ERROR_CODES.INITIALIZATION_ERROR,
          `Firestore initialization failed after multiple attempts: ${lastError?.message || 'Unknown error'}`,
          { originalError: lastError }
        );
      }
    }
    
    // Final check to make sure we have a valid db instance
    if (!this.db) {
      throw new FirestoreServiceError(
        FIRESTORE_ERROR_CODES.INITIALIZATION_ERROR,
        'Firestore instance is not available after initialization',
        {}
      );
    }
  }

  /**
   * Get a document by ID with optimized caching
   */
  async getById<T>(
    collectionPath: string, 
    id: string, 
    options: { cacheTtl?: number; skipCache?: boolean; select?: string[] } = {}
  ): Promise<T | null> {
    await this.ensureInitialized();

    const cacheKey = `${collectionPath}:${id}`;
    
    // Check cache first unless skipped
    if (!options.skipCache) {
      const cachedData = cacheService.get<T>(cacheKey);
      if (cachedData) return cachedData;
    }

    return await timeOperation('read', collectionPath, async () => {
      try {
        let docRef = this.db.collection(collectionPath).doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return null;
        }

        // Apply field selection manually if needed
        let data: DocumentData;
        if (options.select && options.select.length > 0) {
          // Only include the selected fields
          data = { id: doc.id };
          const docData = doc.data() || {};
          
          for (const field of options.select) {
            if (field !== 'id' && field in docData) {
              data[field] = docData[field];
            }
          }
        } else {
          // Include all fields
          data = { id: doc.id, ...doc.data() };
        }
        
        // Cache the result if caching is not explicitly skipped
        if (!options.skipCache) {
          cacheService.set(cacheKey, data as unknown as T, options.cacheTtl);
        }

        return data as unknown as T;
      } catch (error) {
        console.error(`Error fetching document ${id} from ${collectionPath}:`, error);
        throw new Error(`Failed to fetch document: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Helper to extract Firestore index URL from error messages
   * @private
   */
  private extractIndexUrl(error: any): string | null {
    if (!error) return null;
    
    const message = error.message || error.toString();
    
    // Check if the error message contains an index URL
    const urlRegex = /https:\/\/console\.firebase\.google\.com\/v1\/r\/project\/[^?]+\?create_composite=[a-zA-Z0-9_\-%]+/;
    const match = message.match(urlRegex);
    
    if (match) {
      return match[0];
    }
    
    return null;
  }

  /**
   * Query documents with advanced filtering and ordering
   */
  async query<T>(
    collectionPath: string,
    options: FirestoreQueryOptions = {}
  ): Promise<T[]> {
    await this.ensureInitialized();
    
    // Generate cache key based on collection and query options
    const cacheKey = `query:${collectionPath}:${JSON.stringify(options)}`;
    
    // Check cache first unless skipped
    if (!options.skipCache) {
      const cachedResults = cacheService.get<T[]>(cacheKey);
      if (cachedResults) {
        console.log(`Cache hit for query on ${collectionPath}`);
        return cachedResults;
      }
      
      console.log(`Cache miss for query on ${collectionPath}`);
    }
    
    console.log(`Executing query on collection: ${collectionPath} with options: ${JSON.stringify(options, null, 2)}`);
    
    return await timeOperation('query', collectionPath, async () => {
      try {
        // Build the query
        const query = this.buildQuery(collectionPath, options);
        
        // Execute the query
        const snapshot = await query.get();
        
        // Convert the documents to the expected format
        const results = snapshot.docs.map(doc => {
          return { 
            id: doc.id, 
            ...doc.data() 
          } as unknown as T;
        });
        
        console.log(`Query returned ${results.length} documents from ${collectionPath}`);
        
        // Cache the results unless explicitly skipped
        if (!options.skipCache) {
          const ttl = options.cacheTtl || undefined; // Use default TTL if not specified
          cacheService.set(cacheKey, results, ttl);
          console.log(`Cached ${results.length} results from ${collectionPath}`);
        }
        
        return results;
      } catch (error: any) {
        const errorMessage = `Error querying ${collectionPath}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        
        // Check if this is a missing index error and extract the URL
        const indexUrl = this.extractIndexUrl(error);
        if (indexUrl) {
          console.error(`Missing Firestore index detected. Create it here: ${indexUrl}`);
          
          if (process.env.NODE_ENV === 'development') {
            // In development, create a friendly error with the index URL
            throw new Error(`Missing Firestore index for query on ${collectionPath}: ${error.message}`);
          } else {
            // In production, just log the error but don't expose details
            throw new Error(`Database query error: Missing required index (see logs for details)`);
          }
        }
        
        throw new Error(errorMessage);
      }
    });
  }

  /**
   * Query with cursor-based pagination
   * Returns a PaginationResult containing items and the last document for cursor continuity
   */
  async queryWithPagination<T>(
    collectionPath: string,
    options: FirestoreQueryOptions & { pageSize?: number } = {}
  ): Promise<PaginationResult<T>> {
    await this.ensureInitialized();

    return await timeOperation('query', collectionPath, async () => {
      try {
        // Make sure we have a limit for pagination
        const pageSize = options.pageSize || options.limit || 20;
        const paginationOptions = { ...options, limit: pageSize + 1 }; // Request one more item to check if there's more
        
        const query = this.buildQuery(collectionPath, paginationOptions);
        
        // Apply field selection to the query if specified
        let snapshot;
        if (options.select && options.select.length > 0) {
          snapshot = await query.select(...options.select).get();
        } else {
          snapshot = await query.get();
        }
        
        // Check if there are more results
        const hasMore = snapshot.docs.length > pageSize;
        
        // Get the actual items for this page
        const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
        
        // Get the last document for cursor continuation
        const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        
        // Map documents to data
        const results = docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as unknown as T[];

        return {
          items: results,
          lastDoc,
          hasMore
        };
      } catch (error) {
        console.error(`Error paginating collection ${collectionPath}:`, error);
        throw new Error(`Failed to paginate documents: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Create a new document with automatic ID
   */
  async create<T extends Record<string, any>>(
    collectionPath: string,
    data: Omit<T, 'id'>,
    options: { useBatch?: boolean } = {}
  ): Promise<string> {
    await this.ensureInitialized();

    return await timeOperation('write', collectionPath, async () => {
      try {
        // Add server timestamp for createdAt and updatedAt if not provided
        const documentData = {
          ...data,
          createdAt: data.createdAt || FieldValue.serverTimestamp(),
          updatedAt: data.updatedAt || FieldValue.serverTimestamp()
        } as DocumentData;

        let docRef: DocumentReference;
        
        // Use batch write if enabled for better atomicity
        if (this.useBatchWrite && options.useBatch !== false) {
          const batch = this.db.batch();
          docRef = this.db.collection(collectionPath).doc();
          batch.set(docRef, documentData);
          await batch.commit();
        } else {
          docRef = await this.db.collection(collectionPath).add(documentData);
        }

        // Invalidate collection cache
        cacheService.invalidateCollection(collectionPath);

        return docRef.id;
      } catch (error) {
        console.error(`Error creating document in ${collectionPath}:`, error);
        throw new Error(`Failed to create document: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Create a document with a specific ID
   */
  async createWithId<T extends Record<string, any>>(
    collectionPath: string,
    id: string,
    data: Omit<T, 'id'>,
    options: { merge?: boolean; useBatch?: boolean } = {}
  ): Promise<boolean> {
    await this.ensureInitialized();

    return await timeOperation('write', collectionPath, async () => {
      try {
        // Add server timestamp for createdAt and updatedAt if not provided
        const documentData = {
          ...data,
          createdAt: data.createdAt || FieldValue.serverTimestamp(),
          updatedAt: data.updatedAt || FieldValue.serverTimestamp()
        } as DocumentData;

        const docRef = this.db.collection(collectionPath).doc(id);
        
        // Use batch write if enabled for better atomicity
        if (this.useBatchWrite && options.useBatch !== false) {
          const batch = this.db.batch();
          
          if (options.merge) {
            batch.set(docRef, documentData, { merge: true });
          } else {
            batch.set(docRef, documentData);
          }
          
          await batch.commit();
        } else {
          if (options.merge) {
            await docRef.set(documentData, { merge: true });
          } else {
            await docRef.set(documentData);
          }
        }

        // Invalidate specific document and collection caches
        cacheService.delete(`${collectionPath}:${id}`);
        cacheService.invalidatePattern(`query:${collectionPath}`);

        return true;
      } catch (error) {
        console.error(`Error creating document ${id} in ${collectionPath}:`, error);
        throw new Error(`Failed to create document with ID: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Update a document with optimized invalidation
   */
  async update<T extends Record<string, any>>(
    collectionPath: string,
    id: string,
    data: Partial<T>,
    options: { useBatch?: boolean } = {}
  ): Promise<boolean> {
    await this.ensureInitialized();

    return await timeOperation('write', collectionPath, async () => {
      try {
        // Always update the updatedAt timestamp
        const updateData = {
          ...data,
          updatedAt: FieldValue.serverTimestamp()
        } as DocumentData;

        const docRef = this.db.collection(collectionPath).doc(id);
        
        // Use batch write if enabled for better atomicity
        if (this.useBatchWrite && options.useBatch !== false) {
          const batch = this.db.batch();
          batch.update(docRef, updateData);
          await batch.commit();
        } else {
          await docRef.update(updateData);
        }

        // Invalidate specific document and collection caches
        cacheService.delete(`${collectionPath}:${id}`);
        cacheService.invalidatePattern(`query:${collectionPath}`);

        return true;
      } catch (error) {
        console.error(`Error updating document ${id} in ${collectionPath}:`, error);
        throw new Error(`Failed to update document: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Delete a document with cache invalidation
   */
  async delete(
    collectionPath: string,
    id: string,
    options: { useBatch?: boolean } = {}
  ): Promise<boolean> {
    await this.ensureInitialized();

    return await timeOperation('delete', collectionPath, async () => {
      try {
        const docRef = this.db.collection(collectionPath).doc(id);
        
        // Use batch write if enabled for better atomicity
        if (this.useBatchWrite && options.useBatch !== false) {
          const batch = this.db.batch();
          batch.delete(docRef);
          await batch.commit();
        } else {
          await docRef.delete();
        }

        // Invalidate specific document and collection caches
        cacheService.delete(`${collectionPath}:${id}`);
        cacheService.invalidatePattern(`query:${collectionPath}`);

        return true;
      } catch (error) {
        console.error(`Error deleting document ${id} from ${collectionPath}:`, error);
        throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Run a transaction
   */
  async runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    await this.ensureInitialized();

    try {
      const result = await this.db.runTransaction(updateFunction);
      return result;
    } catch (error) {
      console.error('Error running transaction:', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }

  }

  /**
   * Create a batch write operation
   */
  createBatch(): WriteBatch {
    return this.db.batch();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    cacheService.clear();
  }

  /**
   * Build a query from options
   * Private helper method to construct Firestore queries
   */
  private buildQuery(
    collectionPath: string, 
    options: FirestoreQueryOptions
  ): Query<DocumentData> {
    let query: Query<DocumentData> = this.db.collection(collectionPath);
    
    // Apply where clauses
    if (options.where) {
      console.log("Query where clauses before processing:", JSON.stringify(options.where, null, 2));
      
      for (const whereClause of options.where) {
        console.log("Processing where clause:", whereClause);
        
        const [fieldPath, operator, value] = whereClause;
        
        // Special handling for array-contains with objects
        if (operator === 'array-contains' && typeof value === 'object' && value !== null) {
          console.log(`⚠️ Special handling for array-contains with object value:`, value);
          
          // Remove any undefined properties from the object to prevent query issues
          if (value && typeof value === 'object') {
            Object.keys(value).forEach(key => {
              if (value[key] === undefined) {
                console.log(`🔧 Removing undefined property "${key}" from query object`);
                delete value[key];
              }
            });
          }
          
          // Try to adapt query based on environment variable
          if (process.env.ADAPT_ARRAY_CONTAINS_QUERY === 'true') {
            // For array-contains with {userId: 'xyz'}, try to optimize the query
            if (fieldPath === 'teamMembers' && value && 'userId' in value) {
              const userId = value.userId;
              console.log(`🔄 Adapting array-contains query for teamMembers with userId: ${userId}`);
              
              try {
                // Try to use a query that checks for userId inside teamMembers array objects
                query = query.where(`${fieldPath}.userId`, '==', userId);
                console.log(`✅ Successfully adapted query to ${fieldPath}.userId == ${userId}`);
                continue; // Skip the original query attempt
              } catch (adaptError) {
                console.error(`❌ Error adapting query:`, adaptError);
                // Fall through to original query
              }
            }
          }
        }
        
        // Original query logic
        try {
          query = query.where(fieldPath, operator, value);
        } catch (error) {
          console.error(`❌ Error in where clause:`, whereClause, error);
          throw error;
        }
      }
    }
    
    // Apply order by
    if (options.orderBy) {
      for (const orderByClause of options.orderBy) {
        // Check if orderByClause is an array or an object and handle accordingly
        if (Array.isArray(orderByClause)) {
          // Array format: [fieldName, direction]
          const [field, direction] = orderByClause;
          console.log(`Applying orderBy with array format: field=${field}, direction=${direction || 'asc'}`);
          query = query.orderBy(field, direction || 'asc');
        } else {
          // Object format: { field, direction }
          console.log(`Applying orderBy with object format: field=${orderByClause.field}, direction=${orderByClause.direction || 'asc'}`);
          query = query.orderBy(orderByClause.field, orderByClause.direction || 'asc');
        }
      }
    }
    
    // Apply pagination via cursor
    if (options.startAfter) {
      query = query.startAfter(options.startAfter);
    }
    
    if (options.endBefore) {
      query = query.endBefore(options.endBefore);
    }
    
    // Apply limit (important for pagination and performance)
    if (options.limit) {
      query = query.limit(options.limit);
    } else {
      // Default limit to prevent accidental large reads
      query = query.limit(100);
    }
    
    return query;
  }
  
  /**
   * Preload common data into the cache
   * @param collections Collections to preload
   */
  async preloadCommonData(collections: string[] = []): Promise<void> {
    await this.ensureInitialized();
    
    const preloadData: Record<string, any> = {};
    
    for (const collection of collections) {
      try {
        // Get the first 20 documents from each collection for quick access
        const snapshot = await this.db.collection(collection).limit(20).get();
        
        snapshot.docs.forEach(doc => {
          const id = doc.id;
          const data = { id, ...doc.data() };
          preloadData[`${collection}:${id}`] = data;
        });
        
        // Also cache the collection query result
        preloadData[`query:${collection}:{"limit":20}`] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error(`Error preloading collection ${collection}:`, error);
      }
    }
    
    // Preload the data into cache
    await cacheService.preloadData(async () => preloadData);
  }

  /**
   * Query documents in a collection
   * @param collectionPath Path to the collection
   * @param queryFn Function to build the query
   * @returns Promise resolving to an array of document data
   */
  async queryDocuments<T = DocumentData>(
    collectionPath: string,
    queryFn: (collectionRef: CollectionReference<T>) => Query<T>
  ): Promise<T[]> {
    try {
      const collection = await this.getCollection<T>(collectionPath);
      const query = queryFn(collection);
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Add the document ID to the data object
        return {
          ...data,
          id: doc.id
        } as T;
      });
    } catch (error) {
      throw new FirestoreServiceError(
        FIRESTORE_ERROR_CODES.QUERY_ERROR,
        `Failed to query documents in '${collectionPath}': ${error instanceof Error ? error.message : String(error)}`,
        { collectionPath, originalError: error }
      );
    }
  }

  /**
   * Get a collection reference by path
   * @param collectionPath Path to the Firestore collection
   * @returns Promise resolving to a collection reference
   */
  async getCollection<T = DocumentData>(collectionPath: string): Promise<CollectionReference<T>> {
    await this.ensureInitialized();
    // Cast the collection reference to the generic type
    return this.db.collection(collectionPath) as CollectionReference<T>;
  }
}

// Export a singleton instance
let firestoreServiceInstance: FirestoreService | null = null;

/**
 * Get a FirestoreService instance with optional initialization
 * @param cacheConfig Optional cache configuration
 * @param initializeNow Whether to initialize the service immediately (default false)
 * @returns FirestoreService instance
 */
export async function getFirestoreService(cacheConfig?: CacheConfig, initializeNow: boolean = false): Promise<FirestoreService> {
  if (!firestoreServiceInstance) {
    firestoreServiceInstance = new FirestoreService(cacheConfig);
    
    // Initialize immediately if requested
    if (initializeNow) {
      try {
        await firestoreServiceInstance.init();
      } catch (error) {
        console.warn('Failed to initialize Firestore service:', error);
        // Continue with uninitialized service - ensureInitialized will retry later
      }
    }
  }
  return firestoreServiceInstance;
} 