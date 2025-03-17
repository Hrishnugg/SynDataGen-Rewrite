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
export async function getFirestore(preloadData = false): Promise<FirestoreService> {
  // Check if already initialized
  if (_isInitialized && _firestoreService) {
    return _firestoreService;
  }

  // DIAGNOSTIC: Explicitly log environment variables to help debug
  console.log('[DB-SERVICE] Environment variables check:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- MOCK_FIREBASE:', process.env.MOCK_FIREBASE);
  console.log('- FORCE_REAL_FIRESTORE:', process.env.FORCE_REAL_FIRESTORE);
  console.log('- USE_MOCK_DATA:', process.env.USE_MOCK_DATA);
  console.log('- GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || '[NOT SET]');
  console.log('- Has FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
  console.log('- Has FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
  console.log('- Has FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY);

  // NEW: If GOOGLE_APPLICATION_CREDENTIALS is not set, but we have a fixed service account file, set it
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.FORCE_REAL_FIRESTORE === 'true') {
    const fs = require('fs');
    const path = require('path');
    const credentialsPath = path.join(process.cwd(), 'credentials', 'firebase-service-account.json');
    
    if (fs.existsSync(credentialsPath)) {
      console.log(`[DB-SERVICE] Setting GOOGLE_APPLICATION_CREDENTIALS to: ${credentialsPath}`);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    } else {
      console.warn(`[DB-SERVICE] Cannot find credentials file at: ${credentialsPath}`);
    }
  }

  // Check for Firebase initialization status first
  const firebaseStatus = getFirebaseInitStatus();
  if (!firebaseStatus.initialized && firebaseStatus.error) {
    console.warn(`Firebase initialization issue detected: ${
      typeof firebaseStatus.error === 'object' && firebaseStatus.error !== null
        ? (firebaseStatus.error as Error).message || 'Unknown error'
        : String(firebaseStatus.error)
    }`);
  }
    
  try {
    // Get service with retry logic
    const currentTime = Date.now();
    const timeSinceLastInit = currentTime - _lastInitTime;
    
    // Check if we should enforce using real Firestore
    const forceRealFirestore = process.env.FORCE_REAL_FIRESTORE === 'true';
    
    // Define the shouldUseMockData variable properly before using it
    const shouldUseMockData = 
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && 
      (process.env.MOCK_FIREBASE === 'true' || process.env.USE_MOCK_DATA === 'true' || 
       process.env.USE_FIREBASE_MOCKS === 'true') && 
      !forceRealFirestore;
    
    // Implement backoff if there was a recent error and we're not forcing real Firestore
    if (_lastInitError && timeSinceLastInit < 5000 && !forceRealFirestore) {
      console.warn(`Throttling Firestore initialization after recent error (${timeSinceLastInit}ms ago): ${_lastInitError.message}`);
      
      // Use mock data in development if we're not forcing real Firestore
      if (shouldUseMockData) {
        console.info('[DB-SERVICE] Using mock data in development environment due to Firestore initialization issues');
        // Return mock service for development
        _firestoreService = getFirestoreService(true);
        _isInitialized = true;
        return _firestoreService;
      }
      
      // In production or if we're forcing real Firestore, attempt to retry after throttle
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    _lastInitTime = currentTime;
    _lastInitError = null;
    
    try {
      // Create FirestoreService instance - use mock mode if needed
      if (shouldUseMockData) {
        console.info('[DB-SERVICE] Using mock FirestoreService instance');
        _firestoreService = getFirestoreService(true);
      } else {
        console.info('[DB-SERVICE] Using real FirestoreService instance');
        _firestoreService = getFirestoreService(false);
      }
      
      // No need to explicitly call initialize() as it's done in the constructor now
      
      // Preload common collections if requested
      if (preloadData) {
        try {
          await preloadCommonData();
        } catch (preloadError) {
          console.warn('Failed to preload common data:', preloadError);
          // Continue without preloaded data
        }
      }
      
      _isInitialized = true;
      return _firestoreService;
    } catch (firestoreError) {
      throw firestoreError;
    }
  } catch (error: any) {
    _lastInitError = error;
    
    console.error(`Failed to initialize Firestore service: ${error.message}`, error);
    
    // Define shouldUseMockData again here to avoid the reference error
    const shouldUseMockData = 
      (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && 
      (process.env.MOCK_FIREBASE === 'true' || process.env.USE_MOCK_DATA === 'true' || 
       process.env.USE_FIREBASE_MOCKS === 'true') && 
      process.env.FORCE_REAL_FIRESTORE !== 'true';
    
    // Check if we're in development or test and should use mock data
    if (shouldUseMockData) {
      console.warn('[DB-SERVICE] Using mock data service in development due to Firestore error');
      _firestoreService = getFirestoreService(true);
      _isInitialized = true;
      return _firestoreService;
    } else {
      // In production or if we're forcing real Firestore, throw the error
      throw error;
    }
  }
}

/**
 * Get a mock Firestore service for development or when real service fails
 * @deprecated Use getFirestoreService(true) instead
 */
function getMockFirestoreService(): FirestoreService {
  console.warn('getMockFirestoreService is deprecated, use getFirestoreService(true) instead');
  return getFirestoreService(true);
}

/**
 * Preload common data into cache for faster access
 * Can be called during app initialization to improve performance
 */
export async function preloadCommonData(): Promise<void> {
  const service = await getFirestore(false);
  // Updated to check if preloadCommonData exists before calling it
  if (typeof (service as any).preloadCommonData === 'function') {
    await (service as any).preloadCommonData(PRELOAD_COLLECTIONS);
  } else {
    console.warn('preloadCommonData is not available on the current FirestoreService instance');
  }
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

export function setGlobalBackend(backend: 'mongodb' | 'firestore' | 'both'): void {
  console.warn('setGlobalBackend is deprecated - only Firestore is supported');
}

export function setCollectionBackend(collection: string, backend: 'mongodb' | 'firestore' | 'both'): void {
  console.warn('setCollectionBackend is deprecated - only Firestore is supported');
} 