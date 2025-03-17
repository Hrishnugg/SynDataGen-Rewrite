/**
 * Path Utility
 * 
 * This module provides centralized path references for importing modules consistently
 * across the application. This follows the Single Responsibility Principle by
 * isolating the path resolution logic in one place.
 */

// Define individual path constants for direct usage in import statements
// API routes paths (relative to src/app/api/*)
export const PROJECT_SERVICE_PATH = '../../../../features/projects/services/projectService';
export const PROJECT_TYPES_PATH = '../../../../features/projects/types';
export const STORAGE_PATH = '../../../../lib/gcp/storage';
export const FIRESTORE_PATH = '../../../../lib/gcp/firestore';
export const DB_SERVICE_PATH = '../../../../lib/api/services/db-service';

/**
 * Gets an import path relative to the src/app/api directory
 * This can be used in API route handlers for consistent imports
 */
export function getApiImportPath(path: string): string {
  return path;
}
