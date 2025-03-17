/**
 * API Services
 * 
 * This barrel file re-exports all service-related functionality to provide 
 * a clean and unified interface for importing services across the application.
 */

// Database services
export { 
  getFirestore,
  getDatabaseCacheStats
} from './db-service';

export { getFirestoreService } from './firestore-service';
export type { FirestoreService, FirestoreQueryOptions, PaginationResult } from './firestore-service';

// Project services
export * from './projectService';

// Cache services - renaming DEFAULT_CACHE_CONFIG to avoid collision
export { 
  cacheService, 
  DEFAULT_CACHE_CONFIG as DEFAULT_CACHE_SETTINGS 
} from './cache-service';
export type { CacheConfig } from './cache-service';

// Other services
export * from './audit-logs';
export * from './credential-manager';
export * from './security';
export * from './service-accounts';
