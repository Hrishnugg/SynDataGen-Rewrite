/**
 * Firestore Service Test Setup
 * 
 * This file contains utility functions to setup a real Firestore
 * connection using the Firebase Emulator Suite for testing.
 * This ensures tests are run against the actual Firebase API rather
 * than mocks, providing more realistic test coverage.
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { FirestoreServiceImpl } from '../../lib/api/services/firestore-service';
import { IFirestoreService } from '../../lib/api/services/firestore-service.interface';

// Firestore emulator configuration
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const TEST_PROJECT_ID = 'syndatagen-test';

/**
 * Initializes a real Firestore connection using the Firebase Emulator
 * @returns A Firestore instance connected to the emulator
 */
export const initializeFirestoreEmulator = (): Firestore => {
  // Use emulator for Firestore
  process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
  
  // Initialize Firebase if not already done
  let app: App;
  if (getApps().length === 0) {
    app = initializeApp({
      projectId: TEST_PROJECT_ID,
      credential: cert({
        projectId: TEST_PROJECT_ID,
        clientEmail: `firebase-adminsdk-${TEST_PROJECT_ID}@${TEST_PROJECT_ID}.iam.gserviceaccount.com`,
        privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----\n' // This is a fake key for testing only
      })
    });
  } else {
    app = getApps()[0];
  }
  
  // Get Firestore instance
  return getFirestore(app);
};

/**
 * Creates a real FirestoreService instance connected to the emulator
 * @returns FirestoreService instance for testing
 */
export const createTestFirestoreService = (): IFirestoreService => {
  // Initialize real Firestore connection to emulator
  const firestore = initializeFirestoreEmulator();
  
  // Return a real FirestoreService instance
  return new FirestoreServiceImpl({
    firestoreInstance: firestore
  });
};

/**
 * Prepares the Firestore emulator with test data
 * @param data Test data to seed in the emulator
 */
export const seedFirestoreEmulator = async (data: Record<string, any[]>): Promise<void> => {
  const firestore = initializeFirestoreEmulator();
  const batch = firestore.batch();
  
  // Add each collection/document to the batch
  for (const [collection, documents] of Object.entries(data)) {
    for (const doc of documents) {
      const docRef = doc.id 
        ? firestore.collection(collection).doc(doc.id)
        : firestore.collection(collection).doc();
      
      // Use the document ID from the reference if not provided
      const docData = { ...doc };
      if (!docData.id) {
        docData.id = docRef.id;
      }
      
      batch.set(docRef, docData);
    }
  }
  
  // Commit all the test data
  await batch.commit();
};

/**
 * Clears all test data from the Firestore emulator
 */
export const clearFirestoreEmulator = async (): Promise<void> => {
  const firestore = initializeFirestoreEmulator();
  
  // List all collections
  const collections = await firestore.listCollections();
  
  // Delete all documents in each collection
  for (const collection of collections) {
    const documents = await collection.listDocuments();
    
    const batch = firestore.batch();
    documents.forEach(doc => {
      batch.delete(doc);
    });
    
    if (documents.length > 0) {
      await batch.commit();
    }
  }
};

/**
 * Creates a test Firestore service that interfaces with the emulator
 * while maintaining compatibility with existing test code
 */
export const createMockFirestoreService = (): IFirestoreService => {
  // In a real-world scenario, we should use the actual emulator connection
  return createTestFirestoreService();
}; 