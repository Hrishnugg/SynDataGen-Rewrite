import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { logger } from './logger';

// Initialize Firebase Admin if it hasn't been initialized
if (!getApps().length) {
  try {
    // Check for service account credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Try to use credentials from env var
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
      );
      
      initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      
      logger.info('Initialized Firebase Admin with service account credentials');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use Application Default Credentials
      initializeApp({
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      
      logger.info('Initialized Firebase Admin with application default credentials');
    } else {
      throw new Error('Firebase credentials not found');
    }
  } catch (error) {
    logger.error('Error initializing Firebase Admin:', error);
    
    // In development, we can use the Firebase emulator
    if (process.env.NODE_ENV === 'development') {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'syndata-dev',
      });
      
      const firestoreDb = getFirestore();
      firestoreDb.settings({
        host: 'localhost:8080',
        ssl: false,
      });
      
      logger.info('Initialized Firebase Admin with emulator settings for development');
    } else {
      // Re-throw the error in production
      throw error;
    }
  }
}

// Initialize Firestore with settings
const db = getFirestore();

// Initialize Auth
const auth = getAuth();

// Initialize Storage
const storage = getStorage();

export { db, auth, storage }; 