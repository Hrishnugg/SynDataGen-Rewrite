import React from 'react';
/**
 * Firebase Service Module
 * 
 * Provides Firebase service initialization and access functions
 * for both production and test environments.
 */

import * as admin from 'firebase-admin';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from '@/lib/utils/logger';
import { validateFirebaseCredentials } from '@/lib/gcp/serviceAccount';

// Type definition for Auth
interface Auth {
  // Add properties and methods as needed
}

// Track if Firebase has been initialized
let isInitialized = false;

// Check if we're using mocks
const useMocks = process.env.USE_FIREBASE_MOCKS === 'true';

// Check if we're in a test environment
const isTest = process.env.NODE_ENV === 'test' || 
              process.env.FIREBASE_AUTH_EMULATOR_HOST || 
              process.env.FIRESTORE_EMULATOR_HOST;

// Track if Firestore settings have been applied
let firestoreSettingsApplied = false;
// Track initialization call stack
let initCallCount = 0;

/**
 * Get service account key from environment or secret manager
 * @returns Service account key JSON string or null if not found
 */
async function getServiceAccountKey(): Promise<string | null> {
  // Try to get from environment variables first
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return process.env.FIREBASE_SERVICE_ACCOUNT;
  }
  
  if (process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_PRIVATE_KEY) {
    // Construct service account JSON from environment variables
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    
    return JSON.stringify(serviceAccount);
  }
  
  // If environment variables are not set, return null
  logger.error('Firebase service account not found in environment variables');
  return null;
}

/**
 * Check if Firebase credentials are available
 * @returns True if Firebase credentials are available, false otherwise
 */
export function areFirebaseCredentialsAvailable(): boolean {
  // Check if credentials are available from environment variables
  if (process.env.FIREBASE_SERVICE_ACCOUNT || 
      (process.env.FIREBASE_PROJECT_ID && 
       process.env.FIREBASE_CLIENT_EMAIL && 
       process.env.FIREBASE_PRIVATE_KEY)) {
    return true;
  }
  
  return false;
}

/**
 * Initialize Firebase
 * 
 * This function initializes Firebase if it hasn't been initialized yet.
 * It will try to use environment variables for credentials if available.
 * 
 * @returns True if initialized successfully
 */
export const initializeFirebase = async (): Promise<boolean> => {
  const traceId = Math.random().toString(36).substring(2, 8);
  const startTime = Date.now();
  
  if (isInitialized) {
    logger.debug(`[FIREBASE-INIT-${traceId}] Firebase already initialized, returning immediately (${Date.now() - startTime}ms)`);
    return true;
  }
  
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      logger.debug(`[FIREBASE-INIT-${traceId}] Firebase already has ${admin.apps.length} apps initialized, setting isInitialized = true`);
      isInitialized = true;
      return true;
    }
    
    // Try to use environment variables for credentials
    logger.debug(`[FIREBASE-INIT-${traceId}] Starting Firebase initialization (apps: ${admin.apps.length})`);
    
    try {
      // First try to use application default credentials
      logger.debug(`[FIREBASE-INIT-${traceId}] Trying application default credentials`);
      
      const adcStartTime = Date.now();
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      
      isInitialized = true;
      logger.debug(`[FIREBASE-INIT-${traceId}] Firebase initialized with application default credentials in ${Date.now() - adcStartTime}ms, apps: ${admin.apps.length}`);
      return true;
    } catch (adcError) {
      const errorMessage = adcError instanceof Error ? adcError.message : String(adcError);
      logger.debug(`[FIREBASE-INIT-${traceId}] Failed to initialize with application default credentials: ${errorMessage}`);
      
      // Get service account credentials from environment or secret manager
      logger.debug(`[FIREBASE-INIT-${traceId}] Attempting to get service account key`);
      const serviceAccountKeyJson = await getServiceAccountKey();
      
      if (!serviceAccountKeyJson) {
        logger.error(`[FIREBASE-INIT-${traceId}] No service account key found, initialization failed`);
        return false;
      }
      
      try {
        // Validate the service account credentials
        const credentials: Record<string, any> = JSON.parse(serviceAccountKeyJson);
        logger.debug(`[FIREBASE-INIT-${traceId}] Validating service account credentials`);
        const validationResult = validateFirebaseCredentials(credentials);
        
        if (!validationResult.valid) {
          logger.error(`[FIREBASE-INIT-${traceId}] Invalid service account credentials: ${validationResult.error}`);
          return false;
        }
        
        // Initialize Firebase with the service account credentials
        logger.debug(`[FIREBASE-INIT-${traceId}] Initializing Firebase with service account credentials`);
        const saStartTime = Date.now();
        admin.initializeApp({
          credential: admin.credential.cert(credentials as admin.ServiceAccount)
        });
        
        isInitialized = true;
        logger.debug(`[FIREBASE-INIT-${traceId}] Firebase initialized with service account credentials in ${Date.now() - saStartTime}ms, apps: ${admin.apps.length}`);
        return true;
      } catch (saError) {
        logger.error(`[FIREBASE-INIT-${traceId}] Failed to initialize Firebase with service account:`, saError instanceof Error ? saError.message : String(saError));
        return false;
      }
    }
  } catch (error) {
    logger.error(`[FIREBASE-INIT-${traceId}] Failed to initialize Firebase:`, error instanceof Error ? error.message : String(error));
    return false;
  } finally {
    logger.debug(`[FIREBASE-INIT-${traceId}] Firebase initialization function completed in ${Date.now() - startTime}ms, isInitialized: ${isInitialized}, apps: ${admin.apps.length}`);
  }
};

/**
 * Get Firebase Auth instance
 * @returns Initialized Firebase Auth instance
 */
export const getFirebaseAuth = (): admin.auth.Auth => {
  if (!isInitialized) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  
  return admin.auth();
};

/**
 * Initialize Firebase Admin SDK
 * Similar to initializeFirebase but with a different name for backward compatibility
 */
export const initializeFirebaseAdmin = async (): Promise<boolean> => {
  return initializeFirebase();
};

/**
 * Get Firestore instance
 * @returns Initialized Firestore instance
 */
export const getFirebaseFirestore = async (): Promise<Firestore> => {
  initCallCount++;
  const callId = initCallCount;
  const traceId = Math.random().toString(36).substring(2, 8);
  
  // Use a flag to determine if we should log the call stack (only for first few calls)
  const shouldLogStack = callId <= 3;
  if (shouldLogStack) {
    logger.debug(`[FIREBASE-TRACE-${traceId}] getFirebaseFirestore called (call #${callId}). Call stack: ${new Error().stack}`);
  } else {
    logger.debug(`[FIREBASE-TRACE-${traceId}] getFirebaseFirestore called (call #${callId})`);
  }
  
  // Initialize Firebase if not already done
  if (!isInitialized) {
    try {
      logger.debug(`[FIREBASE-TRACE-${traceId}] Firebase not initialized, initializing now (call #${callId})`);
      const startTime = Date.now();
      await initializeFirebase();
      logger.debug(`[FIREBASE-TRACE-${traceId}] Firebase initialization completed in ${Date.now() - startTime}ms (call #${callId})`);
    } catch (error) {
      logger.error(`[FIREBASE-TRACE-${traceId}] Failed to initialize Firebase in getFirebaseFirestore (call #${callId}):`, error);
      throw new Error('Firebase initialization failed. Cannot get Firestore instance.');
    }
  }
  
  try {
    // Get the Firestore instance
    logger.debug(`[FIREBASE-TRACE-${traceId}] Getting Firestore instance (call #${callId}), isInitialized: ${isInitialized}, apps: ${admin.apps.length}, settingsApplied: ${firestoreSettingsApplied}`);
    const firestoreInstance = getAdminFirestore();
    
    // Track if we're applying settings to help diagnose issues
    let settingsApplied = false;
    
    // Only apply settings when we're initializing Firebase for the first time 
    // This ensures we don't try to apply settings to an already initialized Firestore
    if (admin.apps.length > 0 && !firestoreSettingsApplied) {
      logger.debug(`[FIREBASE-TRACE-${traceId}] Applying Firestore settings (call #${callId})`);
      try {
        const startTime = Date.now();
        firestoreInstance.settings({
          ignoreUndefinedProperties: true,
        });
        firestoreSettingsApplied = true;
        settingsApplied = true;
        logger.debug(`[FIREBASE-TRACE-${traceId}] Successfully applied Firestore settings in ${Date.now() - startTime}ms (call #${callId})`);
      } catch (settingsError) {
        // If settings have already been applied, just log and continue
        const errorMessage = settingsError instanceof Error ? settingsError.message : String(settingsError);
        logger.warn(`[FIREBASE-TRACE-${traceId}] Error applying Firestore settings (call #${callId}): ${errorMessage}`);
        firestoreSettingsApplied = true; // Mark as applied to prevent future attempts
      }
    } else {
      logger.debug(`[FIREBASE-TRACE-${traceId}] Skipping settings application (call #${callId}), apps: ${admin.apps.length}, settingsApplied: ${firestoreSettingsApplied}`);
    }
    
    // Verify that the instance has the required methods
    if (typeof firestoreInstance.collection !== 'function' || 
        typeof firestoreInstance.doc !== 'function') {
      logger.error(`[FIREBASE-TRACE-${traceId}] Invalid Firestore instance: missing required methods (call #${callId})`);
      throw new Error('Invalid Firestore instance: missing required methods');
    }
    
    logger.debug(`[FIREBASE-TRACE-${traceId}] Returning valid Firestore instance (call #${callId}), settingsApplied: ${settingsApplied}`);
    return firestoreInstance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[FIREBASE-TRACE-${traceId}] Error getting Firestore instance (call #${callId}): ${errorMessage}`);
    throw error;
  }
};

/**
 * Verify a Firebase ID token
 * @param idToken Firebase ID token to verify
 * @returns Decoded token payload
 */
export const verifyFirebaseToken = async (idToken: string): Promise<admin.auth.DecodedIdToken> => {
  await initializeFirebase();
  const auth = getFirebaseAuth();
  
  try {
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw error;
  }
};

/**
 * Create a custom Firebase token for a user
 * @param uid User ID
 * @returns Custom token
 */
export const createFirebaseToken = async (uid: string): Promise<string> => {
  await initializeFirebase();
  const auth = getFirebaseAuth();
  
  try {
    return await auth.createCustomToken(uid);
  } catch (error) {
    console.error('Error creating Firebase token:', error);
    throw error;
  }
};

/**
 * Get user by email
 * @param email Email to look up
 * @returns User record
 */
export const getUserByEmail = async (email: string): Promise<admin.auth.UserRecord> => {
  await initializeFirebase();
  const auth = getFirebaseAuth();
  
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    console.error(`Error getting user by email ${email}:`, error);
    throw error;
  }
};

// Export Firebase services with safety checks
export function getFirebaseStorage() {
  if (!isInitialized && !initializeFirebase()) {
    logger.warn('Attempting to use Storage but Firebase is not initialized');
  }
  return getStorage();
}

// For diagnostic purposes
export function getFirebaseInitStatus() {
  return {
    initialized: isInitialized,
    appCount: admin.apps.length,
    error: null
  };
}

// For diagnostic purposes
export { getAdminFirestore as getFirestore, getStorage };