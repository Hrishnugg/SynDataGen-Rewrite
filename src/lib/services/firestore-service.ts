/**
 * Firestore Data Service
 * 
 * This service provides a standardized interface for Firestore operations
 * with caching, error handling, and transaction support.
 */

import { getFirestoreInstance } from '../gcp/firestore/initFirestore';
import { 
  DocumentReference, 
  CollectionReference, 
  Query, 
  DocumentData, 
  Firestore,
  Transaction,
  WriteBatch,
  QueryDocumentSnapshot
} from 'firebase-admin/firestore';
import { timeOperation } from '@/lib/monitoring/firestore-metrics';

// Cache configuration
interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
}

// Cache entry with expiry time
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Default cache configuration
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttlSeconds: 60 // 1 minute default TTL
};

// Cache interface
class FirestoreCache {
  private cache: Map<string, CacheEntry<any>>;
  private config: CacheConfig;

  constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.cache = new Map();
    this.config = config;
  }

  /**
   * Get an item from cache
   * @param key Cache key
   * @returns Cached data or null if expired/not found
   */
  get<T>(key: string): T | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store an item in cache
   * @param key Cache key
   * @param data Data to cache
   */
  set<T>(key: string, data: T): void {
    if (!this.config.enabled) return;

    const expiresAt = Date.now() + (this.config.ttlSeconds * 1000);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Remove an item from cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries that match a pattern
   * @param pattern Pattern to match
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Firestore Data Service Class
 */
export class FirestoreService {
  private db: Firestore;
  private cache: FirestoreCache;
  private initialized: boolean = false;

  constructor(cacheConfig: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.cache = new FirestoreCache(cacheConfig);
    this.db = null as unknown as Firestore; // Will be initialized in init()
  }

  /**
   * Initialize the Firestore service
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.db = getFirestoreInstance();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Firestore service:', error);
      throw new Error('Firestore initialization failed');
    }
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * Get a document by ID
   * @param collectionPath Collection path
   * @param id Document ID
   * @param enableCache Whether to use cache
   * @returns Document data or null if not found
   */
  async getById<T>(
    collectionPath: string, 
    id: string, 
    enableCache: boolean = true
  ): Promise<T | null> {
    await this.ensureInitialized();

    const cacheKey = `${collectionPath}:${id}`;
    
    // Check cache first if enabled
    if (enableCache) {
      const cachedData = this.cache.get<T>(cacheKey);
      if (cachedData) return cachedData;
    }

    return await timeOperation('read', collectionPath, async () => {
      try {
        const docRef = this.db.collection(collectionPath).doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          return null;
        }

        const data = { id: doc.id, ...doc.data() } as unknown as T;
        
        // Cache the result if caching is enabled
        if (enableCache) {
          this.cache.set(cacheKey, data);
        }

        return data;
      } catch (error) {
        console.error(`Error fetching document ${id} from ${collectionPath}:`, error);
        throw new Error(`Failed to fetch document: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Query documents
   * @param collectionPath Collection path
   * @param queryBuilder Function to build the query
   * @param enableCache Whether to use cache
   * @returns Array of document data
   */
  async query<T>(
    collectionPath: string,
    queryBuilder: (query: CollectionReference) => Query,
    enableCache: boolean = true
  ): Promise<T[]> {
    await this.ensureInitialized();

    return await timeOperation('query', collectionPath, async () => {
      try {
        const collectionRef = this.db.collection(collectionPath);
        const query = queryBuilder(collectionRef);
        
        // Generate a cache key based on the query
        const cacheKey = `query:${collectionPath}:${query.toString()}`;
        
        // Check cache first if enabled
        if (enableCache) {
          const cachedData = this.cache.get<T[]>(cacheKey);
          if (cachedData) return cachedData;
        }

        const snapshot = await query.get();
        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as unknown as T[];

        // Cache the results if caching is enabled
        if (enableCache) {
          this.cache.set(cacheKey, results);
        }

        return results;
      } catch (error) {
        console.error(`Error querying collection ${collectionPath}:`, error);
        throw new Error(`Failed to query documents: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Create a new document
   * @param collectionPath Collection path
   * @param data Document data (without ID)
   * @returns Created document ID
   */
  async create<T extends Record<string, any>>(
    collectionPath: string,
    data: Omit<T, 'id'>
  ): Promise<string> {
    await this.ensureInitialized();

    return await timeOperation('write', collectionPath, async () => {
      try {
        const collectionRef = this.db.collection(collectionPath);
        
        // Add timestamps if not present
        const dataToSave = {
          ...data,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date()
        };
        
        const docRef = await collectionRef.add(dataToSave);
        
        // Invalidate any cache entries for this collection
        this.cache.invalidatePattern(`^query:${collectionPath}`);
        
        return docRef.id;
      } catch (error) {
        console.error(`Error creating document in ${collectionPath}:`, error);
        throw new Error(`Failed to create document: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Create a document with a specific ID
   * @param collectionPath Collection path
   * @param id Document ID
   * @param data Document data
   * @returns True if successful
   */
  async createWithId<T extends Record<string, any>>(
    collectionPath: string,
    id: string,
    data: Omit<T, 'id'>
  ): Promise<boolean> {
    await this.ensureInitialized();

    return await timeOperation('write', collectionPath, async () => {
      try {
        const docRef = this.db.collection(collectionPath).doc(id);
        
        // Add timestamps if not present
        const dataToSave = {
          ...data,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date()
        };
        
        await docRef.set(dataToSave);
        
        // Invalidate cache
        this.cache.delete(`${collectionPath}:${id}`);
        this.cache.invalidatePattern(`^query:${collectionPath}`);
        
        return true;
      } catch (error) {
        console.error(`Error creating document with ID ${id} in ${collectionPath}:`, error);
        throw new Error(`Failed to create document: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Update a document
   * @param collectionPath Collection path
   * @param id Document ID
   * @param data Document data to update
   * @returns True if successful
   */
  async update<T extends Record<string, any>>(
    collectionPath: string,
    id: string,
    data: Partial<T>
  ): Promise<boolean> {
    await this.ensureInitialized();

    return await timeOperation('write', collectionPath, async () => {
      try {
        const docRef = this.db.collection(collectionPath).doc(id);
        
        // Always update the updatedAt timestamp
        const dataToUpdate = {
          ...data,
          updatedAt: new Date()
        };
        
        await docRef.update(dataToUpdate);
        
        // Invalidate cache
        this.cache.delete(`${collectionPath}:${id}`);
        this.cache.invalidatePattern(`^query:${collectionPath}`);
        
        return true;
      } catch (error) {
        console.error(`Error updating document ${id} in ${collectionPath}:`, error);
        throw new Error(`Failed to update document: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Delete a document
   * @param collectionPath Collection path
   * @param id Document ID
   * @returns True if successful
   */
  async delete(
    collectionPath: string,
    id: string
  ): Promise<boolean> {
    await this.ensureInitialized();

    return await timeOperation('delete', collectionPath, async () => {
      try {
        const docRef = this.db.collection(collectionPath).doc(id);
        await docRef.delete();
        
        // Invalidate cache
        this.cache.delete(`${collectionPath}:${id}`);
        this.cache.invalidatePattern(`^query:${collectionPath}`);
        
        return true;
      } catch (error) {
        console.error(`Error deleting document ${id} from ${collectionPath}:`, error);
        throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Run a transaction
   * @param updateFunction Function to execute in the transaction
   * @returns Result of the transaction
   */
  async runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    await this.ensureInitialized();

    try {
      return await this.db.runTransaction(updateFunction);
    } catch (error) {
      console.error('Transaction failed:', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a batch operation
   * @returns Firestore WriteBatch
   */
  createBatch(): WriteBatch {
    if (!this.initialized) {
      throw new Error('Firestore service not initialized');
    }
    return this.db.batch();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
let firestoreServiceInstance: FirestoreService | null = null;

/**
 * Get the Firestore service instance (singleton)
 * @param cacheConfig Optional cache configuration
 * @returns FirestoreService instance
 */
export function getFirestoreService(cacheConfig?: CacheConfig): FirestoreService {
  if (!firestoreServiceInstance) {
    firestoreServiceInstance = new FirestoreService(cacheConfig);
  }
  return firestoreServiceInstance;
} 