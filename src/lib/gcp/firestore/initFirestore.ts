/**
 * Firestore Initialization
 * 
 * This module provides utilities for initializing and managing Firestore connections.
 */

import * as admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
// Import dotenv using require syntax instead of ES modules
const dotenv = require('dotenv');

dotenv.config();

// Firestore client instance
let firestoreInstance: Firestore | null = null;

/**
 * Initialize the Firebase Admin SDK and Firestore
 * 
 * @returns Initialized Firestore instance
 */
export function initializeFirestore(): Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  try {
    // Environment variables for Firestore initialization
    const projectId = process.env.GCP_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Check if Firebase Admin SDK is already initialized
    if (getApps().length === 0) {
      // If credentials are provided in environment variables
      if (projectId && clientEmail && privateKey) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          })
        });
        console.log('Firebase Admin SDK initialized with environment variables');
      } 
      // If credential file path is provided
      else if (credentialsPath) {
        initializeApp({
          credential: admin.credential.cert(credentialsPath)
        });
        console.log('Firebase Admin SDK initialized with credential file');
      } 
      // Default initialization with application default credentials
      else {
        initializeApp();
        console.log('Firebase Admin SDK initialized with application default credentials');
      }
    }

    // Initialize Firestore with settings
    firestoreInstance = getFirestore();
    
    // Configure Firestore settings if needed
    firestoreInstance.settings({
      ignoreUndefinedProperties: true, // Ignore undefined properties in documents
    });

    console.log('Firestore initialized successfully');
    return firestoreInstance;
  } catch (error: any) {
    console.error('Error initializing Firestore:', error);
    throw new Error(`Firestore initialization failed: ${error.message}`);
  }
}

/**
 * Connect to Firestore emulator for local development
 * 
 * @param db Firestore instance
 */
export function connectFirestoreEmulator(db: Firestore): void {
  if (process.env.NODE_ENV === 'development' || process.env.USE_FIRESTORE_EMULATOR === 'true') {
    const host = process.env.FIRESTORE_EMULATOR_HOST || 'localhost';
    const port = parseInt(process.env.FIRESTORE_EMULATOR_PORT || '8080');
    
    try {
      db.settings({
        host: `${host}:${port}`,
        ssl: false,
        ignoreUndefinedProperties: true
      });
      console.log(`Connected to Firestore emulator at ${host}:${port}`);
    } catch (error: any) {
      console.error('Failed to connect to Firestore emulator:', error);
    }
  }
}

/**
 * Get the Firestore instance, initializing it if necessary
 * 
 * @returns Firestore instance
 */
export function getFirestoreInstance(): Firestore {
  // Initialize if not already initialized
  if (!firestoreInstance) {
    firestoreInstance = initializeFirestore();
    
    // Connect to emulator if in development
    connectFirestoreEmulator(firestoreInstance);
  }
  
  return firestoreInstance;
}

/**
 * Generate a Firestore document ID using a custom prefix
 * 
 * @param prefix Optional prefix for the document ID
 * @returns A unique document ID
 */
export function generateFirestoreId(prefix?: string): string {
  const db = getFirestoreInstance();
  const docRef = db.collection('_temp_ids_').doc();
  const id = docRef.id;
  
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Get the server timestamp field value for Firestore
 * 
 * @returns A sentinel value for server timestamp
 */
export function getServerTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

/**
 * Create a reference to a collection
 * 
 * @param collectionName The name of the collection
 * @returns A collection reference
 */
export function getCollection(collectionName: string) {
  const db = getFirestoreInstance();
  return db.collection(collectionName);
}

/**
 * Convert Firebase DocumentSnapshot to a typed object
 * 
 * @param snapshot DocumentSnapshot to convert
 * @returns Typed data object with id
 */
export function convertDocSnapshot<T>(snapshot: admin.firestore.DocumentSnapshot): T & { id: string } {
  if (!snapshot.exists) {
    throw new Error(`Document does not exist: ${snapshot.ref.path}`);
  }
  
  const data = snapshot.data() as T;
  return {
    ...(data as T),
    id: snapshot.id
  };
}

/**
 * Convert QuerySnapshot to an array of typed objects
 * 
 * @param snapshot QuerySnapshot to convert
 * @returns Array of typed data objects with ids
 */
export function convertQuerySnapshot<T>(snapshot: admin.firestore.QuerySnapshot): Array<T & { id: string }> {
  return snapshot.docs.map(doc => {
    const data = doc.data() as T;
    return {
      ...(data as T),
      id: doc.id
    };
  });
}

// Export useful Firebase Admin types and utilities
export {
  admin,
  Firestore,
  admin as FirebaseAdmin
}; 