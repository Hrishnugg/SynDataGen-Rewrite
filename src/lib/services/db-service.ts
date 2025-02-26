/**
 * Database Service Selector
 *
 * This module provides access to the Firestore database service.
 * Previously, this supported both MongoDB and Firestore during the migration,
 * but now it only supports Firestore as the migration is complete.
 */

import { getFirestoreService } from './firestore-service';

/**
 * Feature flag for GCP features - should always be true now
 */
export const isGcpEnabled = true;

// Define collections
const COLLECTIONS = [
  'customers',
  'waitlist',
  'projects',
  'dataGenerationJobs'
];

// Backend configuration map - all set to 'firestore' now
const collectionBackendMap: Record<string, 'firestore'> = {};

// Initialize all collections to use Firestore
COLLECTIONS.forEach(collection => {
  collectionBackendMap[collection] = 'firestore';
});

/**
 * Get the database backend for a specific collection
 * @param collectionName The name of the collection
 * @returns Always returns 'firestore' as MongoDB support has been removed
 */
export function getBackendForCollection(collectionName: string): 'firestore' {
  return 'firestore';
}

/**
 * Check if Firestore should be used for a collection
 * @param collectionName The name of the collection
 * @returns Always returns true as Firestore is the only supported database
 */
export function shouldUseFirestore(collectionName: string): boolean {
  return true;
}

/**
 * Check if MongoDB should be used for a collection
 * @param collectionName The name of the collection
 * @returns Always returns false as MongoDB support has been removed
 */
export function shouldUseMongoDB(collectionName: string): boolean {
  return false;
}

/**
 * Get the Firestore service instance
 */
export function getFirestore() {
  return getFirestoreService();
}

/**
 * Get the current backend configuration for all collections
 * @returns Record mapping collection names to 'firestore'
 */
export function getBackendConfiguration(): Record<string, 'firestore'> {
  return { ...collectionBackendMap };
}

/**
 * These functions are maintained for backward compatibility with existing code,
 * but they no longer change the backend as only Firestore is supported.
 */

export function setGlobalBackend(backend: 'firestore'): void {
  if (backend !== 'firestore') {
    console.warn('Attempted to set non-Firestore backend. This is no longer supported.');
  }
}

export function setCollectionBackend(
  collectionName: string, 
  backend: 'firestore'
): void {
  if (backend !== 'firestore') {
    console.warn(`Attempted to set non-Firestore backend for ${collectionName}. This is no longer supported.`);
  }
} 