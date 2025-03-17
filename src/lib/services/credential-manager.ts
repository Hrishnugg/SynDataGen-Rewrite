/**
 * Credential Manager Bridge Module
 * 
 * This module serves as a bridge that re-exports functionality from the credential manager service
 * implementation while aligning with the new directory structure.
 */

// Re-export all exports from the original credential manager service implementation
export * from '@/lib/api/services/credential-manager';
