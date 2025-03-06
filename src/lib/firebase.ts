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
    // Step 2: Try individual credential environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        logger.info('Found individual Firebase credential environment variables');
        logger.info('=== CREDENTIAL DIAGNOSTIC LOGS ===');
        logger.info('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
        logger.info('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
        
        // Handle escaped newlines in private key - log details about the key format
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        logger.info('Private key original length:', privateKey.length);
        logger.info('Private key contains \\n:', privateKey.includes('\\n'));
        logger.info('Private key contains actual newlines:', privateKey.includes('\n'));
        logger.info('Private key first 40 chars:', privateKey.substring(0, 40));
        logger.info('Private key last 40 chars:', privateKey.substring(privateKey.length - 40));
        
        // Remove quotes if present
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.slice(1, -1);
          logger.info('Removed surrounding quotes from private key');
        }
        
        // Process escaped newlines
        if (privateKey.includes('\\n')) {
          privateKey = privateKey.replace(/\\n/g, '\n');
          logger.info('Processed escaped newlines in private key');
        }
        
        // Verify key format after processing
        logger.info('Private key after processing:');
        logger.info('- Length:', privateKey.length);
        logger.info('- Contains actual newlines:', privateKey.includes('\n'));
        logger.info('- Starts with correct header:', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
        logger.info('- Ends with correct footer:', privateKey.endsWith('-----END PRIVATE KEY-----'));
        logger.info('=== END CREDENTIAL DIAGNOSTIC LOGS ===');
        
        // Create credentials object for Firebase
        const credentials = {
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        };
        
        try {
          appOptions = {
            credential: cert(credentials),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            projectId: process.env.FIREBASE_PROJECT_ID
          };
          
          logger.info('Successfully created Firebase credential certificate');
          initializationMethod = 'environment-variables';
        } catch (certError) {
          logger.error('Failed to create cert from credentials:', certError);
          throw certError;
        }
      } catch (error) {
        logger.error('Failed to initialize with environment variables:', error);
        // Continue to next method
      }
    }
    // Step 3: Try Google Application Default Credentials path
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      appOptions = {
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        projectId: process.env.FIREBASE_PROJECT_ID
      };
      
      initializationMethod = 'application-default-credentials';
    } 
    // Step 4: Development fallback
    else if (isDevelopment) {
      // For development, try to use project ID if available
      appOptions = {
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID || 'syndata-dev',
      };
      
      initializationMethod = 'development-fallback';
      logger.warn('Using development fallback with project ID:', appOptions.projectId);
    } 
    // No valid credentials found
    else {
      throw new Error(
        'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT, FIREBASE_PRIVATE_KEY+FIREBASE_CLIENT_EMAIL+FIREBASE_PROJECT_ID, or GOOGLE_APPLICATION_CREDENTIALS'
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