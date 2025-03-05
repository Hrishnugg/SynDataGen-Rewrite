import { initializeApp, getApps, cert, AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { logger } from './logger';

// Environment detection helpers
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isPreview = process.env.VERCEL_ENV === 'preview';
const isProduction = !isDevelopment && !isTest && !isPreview;

// Track Firebase initialization status
let firebaseInitialized = false;
let initializationError: Error | null = null;

/**
 * Check if Firebase credentials are available in any form
 */
export function areFirebaseCredentialsAvailable(): boolean {
  // Check for base64 encoded service account
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return true;
  }
  
  // Check for environment variable with path to service account file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const fs = require('fs');
      if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        return true;
      }
    } catch (error) {
      // File access error, but we'll just return false
    }
  }

  // Check for local service account file
  try {
    const fs = require('fs');
    const path = require('path');
    const localServiceAccountPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(localServiceAccountPath)) {
      return true;
    }
  } catch (error) {
    // File access error, but we'll just return false
  }

  // Fallback - credentials are not available
  return false;
}

/**
 * Get initialization status
 */
export function getFirebaseInitStatus() {
  return {
    initialized: firebaseInitialized,
    error: initializationError,
    environment: process.env.NODE_ENV,
    credentialsAvailable: areFirebaseCredentialsAvailable(),
    usingEmulator: isDevelopment && !areFirebaseCredentialsAvailable()
  };
}

/**
 * Safe initialization of Firebase Admin
 * Returns true if initialization was successful, false otherwise
 */
export function initializeFirebaseAdmin(): boolean {
  // Don't re-initialize if already done
  if (getApps().length) {
    return firebaseInitialized;
  }

  try {
    let appOptions: AppOptions = {};
    let initializationMethod = 'unknown';

    // Step 1: Try base64 encoded service account credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(
          Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
        );
        
        appOptions = {
          credential: cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID
        };
        
        initializationMethod = 'service-account-base64';
      } catch (parseError) {
        logger.error('Failed to parse base64 Firebase credentials:', parseError);
        // Continue to next method
      }
    } 
    // Step 2: Try Google Application Default Credentials path
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      appOptions = {
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        projectId: process.env.FIREBASE_PROJECT_ID
      };
      
      initializationMethod = 'application-default-credentials';
    } 
    // Step 3: Development fallback
    else if (isDevelopment) {
      appOptions = {
        projectId: process.env.FIREBASE_PROJECT_ID || 'syndata-dev',
      };
      
      initializationMethod = 'development-fallback';
    } 
    // No valid credentials found
    else {
      throw new Error(
        'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS'
      );
    }

    // Initialize the app
    initializeApp(appOptions);
    
    // Configure Firestore emulator if needed
    if (isDevelopment && initializationMethod === 'development-fallback') {
      const firestoreDb = getFirestore();
      firestoreDb.settings({
        host: process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080',
        ssl: false,
      });
      
      logger.info(`Initialized Firebase Admin with emulator settings for development (${initializationMethod})`);
    } else {
      logger.info(`Initialized Firebase Admin successfully using ${initializationMethod}`);
    }
    
    // Update status
    firebaseInitialized = true;
    return true;

  } catch (error) {
    initializationError = error instanceof Error ? error : new Error(String(error));
    logger.error('Error initializing Firebase Admin:', error);
    
    // Don't throw in development or test, but log the error
    if (isDevelopment || isTest) {
      logger.warn('Continuing without Firebase in development/test environment');
      return false;
    }
    
    // In preview, we might want to continue with limited functionality
    if (isPreview) {
      logger.warn('Continuing with limited functionality in preview environment');
      return false;
    }
    
    // In production, this is a critical error
    if (isProduction) {
      throw error; // Re-throw in production since Firebase is required
    }
    
    return false;
  }
}

// Attempt to initialize Firebase Admin if we have credentials
if (areFirebaseCredentialsAvailable()) {
  initializeFirebaseAdmin();
} else if (isDevelopment) {
  logger.warn('Firebase credentials not found. Some functionality will be limited.');
  logger.info('See FIREBASE-SETUP.md for setup instructions.');
}

// Export Firebase services with safety checks
export function getFirebaseFirestore() {
  if (!firebaseInitialized && !initializeFirebaseAdmin()) {
    logger.warn('Attempting to use Firestore but Firebase is not initialized');
    // You could throw an error here or return a mock implementation
  }
  return getFirestore();
}

export function getFirebaseAuth() {
  if (!firebaseInitialized && !initializeFirebaseAdmin()) {
    logger.warn('Attempting to use Auth but Firebase is not initialized');
  }
  return getAuth();
}

export function getFirebaseStorage() {
  if (!firebaseInitialized && !initializeFirebaseAdmin()) {
    logger.warn('Attempting to use Storage but Firebase is not initialized');
  }
  return getStorage();
}

// For diagnostic purposes
export { getFirestore, getAuth, getStorage }; 