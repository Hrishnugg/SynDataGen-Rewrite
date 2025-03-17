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
  if (isInitialized) {
    logger.debug('Firebase already initialized');
    return true;
  }
  
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      logger.debug('Firebase already has apps initialized');
      isInitialized = true;
      return true;
    }
    
    // Try to use environment variables for credentials
    logger.debug('Initializing Firebase');
    
    try {
      // First try to use application default credentials
      logger.debug('Trying application default credentials');
      
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      
      isInitialized = true;
      logger.debug('Firebase initialized with application default credentials');
      return true;
    } catch (error) {
      logger.debug('Failed to initialize with application default credentials:', error as Record<string, any>);
      
      // Get service account credentials from environment or secret manager
      const serviceAccountKeyJson = await getServiceAccountKey();
      
      if (!serviceAccountKeyJson) {
        logger.error('No service account key found');
        return false;
      }
      
      try {
        // Validate the service account credentials
        const credentials: Record<string, any> = JSON.parse(serviceAccountKeyJson);
        const validationResult = validateFirebaseCredentials(credentials);
        
        if (!validationResult.valid) {
          logger.error(`Invalid service account credentials: ${validationResult.error}`);
          return false;
        }
        
        // Initialize Firebase with the service account credentials
        admin.initializeApp({
          credential: admin.credential.cert(credentials as admin.ServiceAccount)
        });
        
        isInitialized = true;
        logger.debug('Firebase initialized with service account credentials');
        return true;
      } catch (error) {
        logger.error('Failed to initialize Firebase with service account:', error);
        return false;
      }
    }
  } catch (error) {
    logger.error('Failed to initialize Firebase:', error);
    return false;
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
  // Initialize Firebase if not already done
  if (!isInitialized) {
    try {
      await initializeFirebase();
    } catch (error) {
      logger.error('Failed to initialize Firebase in getFirebaseFirestore:', error);
      throw new Error('Firebase initialization failed. Cannot get Firestore instance.');
    }
  }
  
  try {
    // Get the Firestore instance
    const firestoreInstance = getAdminFirestore();
    
    // Apply settings if needed
    firestoreInstance.settings({
      ignoreUndefinedProperties: true,
    });
    
    // Verify that the instance has the required methods
    if (typeof firestoreInstance.collection !== 'function' || 
        typeof firestoreInstance.doc !== 'function') {
      throw new Error('Invalid Firestore instance: missing required methods');
    }
    
    return firestoreInstance;
  } catch (error) {
    logger.error('Error getting Firestore instance:', error);
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