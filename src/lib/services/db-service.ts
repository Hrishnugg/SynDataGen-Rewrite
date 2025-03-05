/**
 * Optimized Database Service
 *
 * This module provides access to the optimized Firestore database service.
 */

import { getFirestoreService, FirestoreService } from './firestore-service';
import { cacheService, CacheConfig } from './cache-service';
import { getFirebaseInitStatus } from '@/lib/firebase';

// Collections to preload for better performance
const PRELOAD_COLLECTIONS = [
  'customers',
  'projects'
];

// Default cache configuration
const DB_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  defaultTtlSeconds: 300, // 5 minutes
  maxEntries: 1000,
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  logCacheHits: process.env.NODE_ENV === 'development',
  preloadCollections: PRELOAD_COLLECTIONS
};

// Parameters for database cache configuration
export const DEFAULT_CACHE_CONFIG = {
  enabled: true,
  defaultTtlSeconds: 60, // 1 minute default TTL
  maxEntries: 1000,      // Store up to 1000 entries
  maxSizeBytes: 50 * 1024 * 1024, // 50MB maximum cache size
};

// Track Firestore service state
let _firestoreService: FirestoreService | null = null;
let _isInitialized = false;
let _lastInitTime = 0;
let _lastInitError: Error | null = null;

/**
 * Get the database backend for a specific collection
 * @returns Always returns 'firestore' as MongoDB support has been removed
 */
export function getBackendForCollection(): 'firestore' {
  return 'firestore';
}

/**
 * Get the Firestore service with retry logic and comprehensive error handling
 */
export async function getFirestore(preloadCommonData = false): Promise<any> {
  // Check if already initialized
  if (_isInitialized && _firestoreService) {
    return _firestoreService;
  }

  // Check for Firebase initialization status first
  const firebaseStatus = getFirebaseInitStatus();
  if (!firebaseStatus.initialized && firebaseStatus.error) {
    console.warn(`Firebase initialization issue detected: ${firebaseStatus.error.message}`);
  }
    
  try {
    // Get service with retry logic
    const currentTime = Date.now();
    const timeSinceLastInit = currentTime - _lastInitTime;
    
    // Implement backoff if there was a recent error
    if (_lastInitError && timeSinceLastInit < 5000) {
      console.warn(`Throttling Firestore initialization after recent error (${timeSinceLastInit}ms ago): ${_lastInitError.message}`);
      
      // Check if we're in a development environment where we can use mock data
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.info('Using mock data in development environment due to Firestore initialization issues');
        // Return mock service for development
        return getMockFirestoreService();
      }
      
      // In production, still attempt to retry after throttle
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    _lastInitTime = currentTime;
    _lastInitError = null;
    
    // Initialize or retrieve Firestore service
    _firestoreService = await getFirestoreService(DB_CACHE_CONFIG);
    
    // Preload common collections if requested
    if (preloadCommonData && _firestoreService) {
      await preloadCommonData();
    }
    
    _isInitialized = true;
    return _firestoreService;
  } catch (error: any) {
    _lastInitError = error;
    
    console.error(`Failed to initialize Firestore service: ${error.message}`, error);
    
    // Check if we're in development or test
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.warn('Using mock data service in development due to Firestore error');
      return getMockFirestoreService();
    } else {
      // In production, report but still throw the error
      throw error;
    }
  }
}

/**
 * Get a mock Firestore service for development or when real service fails
 */
function getMockFirestoreService(): FirestoreService {
  console.info('Using mock Firestore service with generated data');
  
  return {
    init: async () => true,
    getById: async (collection: string, id: string) => {
      return generateMockData(collection, 1)[0];
    },
    query: async (collection: string) => {
      return generateMockData(collection, 10);
    },
    queryWithPagination: async (collection: string) => {
      const items = generateMockData(collection, 10);
      return { items, lastDoc: null, hasMore: false };
    },
    create: async () => 'mock-id',
    createWithId: async () => true,
    update: async () => true,
    delete: async () => true,
    runTransaction: async (fn: any) => fn({}),
    createBatch: () => ({}),
    clearCache: () => {},
    preloadCommonData: async () => {}
  } as unknown as FirestoreService;
}

/**
 * Generates mock data for testing when Firestore fails
 */
function generateMockData(collectionName: string, count: number) {
  console.log(`Generating ${count} mock ${collectionName} for user ${getCurrentUserId() || 'unknown'} with status active`);
  
  // Simple mock data generator by collection
  switch (collectionName) {
    case 'projects':
      return Array.from({length: count}, (_, i) => ({
        id: `mock-project-${i}`,
        name: `Mock Project ${i}`,
        description: 'This is a mock project created when Firestore was unavailable',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    case 'customers':
      return Array.from({length: count}, (_, i) => ({
        id: `mock-customer-${i}`,
        name: `Mock Customer ${i}`,
        email: `mock${i}@example.com`,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    default:
      return [];
  }
}

/**
 * Get the current user ID for mock data
 */
function getCurrentUserId(): string | null {
  try {
    // Mock user ID - in a real implementation this would get the ID from auth
    return 'c3f2473913b51c8078f1b213dd0e824b';
  } catch (error) {
    return null;
  }
}

/**
 * Preload common data into cache for faster access
 * Can be called during app initialization to improve performance
 */
export async function preloadCommonData(): Promise<void> {
  const service = await getFirestore(false);
  await service.preloadCommonData(PRELOAD_COLLECTIONS);
}

/**
 * Clear all database caches
 * Useful during testing or when data changes significantly
 */
export function clearDatabaseCache(): void {
  cacheService.clear();
}

/**
 * Invalidate cache for a specific collection
 * Call this when you know data in a collection has changed externally
 */
export function invalidateCollectionCache(collectionName: string): void {
  cacheService.invalidateCollection(collectionName);
}

/**
 * Get cache statistics
 */
export function getDatabaseCacheStats() {
  return cacheService.getStats();
}

// The following functions are maintained for backward compatibility only
export function shouldUseFirestore(): boolean {
  return true;
}

export function shouldUseMongoDB(): boolean {
  return false;
}

export function getBackendConfiguration(): Record<string, 'firestore'> {
  return {
    customers: 'firestore',
    waitlist: 'firestore',
    projects: 'firestore',
    dataGenerationJobs: 'firestore'
  };
}

export function setGlobalBackend(): void {
  console.warn('setGlobalBackend is deprecated - only Firestore is supported');
}

export function setCollectionBackend(): void {
  console.warn('setCollectionBackend is deprecated - only Firestore is supported');
} 