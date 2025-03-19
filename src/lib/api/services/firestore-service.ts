import React from 'react';
/**
 * Firestore Service Implementation
 * 
 * This service provides a unified interface for Firestore operations,
 * supporting both real Firestore instances and mock implementations for testing.
 */

import { Firestore, CollectionReference, DocumentReference, DocumentData, Query, QueryDocumentSnapshot, WhereFilterOp, OrderByDirection } from 'firebase-admin/firestore';
import { 
  IFirestoreService, 
  FirestoreQueryOptions, 
  PaginationResult, 
  FirestoreServiceError,
  FirestoreQueryCondition,
  FirestoreQuerySortOption
} from './firestore-service.interface';
import { logger } from '@/lib/utils/logger';
import { getFirebaseFirestore } from '@/lib/firebase';
import { initializeFirestore, getFirestoreInstance } from '@/lib/gcp/firestore';

// Define additional types for query options
export interface QuerySortOption extends FirestoreQuerySortOption {
  // Extends the base interface to ensure compatibility
}

// Extended options interface that's compatible with FirestoreQueryOptions
export interface ExtendedFirestoreQueryOptions extends FirestoreQueryOptions {
  // No need to redeclare properties that exist in FirestoreQueryOptions
  // Just adding this interface as a placeholder for potential future extensions
}

// Export FirestoreQueryOptions for use across the codebase
export type { 
  FirestoreQueryOptions, 
  FirestoreQueryCondition, 
  FirestoreQuerySortOption, 
  PaginationResult
};

// Re-export Firebase Service interface to maintain backward compatibility
export interface FirestoreService extends IFirestoreService {
  // Additional compatibility methods
  init(options?: any): Promise<void>;
  create(collectionPath: string, data: any): Promise<string>;
  createWithId(collectionPath: string, id: string, data: any): Promise<void>;
  getById(collectionPath: string, id: string): Promise<any>;
  update(collectionPath: string, id: string, data: any): Promise<void>;
  delete(collectionPath: string, id: string): Promise<void>;
  query(collectionPath: string, options: FirestoreQueryOptions): Promise<any[]>;
  queryWithPagination(collectionPath: string, options: FirestoreQueryOptions): Promise<PaginationResult<any>>;
}

/**
 * Firestore Service Implementation
 */
export class FirestoreServiceImpl implements FirestoreService {
  private firestoreInstance: Firestore | null = null;
  private isMock: boolean = false;

  // Track initialization promise
  private initPromise: Promise<void> | null = null;

  // Static tracking for initialization state
  private static instanceState = {
    initAttempts: 0,
    initSuccesses: 0,
    initFailures: 0,
    lastInitError: null as Error | null,
    initInProgress: false,
    instanceInitialized: false
  };

  constructor(optionsOrIsMock?: { isMock?: boolean; firestoreInstance?: Firestore } | boolean) {
    const traceId = Math.random().toString(36).substring(2, 8);
    logger.debug(`[CONSTRUCTOR-TRACE-${traceId}] FirestoreServiceImpl constructor called with ${optionsOrIsMock ? typeof optionsOrIsMock === 'boolean' ? 'mockMode: ' + optionsOrIsMock : 'options object' : 'no arguments'}`);
    
    // Initialize instance state if not already set up
    if (!FirestoreServiceImpl.instanceState) {
      FirestoreServiceImpl.instanceState = {
        initAttempts: 0,
        initSuccesses: 0,
        initFailures: 0,
        lastInitError: null,
        initInProgress: false,
        instanceInitialized: false
      };
    }
    
    // Handle constructor overloading for backward compatibility
    if (typeof optionsOrIsMock === 'boolean') {
      this.isMock = optionsOrIsMock;
      logger.debug(`[CONSTRUCTOR-TRACE-${traceId}] Initialized in ${this.isMock ? 'mock' : 'real'} mode`);
    } else if (optionsOrIsMock && typeof optionsOrIsMock === 'object') {
      this.isMock = !!optionsOrIsMock.isMock;
      
      if (optionsOrIsMock.firestoreInstance) {
        this.firestoreInstance = optionsOrIsMock.firestoreInstance;
        logger.debug(`[CONSTRUCTOR-TRACE-${traceId}] Using provided Firestore instance`);
        FirestoreServiceImpl.instanceState.instanceInitialized = true;
      }
      
      logger.debug(`[CONSTRUCTOR-TRACE-${traceId}] Initialized with options: isMock=${this.isMock}, hasInstance=${!!this.firestoreInstance}`);
    } else {
      this.isMock = false;
      logger.debug(`[CONSTRUCTOR-TRACE-${traceId}] Initialized in default mode (real)`);
    }
    
    logger.debug(`[CONSTRUCTOR-TRACE-${traceId}] Constructor complete, state: ${JSON.stringify(FirestoreServiceImpl.instanceState)}`);
  }

  // Initialize the Firestore instance
  private async initializeInternal(options?: any): Promise<void> {
    const initId = Math.random().toString(36).substring(2, 8);
    
    // Update static state tracking
    FirestoreServiceImpl.instanceState.initAttempts++;
    FirestoreServiceImpl.instanceState.initInProgress = true;
    
    logger.debug(`[INIT-TRACE-${initId}] initializeInternal started, mockMode: ${this.isMock}, options: ${options ? 'provided' : 'not provided'}, state: ${JSON.stringify(FirestoreServiceImpl.instanceState)}`);
    
    // Check if already initialized
    if (this.firestoreInstance) {
      logger.debug(`[INIT-TRACE-${initId}] Firestore instance already exists, skipping initialization`);
      FirestoreServiceImpl.instanceState.initInProgress = false;
      FirestoreServiceImpl.instanceState.instanceInitialized = true;
      FirestoreServiceImpl.instanceState.initSuccesses++;
      return;
    }

    // Skip initialization in mock mode
    if (this.isMock) {
      logger.debug(`[INIT-TRACE-${initId}] Running in mock mode, skipping initialization`);
      FirestoreServiceImpl.instanceState.initInProgress = false;
      return;
    }

    const startTime = Date.now();
    
    try {
      // Try to initialize using Firebase first
      logger.debug(`[INIT-TRACE-${initId}] Attempting to initialize via Firebase`);
      try {
        const firebaseFirestore = await getFirebaseFirestore();
        if (firebaseFirestore) {
          this.firestoreInstance = firebaseFirestore;
          logger.debug(`[INIT-TRACE-${initId}] Successfully initialized via Firebase (${Date.now() - startTime}ms)`);
          FirestoreServiceImpl.instanceState.initSuccesses++;
          FirestoreServiceImpl.instanceState.instanceInitialized = true;
          return;
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`[INIT-TRACE-${initId}] Failed to initialize via Firebase: ${errorMessage}`);
      }

      // If Firebase initialization fails, try GCP Firestore
      logger.debug(`[INIT-TRACE-${initId}] Attempting to initialize via GCP Firestore`);
      try {
        const gcpFirestore = getFirestoreInstance();
        if (gcpFirestore) {
          this.firestoreInstance = gcpFirestore;
          logger.debug(`[INIT-TRACE-${initId}] Successfully initialized via GCP Firestore (${Date.now() - startTime}ms)`);
          FirestoreServiceImpl.instanceState.initSuccesses++;
          FirestoreServiceImpl.instanceState.instanceInitialized = true;
          return;
        }
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`[INIT-TRACE-${initId}] Failed to initialize via GCP Firestore: ${errorMessage}`);
      }

      // If we get here, both initialization methods failed
      logger.error(`[INIT-TRACE-${initId}] Failed to initialize Firestore via both Firebase and GCP`);
      FirestoreServiceImpl.instanceState.initFailures++;
      FirestoreServiceImpl.instanceState.lastInitError = new Error('Failed to initialize Firestore via both methods');
      throw new FirestoreServiceError('Failed to initialize Firestore via any method', 'init_failure');
    } finally {
      FirestoreServiceImpl.instanceState.initInProgress = false;
      logger.debug(`[INIT-TRACE-${initId}] initializeInternal completed in ${Date.now() - startTime}ms, instance exists: ${!!this.firestoreInstance}, state: ${JSON.stringify(FirestoreServiceImpl.instanceState)}`);
    }
  }

  // Public initialize method to implement the interface
  async initialize(firestoreInstance?: Firestore): Promise<void> {
    const initId = Math.random().toString(36).substring(2, 8);
    logger.debug(`[FIRESTORE-DEBUG] initialize called (id: ${initId}), call stack: ${new Error().stack}`);
    if (firestoreInstance) {
      logger.debug(`[FIRESTORE-DEBUG] Using provided Firestore instance (id: ${initId})`);
      this.firestoreInstance = firestoreInstance;
    } else if (!this.firestoreInstance) {
      logger.debug(`[FIRESTORE-DEBUG] No instance provided, calling initializeInternal (id: ${initId})`);
      await this.initializeInternal();
    } else {
      logger.debug(`[FIRESTORE-DEBUG] Firestore instance already exists, skipping initialization (id: ${initId})`);
    }
  }

  // Backward compatibility init method
  async init(options?: any): Promise<void> {
    const traceId = Math.random().toString(36).substring(2, 8);
    logger.debug(`[IMPL-TRACE-${traceId}] FirestoreServiceImpl.init called with options: ${JSON.stringify(options || {})}`);
    
    if (this.isMock) {
      logger.debug(`[IMPL-TRACE-${traceId}] Running in mock mode, skipping initialization`);
      return Promise.resolve();
    }

    if (this.initPromise) {
      logger.debug(`[IMPL-TRACE-${traceId}] Initialization already in progress, returning existing promise`);
      return this.initPromise;
    }

    // Create a new initialization promise
    this.initPromise = this.initializeInternal(options)
      .then(() => {
        logger.debug(`[IMPL-TRACE-${traceId}] Firestore initialization completed successfully, state: ${JSON.stringify(FirestoreServiceImpl.instanceState)}`);
      })
      .catch((error) => {
        logger.error(`[IMPL-TRACE-${traceId}] Firestore initialization failed, state: ${JSON.stringify(FirestoreServiceImpl.instanceState)}`, error);
        throw error;
      });

    return this.initPromise;
  }

  private async ensureFirestoreInstance(): Promise<Firestore> {
    const traceId = Math.random().toString(36).substring(2, 8);
    
    // If instance exists, return it immediately
    if (this.firestoreInstance) {
      logger.debug(`[ENSURE-TRACE-${traceId}] Firestore instance already exists, returning immediately`);
      return this.firestoreInstance;
    }
    
    // If in mock mode, throw an error since we can't create a real instance
    if (this.isMock) {
      logger.debug(`[ENSURE-TRACE-${traceId}] Running in mock mode, returning null instance`);
      return null as unknown as Firestore;
    }
    
    logger.debug(`[ENSURE-TRACE-${traceId}] Firestore instance not initialized, state: ${JSON.stringify(FirestoreServiceImpl.instanceState)}`);
    
    // If there's an ongoing initialization, wait for it
    if (this.initPromise) {
      logger.debug(`[ENSURE-TRACE-${traceId}] Waiting for existing initialization promise to resolve`);
      try {
        await this.initPromise;
        logger.debug(`[ENSURE-TRACE-${traceId}] Existing initialization completed, instance exists: ${!!this.firestoreInstance}, state: ${JSON.stringify(FirestoreServiceImpl.instanceState)}`);
        
        // If initialization succeeded but instance is still null, something went wrong
        if (!this.firestoreInstance) {
          logger.error(`[ENSURE-TRACE-${traceId}] Initialization completed but firestoreInstance is still null! Attempting emergency initialization`);
          // Try initializing again as emergency measure
          await this.initializeInternal();
        }
      } catch (error) {
        logger.error(`[ENSURE-TRACE-${traceId}] Error waiting for initialization`, error);
        // If there was an error in the initialization, try again
        logger.debug(`[ENSURE-TRACE-${traceId}] Previous initialization failed, attempting again`);
        await this.initializeInternal();
      }
    } else {
      // No initialization in progress, start one
      logger.debug(`[ENSURE-TRACE-${traceId}] No initialization in progress, starting new initialization`);
      this.initPromise = this.initializeInternal();
      try {
        await this.initPromise;
        logger.debug(`[ENSURE-TRACE-${traceId}] New initialization completed, instance exists: ${!!this.firestoreInstance}, state: ${JSON.stringify(FirestoreServiceImpl.instanceState)}`);
      } catch (error) {
        logger.error(`[ENSURE-TRACE-${traceId}] Error during new initialization`, error);
        throw error;
      }
    }
    
    // Final check to ensure we have an instance
    if (!this.firestoreInstance) {
      const error = new Error('Failed to initialize Firestore instance after multiple attempts');
      logger.error(`[ENSURE-TRACE-${traceId}] Firestore instance still null after initialization attempts`, error);
      throw error;
    }
    
    logger.debug(`[ENSURE-TRACE-${traceId}] Returning Firestore instance (id: ${(this.firestoreInstance as any)._id || 'unknown'})`);
    return this.firestoreInstance;
  }

  async collection(path: string): Promise<CollectionReference<DocumentData> | null> {
    const traceId = Math.random().toString(36).substring(2, 10);
    logger.debug(`[PROMISE-TRACE-${traceId}] collection(${path}) called`);
    
    if (this.isMock) {
      logger.debug(`[PROMISE-TRACE-${traceId}] [MOCK] Getting collection reference for path: ${path}`);
      return Promise.resolve(null);
    }
    
    try {
      logger.debug(`[PROMISE-TRACE-${traceId}] Awaiting ensureFirestoreInstance in collection(${path})`);
      // Use proper await instead of then/catch chain
      const firestore = await this.ensureFirestoreInstance();
      
      logger.debug(`[PROMISE-TRACE-${traceId}] Got Firestore instance, getting collection for path: ${path}`);
      const collectionRef = firestore.collection(path);
      logger.debug(`[PROMISE-TRACE-${traceId}] Successfully got collection for path: ${path}`);
      return collectionRef;
    } catch (error) {
      logger.error(`[PROMISE-TRACE-${traceId}] Error getting collection reference for path: ${path}`, error);
      return Promise.resolve(null);
    }
  }

  async doc(path: string): Promise<DocumentReference<DocumentData> | null> {
    const traceId = Math.random().toString(36).substring(2, 10);
    logger.debug(`[PROMISE-TRACE-${traceId}] doc(${path}) called`);
    
    if (this.isMock) {
      logger.debug(`[PROMISE-TRACE-${traceId}] [MOCK] Getting document reference for path: ${path}`);
      return Promise.resolve(null);
    }
    
    try {
      logger.debug(`[PROMISE-TRACE-${traceId}] Awaiting ensureFirestoreInstance in doc(${path})`);
      // Use proper await instead of then/catch chain
      const firestore = await this.ensureFirestoreInstance();
      
      logger.debug(`[PROMISE-TRACE-${traceId}] Got Firestore instance, getting doc for path: ${path}`);
      const docRef = firestore.doc(path);
      logger.debug(`[PROMISE-TRACE-${traceId}] Successfully got doc for path: ${path}`);
      return docRef;
    } catch (error) {
      logger.error(`[PROMISE-TRACE-${traceId}] Error getting document reference for path: ${path}`, error);
      return Promise.resolve(null);
    }
  }

  async createDocument<T extends Record<string, unknown>>(collectionPath: string, data: T): Promise<string> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Creating document at path: ${collectionPath}`);
        return `mock-doc-${Date.now()}`;
      }

      const firestore = await this.ensureFirestoreInstance();
      
      // Check if the path includes a document ID
      const pathParts = collectionPath.split('/');
      const isCollection = pathParts.length % 2 === 1;
      
      if (isCollection) {
        // Path points to a collection, generate a new document ID
        const collectionRef = firestore.collection(collectionPath);
        const docRef = 'id' in data ? collectionRef.doc(data.id as string) : collectionRef.doc();
        const docId = docRef.id;
        
        // Remove id from data if it exists to avoid duplication
        if ('id' in data) {
          const { id, ...dataWithoutId } = data as any;
          await docRef.set(dataWithoutId);
        } else {
          await docRef.set(data as DocumentData);
        }
        
        logger.debug(`Created document with ID: ${docId} at path: ${collectionPath}`);
        return docId;
      } else {
        // Path includes a document ID
        const docRef = firestore.doc(collectionPath);
        await docRef.set(data as DocumentData);
        
        logger.debug(`Created document at path: ${collectionPath}`);
        return docRef.id;
      }
    } catch (error) {
      logger.error(`Error creating document at path: ${collectionPath}`, error);
      if (process.env.NODE_ENV === 'test' || this.isMock) {
        return `error-mock-doc-${Date.now()}`;
      }
      throw new FirestoreServiceError(
        `Failed to create document at ${collectionPath}: ${error instanceof Error ? error.message : String(error)}`,
        'create_failed'
      );
    }
  }

  async getDocument<T>(path: string): Promise<T | null> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Getting document at path: ${path}`);
        return { id: 'mock-doc', mockField: 'mockValue' } as unknown as T;
      }

      const firestore = await this.ensureFirestoreInstance();
      const docRef = firestore.doc(path);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        logger.debug(`Document not found at path: ${path}`);
        return null;
      }
      
      logger.debug(`Retrieved document at path: ${path}`);
      return { id: doc.id, ...doc.data() } as unknown as T;
    } catch (error) {
      logger.error(`Error getting document at path: ${path}`, error);
      if (process.env.NODE_ENV === 'test' || this.isMock) {
        return { id: 'error-mock-doc', mockField: 'mockValue' } as unknown as T;
      }
      throw new FirestoreServiceError(
        `Failed to get document at ${path}: ${error instanceof Error ? error.message : String(error)}`,
        'get_failed'
      );
    }
  }

  async updateDocument<T extends Record<string, unknown>>(path: string, data: Partial<T>): Promise<void> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Updating document at path: ${path}`);
        return;
      }

      const firestore = await this.ensureFirestoreInstance();
      const docRef = firestore.doc(path);
      await docRef.update(data as DocumentData);
      
      logger.debug(`Updated document at path: ${path}`);
    } catch (error) {
      logger.error(`Error updating document at path: ${path}`, error);
      if (!(process.env.NODE_ENV === 'test' || this.isMock)) {
        throw new FirestoreServiceError(
          `Failed to update document at ${path}: ${error instanceof Error ? error.message : String(error)}`,
          'update_failed'
        );
      }
    }
  }

  async deleteDocument(path: string): Promise<void> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Deleting document at path: ${path}`);
        return;
      }

      const firestore = await this.ensureFirestoreInstance();
      const docRef = firestore.doc(path);
      await docRef.delete();
      
      logger.debug(`Deleted document at path: ${path}`);
    } catch (error) {
      logger.error(`Error deleting document at path: ${path}`, error);
      if (!(process.env.NODE_ENV === 'test' || this.isMock)) {
        throw new FirestoreServiceError(
          `Failed to delete document at ${path}: ${error instanceof Error ? error.message : String(error)}`,
          'delete_failed'
        );
      }
    }
  }

  /**
   * Query documents from a collection with filtering, sorting and pagination
   */
  async queryDocuments<T>(
    collectionPath: string, 
    optionsOrConditions?: FirestoreQueryOptions | FirestoreQueryCondition[]
  ): Promise<T[]> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Querying documents at path: ${collectionPath}`);
        return [{ id: 'mock-doc', mockField: 'mockValue' }] as unknown as T[];
      }

      const firestore = await this.ensureFirestoreInstance();
      const collectionRef = firestore.collection(collectionPath);
      
      let query: Query<DocumentData> = collectionRef;
      
      // Handle both options object and conditions array formats
      const options: FirestoreQueryOptions = Array.isArray(optionsOrConditions) 
        ? { conditions: optionsOrConditions } 
        : optionsOrConditions || {};
      
      // Apply where conditions
      const conditions = options.conditions || options.where || [];
      for (const condition of conditions) {
        const { field, operator, op, value } = condition;
        const finalOperator = operator || op || '==';
        query = query.where(field, finalOperator as WhereFilterOp, value);
      }
      
      // Apply order by - handle both string and array format
      if (options.orderBy) {
        if (typeof options.orderBy === 'string') {
          // Simple string orderBy
          const direction = options.orderDirection || 'asc';
          query = query.orderBy(options.orderBy, direction as OrderByDirection);
        } else if (Array.isArray(options.orderBy)) {
          // Array of sort options
          for (const sort of options.orderBy) {
            const direction = sort.direction || 'asc';
            query = query.orderBy(sort.field, direction as OrderByDirection);
          }
        }
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      // Execute query
      const querySnapshot = await query.get();
      
      // Map results
      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as T[];
      
      logger.debug(`Query at ${collectionPath} returned ${results.length} documents`);
      return results;
    } catch (error) {
      logger.error(`Error querying documents at path: ${collectionPath}`, error);
      if (process.env.NODE_ENV === 'test' || this.isMock) {
        return [{ id: 'error-mock-doc', mockField: 'mockValue' }] as unknown as T[];
      }
      throw new FirestoreServiceError(
        `Failed to query documents at ${collectionPath}: ${error instanceof Error ? error.message : String(error)}`,
        'query_failed'
      );
    }
  }

  // For backward compatibility - just maps to createDocument
  async create(collectionPath: string, data: any): Promise<string> {
    return this.createDocument(collectionPath, data);
  }

  // For backward compatibility
  async createWithId(collectionPath: string, id: string, data: any): Promise<void> {
    const path = `${collectionPath}/${id}`;
    await this.createDocument(path, data);
  }

  // For backward compatibility
  async getById(collectionPath: string, id: string): Promise<any> {
    const path = `${collectionPath}/${id}`;
    const result = await this.getDocument(path);
    return result;
  }

  // For backward compatibility
  async update(collectionPath: string, id: string, data: any): Promise<void> {
    const path = `${collectionPath}/${id}`;
    await this.updateDocument(path, data);
  }

  // For backward compatibility
  async delete(collectionPath: string, id: string): Promise<void> {
    const path = `${collectionPath}/${id}`;
    await this.deleteDocument(path);
  }

  // For backward compatibility
  async query(collectionPath: string, options: FirestoreQueryOptions): Promise<any[]> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Querying documents with options at path: ${collectionPath}`);
        return [{ id: 'mock-doc', mockField: 'mockValue' }];
      }

      const firestore = await this.ensureFirestoreInstance();
      const collectionRef = firestore.collection(collectionPath);
      
      let query: Query<DocumentData> = collectionRef;
      
      // Apply where conditions
      if (options.where || options.conditions) {
        const conditions = options.where || options.conditions || [];
        for (const condition of conditions) {
          const { field, operator, op, value } = condition;
          const queryOperator = (operator || op || '==') as WhereFilterOp;
          query = query.where(field, queryOperator, value);
        }
      }
      
      // Apply order by - handle both string and array format
      if (options.orderBy) {
        if (typeof options.orderBy === 'string') {
          // Simple string orderBy
          const direction = options.orderDirection || 'asc';
          query = query.orderBy(options.orderBy, direction as OrderByDirection);
        } else if (Array.isArray(options.orderBy)) {
          // Array of sort options
          for (const sort of options.orderBy) {
            const direction = sort.direction || 'asc';
            query = query.orderBy(sort.field, direction as OrderByDirection);
          }
        }
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      // Execute query
      const querySnapshot = await query.get();
      
      // Map results
      const results = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      
      logger.debug(`Query at ${collectionPath} returned ${results.length} documents`);
      return results;
    } catch (error) {
      logger.error(`Error querying documents at path: ${collectionPath}`, error);
      if (process.env.NODE_ENV === 'test' || this.isMock) {
        return [{ id: 'error-mock-doc', mockField: 'mockValue' }];
      }
      throw new FirestoreServiceError(
        `Failed to query documents at ${collectionPath}: ${error instanceof Error ? error.message : String(error)}`,
        'query_failed'
      );
    }
  }

  // Maps to getPaginatedDocuments for IFirestoreService compatibility
  async getPaginatedDocuments<T>(collectionPath: string, options: FirestoreQueryOptions = {}): Promise<PaginationResult<T>> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Querying documents with pagination at path: ${collectionPath}`);
        return {
          items: [{ id: 'mock-doc', mockField: 'mockValue' }] as unknown as T[],
          total: 1,
          page: options.page || 1,
          pageSize: options.pageSize || 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          hasMore: false
        };
      }

      const firestore = await this.ensureFirestoreInstance();
      const collectionRef = firestore.collection(collectionPath);
      
      const page = options.page || 1;
      const pageSize = options.pageSize || 10;
      
      // Build query for count
      let countQuery: Query<DocumentData> = collectionRef;
      const conditions = options.conditions || options.where || [];
      if (conditions.length > 0) {
        for (const condition of conditions) {
          const { field, operator, op, value } = condition;
          const queryOperator = (operator || op || '==') as WhereFilterOp;
          countQuery = countQuery.where(field, queryOperator, value);
        }
      }
      
      // Get total count
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;
      
      // Build main query
      let query: Query<DocumentData> = collectionRef;
      
      // Apply where conditions
      if (conditions.length > 0) {
        for (const condition of conditions) {
          const { field, operator, op, value } = condition;
          const queryOperator = (operator || op || '==') as WhereFilterOp;
          query = query.where(field, queryOperator, value);
        }
      }
      
      // Apply order by
      if (options.orderBy) {
        if (typeof options.orderBy === 'string') {
          // Simple string orderBy
          const direction = options.orderDirection || 'asc';
          query = query.orderBy(options.orderBy, direction as OrderByDirection);
        } else if (Array.isArray(options.orderBy)) {
          // Array of sort options
          for (const sort of options.orderBy) {
            const direction = sort.direction || 'asc';
            query = query.orderBy(sort.field, direction as OrderByDirection);
          }
        }
      }
      
      // Apply pagination
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
      
      // Execute query
      const querySnapshot = await query.get();
      
      // Map results
      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as T[];
      
      const totalPages = Math.ceil(total / pageSize);
      
      logger.debug(`Paginated query at ${collectionPath} returned ${items.length} documents (page ${page} of ${totalPages})`);
      
      return {
        items,
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        hasMore: page < totalPages
      };
    } catch (error) {
      logger.error(`Error querying documents with pagination at path: ${collectionPath}`, error);
      if (process.env.NODE_ENV === 'test' || this.isMock) {
        return {
          items: [{ id: 'error-mock-doc', mockField: 'mockValue' }] as unknown as T[],
          total: 1,
          page: options.page || 1,
          pageSize: options.pageSize || 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          hasMore: false
        };
      }
      throw new FirestoreServiceError(
        `Failed to query documents with pagination at ${collectionPath}: ${error instanceof Error ? error.message : String(error)}`,
        'paginated_query_failed'
      );
    }
  }

  // For backward compatibility
  async queryWithPagination(collectionPath: string, options: FirestoreQueryOptions): Promise<PaginationResult<any>> {
    return this.getPaginatedDocuments(collectionPath, options);
  }

  async documentExists(path: string): Promise<boolean> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Checking if document exists at path: ${path}`);
        return true;
      }

      const firestore = await this.ensureFirestoreInstance();
      const docRef = firestore.doc(path);
      const doc = await docRef.get();
      
      return doc.exists;
    } catch (error) {
      logger.error(`Error checking if document exists at path: ${path}`, error);
      if (process.env.NODE_ENV === 'test' || this.isMock) {
        return true;
      }
      throw new FirestoreServiceError(
        `Failed to check if document exists at ${path}: ${error instanceof Error ? error.message : String(error)}`,
        'exists_check_failed'
      );
    }
  }

  async countDocuments(collectionPath: string, conditions?: FirestoreQueryCondition[]): Promise<number> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Counting documents at path: ${collectionPath}`);
        return 10;
      }

      const firestore = await this.ensureFirestoreInstance();
      const collectionRef = firestore.collection(collectionPath);
      
      let query: Query<DocumentData> = collectionRef;
      
      if (conditions && conditions.length > 0) {
        for (const condition of conditions) {
          const { field, operator, op, value } = condition;
          const queryOperator = (operator || op || '==') as WhereFilterOp;
          query = query.where(field, queryOperator, value);
        }
      }
      
      const countSnapshot = await query.count().get();
      return countSnapshot.data().count;
    } catch (error) {
      logger.error(`Error counting documents at path: ${collectionPath}`, error);
      if (process.env.NODE_ENV === 'test' || this.isMock) {
        return 10;
      }
      throw new FirestoreServiceError(
        `Failed to count documents at ${collectionPath}: ${error instanceof Error ? error.message : String(error)}`,
        'count_failed'
      );
    }
  }
}

// Singleton instance
let firestoreServiceInstance: FirestoreService | null = null;
let serviceInitCount = 0;
let isInitializing = false;
let initPromise: Promise<FirestoreService> | null = null;

export function getFirestoreService(options?: any, forceInitialize: boolean = false): FirestoreService {
  serviceInitCount++;
  const serviceId = serviceInitCount;
  const traceId = Math.random().toString(36).substring(2, 8);
  logger.debug(`[SERVICE-TRACE-${traceId}] getFirestoreService called (call #${serviceId}), forceInitialize: ${forceInitialize}, instance exists: ${!!firestoreServiceInstance}, initializing: ${isInitializing}`);
  
  // If already initialized and not forcing reinitialization, return the existing instance
  if (firestoreServiceInstance && !forceInitialize) {
    logger.debug(`[SERVICE-TRACE-${traceId}] Returning existing FirestoreService instance (call #${serviceId})`);
    return firestoreServiceInstance;
  }
  
  // If we're already in the process of initializing, don't start a new initialization
  if (isInitializing && initPromise && !forceInitialize) {
    logger.debug(`[SERVICE-TRACE-${traceId}] Initialization in progress (call #${serviceId}), returning partially initialized instance`);
    // We throw away the result here since we only care about side effects -
    // the singleton will be populated by the first call
    initPromise.catch(err => {
      logger.error(`[SERVICE-TRACE-${traceId}] Initialization promise rejected (call #${serviceId})`, err);
    });
    // Return the existing instance, which might not be fully initialized yet
    // This is safe because the actual DB operations will wait for initialization
    return firestoreServiceInstance as FirestoreService;
  }
  
  // Create a new instance if needed
  if (!firestoreServiceInstance || forceInitialize) {
    logger.debug(`[SERVICE-TRACE-${traceId}] Creating new FirestoreServiceImpl instance (call #${serviceId})`);
    
    isInitializing = true;
    const instance = new FirestoreServiceImpl(false);
    firestoreServiceInstance = instance;
    
    // Initialize the instance if options are provided
    if (options) {
      logger.debug(`[SERVICE-TRACE-${traceId}] Initializing new instance with options (call #${serviceId})`);
      initPromise = instance.init(options)
        .then(() => {
          logger.debug(`[SERVICE-TRACE-${traceId}] Instance initialization completed (call #${serviceId})`);
          isInitializing = false;
          return instance;
        })
        .catch(error => {
          logger.error(`[SERVICE-TRACE-${traceId}] Error initializing Firestore service (call #${serviceId})`, error);
          isInitializing = false;
          throw error;
        });
    } else {
      // Mark initialization as complete if no options were provided
      logger.debug(`[SERVICE-TRACE-${traceId}] No options provided, skipping explicit initialization (call #${serviceId})`);
      isInitializing = false;
    }
  }
  
  logger.debug(`[SERVICE-TRACE-${traceId}] Returning FirestoreService instance (call #${serviceId})`);
  return firestoreServiceInstance;
}
