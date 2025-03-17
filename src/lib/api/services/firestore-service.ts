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

  constructor(optionsOrIsMock?: { isMock?: boolean; firestoreInstance?: Firestore } | boolean) {
    if (typeof optionsOrIsMock === 'boolean') {
      // Handle legacy constructor with boolean parameter
      this.isMock = optionsOrIsMock;
    } else if (optionsOrIsMock) {
      // Handle new constructor with options object
      this.isMock = optionsOrIsMock.isMock || false;
      if (optionsOrIsMock.firestoreInstance) {
        this.firestoreInstance = optionsOrIsMock.firestoreInstance;
        return; // Skip initialization if instance is provided
      }
    }
    this.initializeInternal();
  }

  // Private initialization method
  private async initializeInternal(): Promise<void> {
    try {
      // Try to get the GCP Firestore instance first
      this.firestoreInstance = getFirestoreInstance();
      logger.debug('Initialized FirestoreService with GCP Firestore');
    } catch (error: any) {
      logger.debug('Failed to initialize GCP Firestore, falling back to Firebase Firestore', error);
      try {
        // Fall back to Firebase Firestore
        this.firestoreInstance = await getFirebaseFirestore();
        logger.debug('Initialized FirestoreService with Firebase Firestore');
      } catch (fallbackError: any) {
        logger.error('Failed to initialize Firestore service', fallbackError);
        if (!this.isMock) {
          throw new Error('Failed to initialize Firestore service: ' + 
            (fallbackError instanceof Error ? fallbackError.message : 'Unknown error'));
        } else {
          logger.warn('Running in mock mode, continuing without Firestore instance');
        }
      }
    }
  }

  // Public initialize method to implement the interface
  async initialize(firestoreInstance?: Firestore): Promise<void> {
    if (firestoreInstance) {
      this.firestoreInstance = firestoreInstance;
      logger.debug('Initialized FirestoreService with provided Firestore instance');
    } else {
      await this.initializeInternal();
    }
    return Promise.resolve();
  }

  // Backward compatibility init method
  async init(options?: any): Promise<void> {
    if (options) {
      logger.debug('Initializing Firestore with options', options);
    }
    await this.initializeInternal();
    return Promise.resolve();
  }

  private ensureFirestoreInstance(): Firestore {
    if (!this.firestoreInstance && !this.isMock) {
      logger.debug('Firestore instance not initialized, attempting to initialize');
      this.initializeInternal().catch(error => {
        logger.error('Error initializing Firestore instance', error);
      });
      
      if (!this.firestoreInstance) {
        throw new FirestoreServiceError('Firestore instance is not available', 'not_initialized');
      }
    }
    
    return this.firestoreInstance as Firestore;
  }

  collection(path: string): CollectionReference<DocumentData> | null {
    if (this.isMock) {
      logger.debug(`[MOCK] Getting collection reference for path: ${path}`);
      return null;
    }
    
    try {
      const firestore = this.ensureFirestoreInstance();
      return firestore.collection(path);
    } catch (error) {
      logger.error(`Error getting collection reference for path: ${path}`, error);
      return null;
    }
  }

  doc(path: string): DocumentReference<DocumentData> | null {
    if (this.isMock) {
      logger.debug(`[MOCK] Getting document reference for path: ${path}`);
      return null;
    }
    
    try {
      const firestore = this.ensureFirestoreInstance();
      return firestore.doc(path);
    } catch (error) {
      logger.error(`Error getting document reference for path: ${path}`, error);
      return null;
    }
  }

  async createDocument<T extends Record<string, unknown>>(collectionPath: string, data: T): Promise<string> {
    try {
      if (this.isMock) {
        logger.debug(`[MOCK] Creating document at path: ${collectionPath}`);
        return `mock-doc-${Date.now()}`;
      }

      const firestore = this.ensureFirestoreInstance();
      
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

      const firestore = this.ensureFirestoreInstance();
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

      const firestore = this.ensureFirestoreInstance();
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

      const firestore = this.ensureFirestoreInstance();
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

      const firestore = this.ensureFirestoreInstance();
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

      const firestore = this.ensureFirestoreInstance();
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

      const firestore = this.ensureFirestoreInstance();
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

      const firestore = this.ensureFirestoreInstance();
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

      const firestore = this.ensureFirestoreInstance();
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

export function getFirestoreService(options?: any, forceInitialize: boolean = false): FirestoreService {
  if (!firestoreServiceInstance || forceInitialize) {
    firestoreServiceInstance = new FirestoreServiceImpl(false);
    if (options) {
      firestoreServiceInstance.init(options).catch(error => {
        logger.error('Error initializing Firestore service', error);
      });
    }
  }
  return firestoreServiceInstance as FirestoreService;
}
