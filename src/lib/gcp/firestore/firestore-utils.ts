/**
 * Firestore Utilities
 * 
 * This module provides utilities for working with Firestore, extracted from
 * the initFirestore.ts file for better code organization.
 */

import { getFirebaseInitStatus } from '@/lib/firebase';

/**
 * ServiceAccountCredentials interface for Firebase
 */
export interface ServiceAccountCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  type?: string;
  privateKeyId?: string;
  clientId?: string;
  authUri?: string;
  tokenUri?: string;
  authProviderX509CertUrl?: string;
  clientX509CertUrl?: string;
}

/**
 * Get Firestore initialization status
 * Useful for diagnostics
 */
export function getFirestoreStatus(): string {
  const firebaseStatus = getFirebaseInitStatus();
  
  if (firebaseStatus.error) {
    return 'error';
  }
  
  if (!firebaseStatus.initialized) {
    return 'not_initialized';
  }
  
  return 'connected';
}

/**
 * Validate Firebase credentials and return diagnostics information
 * about missing credentials
 */
export function validateFirebaseCredentials(credentials?: ServiceAccountCredentials): boolean {
  if (!credentials) {
    return false;
  }
  
  // Check for essential fields in the credentials
  const hasProjectId = !!credentials.projectId;
  const hasClientEmail = !!credentials.clientEmail;
  const hasPrivateKey = !!credentials.privateKey;
  
  // All required fields must be present
  return hasProjectId && hasClientEmail && hasPrivateKey;
}
