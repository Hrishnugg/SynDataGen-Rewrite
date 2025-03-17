/**
 * firestore Type Definitions
 * 
 * This file contains type definitions for firestore in the application.
 */


/**
 * Base interface for Firestore documents
 */
export interface FirestoreDocument {
  id?: string;
  [key: string]: any; // This is a temporary solution until we can properly type all document fields
}


/**
 * Type for Firestore query conditions
 */
export type FirestoreQueryCondition = (query: FirebaseFirestore.Query) => FirebaseFirestore.Query;

