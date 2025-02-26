/**
 * Firestore Migration Loader
 * 
 * Utilities for loading transformed data into Firestore.
 */

import { MigrationError, FirestoreLoadResult } from './types';
import * as admin from 'firebase-admin';

// Track initialization status
let isInitialized = false;

/**
 * Options for loading data into Firestore
 */
interface FirestoreLoadOptions {
  /** Whether to use batch writes (recommended) */
  useBatch?: boolean;
  
  /** Batch size for batch writes (max 500 for Firestore) */
  batchSize?: number;
  
  /** Whether to generate document IDs or use existing ones */
  generateIds?: boolean;
  
  /** Error handling strategy */
  errorHandling?: 'continue' | 'abort';
  
  /** Whether to merge with existing documents if they exist */
  merge?: boolean;
}

/**
 * Load documents into Firestore
 * 
 * @param documents Documents to load
 * @param collectionPath Target Firestore collection path
 * @param options Loading options
 * @returns Loading result
 */
export async function loadToFirestore(
  documents: Record<string, any>[],
  collectionPath: string,
  options: FirestoreLoadOptions = {}
): Promise<FirestoreLoadResult> {
  if (!isInitialized) {
    const initialized = await initializeFirestore();
    if (!initialized) {
      throw new Error('Firestore initialization failed');
    }
  }
  
  const {
    useBatch = true,
    batchSize = 500,
    generateIds = false,
    errorHandling = 'continue',
    merge = false
  } = options;
  
  const result: FirestoreLoadResult = {
    success: 0,
    failed: 0,
    successIds: [],
    errors: {}
  };

  try {
    const db = admin.firestore();
    const collection = db.collection(collectionPath);
    
    if (useBatch) {
      // Process in batches for better performance
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = db.batch();
        const currentBatch = documents.slice(i, i + batchSize);
        
        for (const doc of currentBatch) {
          try {
            let docRef;
            
            if (generateIds) {
              docRef = collection.doc();
            } else if (doc.id) {
              docRef = collection.doc(doc.id);
            } else {
              throw new Error('Document has no ID and generateIds is false');
            }
            
            if (merge) {
              batch.set(docRef, doc, { merge: true });
            } else {
              batch.set(docRef, doc);
            }
            
            result.successIds.push(docRef.id);
          } catch (err: any) {
            const docId = doc.id || 'unknown';
            result.errors[docId] = err.message || 'Unknown error';
            result.failed++;
            
            if (errorHandling === 'abort') {
              throw err;
            }
          }
        }
        
        await batch.commit();
        result.success += currentBatch.length - Object.keys(result.errors).filter(id => 
          currentBatch.some(doc => doc.id === id)
        ).length;
      }
    } else {
      // Process documents individually
      for (const doc of documents) {
        try {
          let docRef;
          
          if (generateIds) {
            docRef = collection.doc();
          } else if (doc.id) {
            docRef = collection.doc(doc.id);
          } else {
            throw new Error('Document has no ID and generateIds is false');
          }
          
          if (merge) {
            await docRef.set(doc, { merge: true });
          } else {
            await docRef.set(doc);
          }
          
          result.successIds.push(docRef.id);
          result.success++;
        } catch (err: any) {
          const docId = doc.id || 'unknown';
          result.errors[docId] = err.message || 'Unknown error';
          result.failed++;
          
          if (errorHandling === 'abort') {
            throw err;
          }
        }
      }
    }
    
    return result;
  } catch (err: any) {
    return handleFirestoreError(err, { 
      collection: collectionPath, 
      operation: 'loadToFirestore' 
    });
  }
}

/**
 * Initialize Firestore connection
 * 
 * @returns Promise resolving to true if initialization successful, false otherwise
 */
export async function initializeFirestore(): Promise<boolean> {
  try {
    if (isInitialized) {
      return true;
    }
    
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
    
    // Test connection by making a simple query
    await admin.firestore().collection('_test_connection').limit(1).get();
    
    isInitialized = true;
    console.log('Firestore connection initialized successfully');
    return true;
  } catch (err: any) {
    console.error('Firestore initialization failed:', err.message || err);
    return false;
  }
}

/**
 * Check if Firestore is ready to accept writes
 * 
 * @returns Promise resolving to true if Firestore is ready
 */
export async function isFirestoreReady(): Promise<boolean> {
  try {
    if (!isInitialized) {
      return await initializeFirestore();
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Handle errors during Firestore operations
 * 
 * @param error Error object
 * @param context Additional context information
 * @returns Formatted migration error
 */
export function handleFirestoreError(
  error: Error | any,
  context: { document?: any; collection: string; operation: string }
): never {
  const errorMessage = error.message || 'Unknown Firestore error';
  
  const migrationError: MigrationError = {
    error: `Firestore ${context.operation} error: ${errorMessage}`,
    phase: 'load',
    document: context.document?.id || context.document?._id?.toString() || undefined,
    details: {
      collection: context.collection,
      originalError: error
    }
  };
  
  throw migrationError;
}
