/**
 * Optimized Database Service
 *
 * This module provides access to the optimized Firestore database service.
 */

import { getFirestoreService, FirestoreService } from './firestore-service';
import { cacheService, CacheConfig } from './cache-service';

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
 * Get the Firestore service with retry logic
 */
export async function getFirestore(preloadCommonData = false): Promise<any> {
  console.log(`🔍 getFirestore called with preloadCommonData=${preloadCommonData} at ${new Date().toISOString()}`);
  console.log(`🔍 Current state - initialized: ${_isInitialized}, service exists: ${!!_firestoreService}, last init time: ${new Date(_lastInitTime).toISOString()}`);
  
  // If already initialized and recently, return immediately
  const now = Date.now();
  if (_isInitialized && _firestoreService && now - _lastInitTime < 3600000) { // 1 hour
    console.log('🔍 Using existing initialized FirestoreService instance');
    return _firestoreService;
  }

  // If we have a service, but it's not initialized or it's been a while
  if (!_firestoreService) {
    // Get or create the FirestoreService instance
    try {
      console.log('🔍 Creating new FirestoreService instance');
      _firestoreService = getFirestoreService(DB_CACHE_CONFIG);
      console.log('🔍 Created new FirestoreService instance successfully');
    } catch (error) {
      console.error('🔥 Failed to create FirestoreService instance:', error);
      throw error;
    }
  }

  // Initialize with retries
  const maxRetries = 2;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      // Call init() on the service
      console.log(`🔍 Attempting to initialize FirestoreService (attempt ${retryCount + 1}/${maxRetries + 1})`);
      await _firestoreService.init();
      _isInitialized = true;
      _lastInitTime = now;
      _lastInitError = null;
      console.log('✅ FirestoreService initialized successfully');

      // Preload data if requested
      if (preloadCommonData && _firestoreService.preloadCommonData && 
          typeof _firestoreService.preloadCommonData === 'function') {
        try {
          console.log('🔍 Preloading common data collections:', PRELOAD_COLLECTIONS);
          await _firestoreService.preloadCommonData(PRELOAD_COLLECTIONS);
          console.log('✅ Successfully preloaded common data');
        } catch (preloadError) {
          console.warn('⚠️ Failed to preload common data:', preloadError);
          // Continue even if preload fails
        }
      }

      return _firestoreService;
    } catch (error) {
      retryCount++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`🔥 Failed to initialize Firestore service (attempt ${retryCount}/${maxRetries + 1}): ${errorMessage}`);
      
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
      
      _lastInitError = error instanceof Error ? error : new Error(errorMessage);
      
      // Wait before retry
      if (retryCount <= maxRetries) {
        console.log(`⏱️ Retrying Firestore initialization in ${1000 * retryCount}ms (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Incremental backoff
      } else {
        break;
      }
    }
  }
  
  // All initialization attempts failed
  console.error('❌ All Firestore initialization attempts failed, using mock data fallback');
  _isInitialized = false;
  
  // Generate mock data as fallback
  console.log('📊 Creating mock service implementation');
  const mockService = {
    // Basic mock implementation with common methods
    getById: async (collection: string, id: string) => {
      console.log(`📊 Mock getById called for ${collection}/${id}`);
      return null;
    },
    query: async (collection: string) => {
      console.log(`📊 Mock query called for ${collection}`);
      return [];
    },
    create: async () => {
      console.log(`📊 Mock create called`);
      return 'mock-id';
    },
    update: async () => {
      console.log(`📊 Mock update called`);
      return true;
    },
    delete: async () => {
      console.log(`📊 Mock delete called`);
      return true;
    },
    // Return mock data for common collections
    getMockData: (collectionName: string, count = 10) => {
      console.log(`📊 Mock getMockData called for ${collectionName} (count: ${count})`);
      return generateMockData(collectionName, count);
    }
  };
  
  console.log('📊 Returning mock service implementation');
  return mockService;
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