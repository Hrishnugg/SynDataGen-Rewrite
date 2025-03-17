/**
 * GCP Firestore Service
 * 
 * Utilities for interacting with Firestore database.
 */

import * as admin from 'firebase-admin';
import { getFirestore, Firestore, DocumentData, QuerySnapshot, Query, DocumentReference, CollectionReference } from 'firebase-admin/firestore';
import { logger } from '@/lib/utils/logger';

// Define global state for TypeScript
declare global {
  var __firestoreState: {
    initialized: boolean;
    instance: Firestore | null;
    settingsApplied: boolean;
  };
}

// Initialize global state if it doesn't exist
if (!global.__firestoreState) {
  global.__firestoreState = {
    initialized: false,
    instance: null,
    settingsApplied: false
  };
}

// Track initialization status
let isInitialized = false;
let firestoreInstance: Firestore | null = null;

/**
 * Initialize Firestore with appropriate settings
 */
export async function initializeFirestore(): Promise<void> {
  if (isInitialized && firestoreInstance) {
    return;
  }

  try {
    // Check if there's already a global Firestore state
    if (global.__firestoreState?.initialized && global.__firestoreState?.instance) {
      firestoreInstance = global.__firestoreState.instance;
      isInitialized = true;
      console.log('Reusing already initialized Firestore instance from global state');
      return;
    }

    // Check if Firebase Admin is already initialized
    // Use a safer check that won't throw if admin.apps is undefined
    const appsInitialized = admin.apps && Array.isArray(admin.apps) && admin.apps.length > 0;
    
    if (!appsInitialized) {
      // Initialize Firebase Admin SDK
      try {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'syndatagen-test',
          credential: admin.credential.applicationDefault()
        });
      } catch (error) {
        logger.warn('Error initializing with application default credentials, falling back to emulator config');
        // Fall back to a basic config for emulator
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'syndatagen-test'
        });
      }
    }

    firestoreInstance = getFirestore();
    
    // Only apply settings if we haven't already
    if (!global.__firestoreState?.settingsApplied) {
      firestoreInstance.settings({
        ignoreUndefinedProperties: true,
      });
      
      // Mark settings as applied in global state
      global.__firestoreState.settingsApplied = true;
    }
    
    // Update global state
    global.__firestoreState.initialized = true;
    global.__firestoreState.instance = firestoreInstance;
    
    isInitialized = true;
    logger.info('Firestore initialized successfully');
  } catch (error: any) {
    logger.error('Firestore initialization failed:', error);
    throw error;
  }
}

/**
 * Get the Firestore instance
 */
export function getFirestoreInstance(): Firestore {
  // First check if we already have an instance
  if (isInitialized && firestoreInstance) {
    return firestoreInstance;
  }
  
  // Check global state before throwing
  if (global.__firestoreState?.initialized && global.__firestoreState?.instance) {
    firestoreInstance = global.__firestoreState.instance;
    isInitialized = true;
    logger.debug('Retrieved initialized Firestore instance from global state');
    return firestoreInstance;
  }
  
  // Try to initialize lazily
  try {
    // This is a synchronous function, so we can't await the async initialization
    // Instead, we'll check if Firestore is already initialized elsewhere
    const appsInitialized = admin.apps && Array.isArray(admin.apps) && admin.apps.length > 0;
    
    if (appsInitialized) {
      firestoreInstance = getFirestore();
      isInitialized = true;
      
      // Update global state
      global.__firestoreState.initialized = true;
      global.__firestoreState.instance = firestoreInstance;
      
      return firestoreInstance;
    }
  } catch (error) {
    logger.error('Failed to get Firestore instance:', error);
  }
  
  throw new Error('Firestore not initialized. Call initializeFirestore first.');
}

/**
 * Create a query from a collection
 * @param collectionPath Path to the collection
 * @param queryFn Function to build the query
 * @returns Query object
 */
export function createQuery(
  collectionPath: string,
  queryFn: (collectionRef: CollectionReference) => Query
): Query {
  const db = getFirestoreInstance();
  const collectionRef = db.collection(collectionPath);
  return queryFn(collectionRef);
}

/**
 * Execute a query and return the results
 * @param query Query to execute
 * @returns Query results
 */
export async function executeQuery(query: Query): Promise<DocumentData[]> {
  const snapshot = await query.get();
  return snapshot.docs.map(doc => {
    return {
      id: doc.id,
      ...doc.data()
    };
  });
}

/**
 * Get all documents from a collection
 * @param collectionPath Path to the collection
 * @returns Array of documents
 */
export async function getAllDocuments(collectionPath: string): Promise<DocumentData[]> {
  const db = getFirestoreInstance();
  const snapshot = await db.collection(collectionPath).get();
  
  return snapshot.docs.map(doc => {
    return {
      id: doc.id,
      ...doc.data()
    };
  });
}

/**
 * Get a document by ID
 * @param collectionPath Path to the collection
 * @param documentId Document ID
 * @returns Document data or null if not found
 */
export async function getDocument(
  collectionPath: string,
  documentId: string
): Promise<DocumentData | null> {
  const db = getFirestoreInstance();
  const docRef = db.collection(collectionPath).doc(documentId);
  const doc = await docRef.get();
  
  if (!doc.exists) {
    return null;
  }
  
  return {
    id: doc.id,
    ...doc.data()
  };
}

/**
 * Create or update a document
 * @param collectionPath Path to the collection
 * @param documentId Document ID (optional, will be generated if not provided)
 * @param data Document data
 * @returns Document reference
 */
export async function setDocument(
  collectionPath: string,
  data: DocumentData,
  documentId?: string
): Promise<DocumentReference> {
  const db = getFirestoreInstance();
  const collectionRef = db.collection(collectionPath);
  
  if (documentId) {
    const docRef = collectionRef.doc(documentId);
    await docRef.set(data, { merge: true });
    return docRef;
  } else {
    return await collectionRef.add(data);
  }
}

/**
 * Delete a document
 * @param collectionPath Path to the collection
 * @param documentId Document ID
 * @returns True if successful
 */
export async function deleteDocument(
  collectionPath: string,
  documentId: string
): Promise<boolean> {
  const db = getFirestoreInstance();
  const docRef = db.collection(collectionPath).doc(documentId);
  await docRef.delete();
  return true;
}

/**
 * Get the current Firestore state for diagnostics
 */
export function getFirestoreState() {
  return {
    initialized: isInitialized,
    hasInstance: !!firestoreInstance,
    globalState: global.__firestoreState,
    appsInitialized: admin.apps.length > 0
  };
}

/**
 * Firestore query options
 */
export interface FirestoreQueryOptions {
  where?: Array<{
    field: string;
    operator: '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: any;
  }>;
  orderBy?: Array<{
    field: string;
    direction?: 'asc' | 'desc';
  }>;
  limit?: number;
  startAfter?: DocumentData;
  endBefore?: DocumentData;
}

/**
 * Query documents from Firestore
 * 
 * @param collection Collection path
 * @param options Query options
 * @returns Array of document data
 */
export async function queryDocuments<T>(
  collection: string,
  options: FirestoreQueryOptions = {}
): Promise<T[]> {
  await ensureInitialized();
  
  try {
    let query: Query<DocumentData> = firestoreInstance!.collection(collection);
    
    // Apply where clauses
    if (options.where) {
      for (const whereClause of options.where) {
        query = query.where(whereClause.field, whereClause.operator, whereClause.value);
      }
    }
    
    // Apply order by
    if (options.orderBy) {
      for (const orderByClause of options.orderBy) {
        query = query.orderBy(orderByClause.field, orderByClause.direction || 'asc');
      }
    }
    
    // Apply pagination
    if (options.startAfter) {
      query = query.startAfter(options.startAfter);
    }
    
    if (options.endBefore) {
      query = query.endBefore(options.endBefore);
    }
    
    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const querySnapshot = await query.get();
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as unknown as T[];
  } catch (error: any) {
    console.error(`Error querying documents from ${collection}:`, error);
    throw error;
  }
}

/**
 * Create a document in Firestore
 * 
 * @param collection Collection path
 * @param data Document data
 * @param id Optional document ID (will be auto-generated if not provided)
 * @returns Created document ID
 */
export async function createDocument<T extends Record<string, any>>(
  collection: string,
  data: T,
  id?: string
): Promise<string> {
  await ensureInitialized();
  
  try {
    let docRef: DocumentReference;
    
    if (id) {
      docRef = firestoreInstance!.collection(collection).doc(id);
      await docRef.set(data as DocumentData);
    } else {
      docRef = await firestoreInstance!.collection(collection).add(data as DocumentData);
    }
    
    return docRef.id;
  } catch (error: any) {
    console.error(`Error creating document in ${collection}:`, error);
    throw error;
  }
}

/**
 * Update a document in Firestore
 * 
 * @param collection Collection path
 * @param id Document ID
 * @param data Document data to update
 * @returns True if successful
 */
export async function updateDocument<T extends Record<string, any>>(
  collection: string,
  id: string,
  data: Partial<T>
): Promise<boolean> {
  await ensureInitialized();
  
  try {
    const docRef = firestoreInstance!.collection(collection).doc(id);
    await docRef.update(data as DocumentData);
    return true;
  } catch (error: any) {
    console.error(`Error updating document ${id} in ${collection}:`, error);
    throw error;
  }
}

/**
 * Operation for batch write
 */
export interface BatchOperation<T extends Record<string, any>> {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id?: string;
  data?: T;
}

/**
 * Batch write documents to Firestore
 * 
 * @param operations Array of batch operations
 * @returns Result of batch operations
 */
export async function batchWriteDocuments<T extends Record<string, any>>(
  operations: Array<BatchOperation<T>>
): Promise<{
  success: boolean;
  results: Array<{
    success: boolean;
    id?: string;
    error?: string;
  }>;
}> {
  await ensureInitialized();
  
  const result = {
    success: true,
    results: [] as Array<{
      success: boolean;
      id?: string;
      error?: string;
    }>
  };
  
  try {
    // Split operations into batches of 500 (Firestore limit)
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }
    
    // Process each batch
    for (const batchOperations of batches) {
      const batch = firestoreInstance!.batch();
      
      for (const op of batchOperations) {
        let docRef: DocumentReference;
        
        if (op.type === 'create') {
          if (op.id) {
            docRef = firestoreInstance!.collection(op.collection).doc(op.id);
            batch.set(docRef, op.data as DocumentData);
          } else {
            docRef = firestoreInstance!.collection(op.collection).doc();
            batch.set(docRef, op.data as DocumentData);
          }
          
          result.results.push({
            success: true,
            id: docRef.id
          });
        } else if (op.type === 'update') {
          if (!op.id) {
            throw new Error('Document ID is required for update operations');
          }
          
          docRef = firestoreInstance!.collection(op.collection).doc(op.id);
          batch.update(docRef, op.data as DocumentData);
          
          result.results.push({
            success: true,
            id: docRef.id
          });
        } else if (op.type === 'delete') {
          if (!op.id) {
            throw new Error('Document ID is required for delete operations');
          }
          
          docRef = firestoreInstance!.collection(op.collection).doc(op.id);
          batch.delete(docRef);
          
          result.results.push({
            success: true,
            id: docRef.id
          });
        }
      }
      
      await batch.commit();
    }
    
    return result;
  } catch (error: any) {
    console.error('Error in batch write:', error);
    result.success = false;
    throw error;
  }
}

/**
 * Run a transaction on Firestore
 * 
 * @param updateFunction Function to run within the transaction
 * @returns Transaction result
 */
export async function runTransaction<T>(
  updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> {
  await ensureInitialized();
  
  try {
    return await firestoreInstance!.runTransaction(updateFunction);
  } catch (error: any) {
    console.error('Error in transaction:', error);
    throw error;
  }
}

/**
 * Export a collection to Cloud Storage
 * 
 * @param collection Collection path
 * @param destination Storage destination
 * @returns Export result
 */
export async function exportCollectionToStorage(
  collection: string,
  destination: string
): Promise<{
  success: boolean;
  exportPath: string;
  documentCount: number;
}> {
  await ensureInitialized();
  
  try {
    // This is a placeholder for the actual implementation
    // Cloud Firestore export API would be used here
    // This typically requires a server-side implementation or Cloud Functions
    throw new Error('Not implemented: exportCollectionToStorage requires server-side implementation');
  } catch (error: any) {
    console.error(`Error exporting collection ${collection} to ${destination}:`, error);
    throw error;
  }
}

/**
 * Ensure Firestore is initialized
 */
async function ensureInitialized(): Promise<void> {
  // Check if we're already initialized
  if (isInitialized) {
    return;
  }
  
  // Check if there's a global Firestore state
  // @ts-ignore - Global state might exist from initFirestore.ts
  if (global.__firestoreState?.initialized && global.__firestoreState?.instance) {
    // @ts-ignore
    firestoreInstance = global.__firestoreState.instance;
    isInitialized = true;
    console.log('Retrieved initialized Firestore instance from global state in ensureInitialized');
    return;
  }
  
  try {
    await initializeFirestore();
  } catch (error) {
    console.error('Error during ensureInitialized:', error);
    throw error;
  }
} 