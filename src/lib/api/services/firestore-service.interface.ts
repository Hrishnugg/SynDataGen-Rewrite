/**
 * Firestore Service Interface
 * 
 * This file defines the interface for the Firestore service.
 * All implementations should adhere to this interface.
 */

import { Firestore, CollectionReference, DocumentReference, DocumentData } from 'firebase-admin/firestore';

/**
 * Query condition for Firestore queries
 */
export interface FirestoreQueryCondition {
  field: string;
  operator?: '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
  op?: '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
  value: unknown;
}

/**
 * Sort option for Firestore queries
 */
export interface FirestoreQuerySortOption {
  field: string;
  direction?: 'asc' | 'desc';
}

/**
 * Query options for Firestore queries
 */
export interface FirestoreQueryOptions {
  conditions?: FirestoreQueryCondition[];
  where?: FirestoreQueryCondition[];
  orderBy?: string | FirestoreQuerySortOption[];
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  startAfter?: DocumentData;
  endBefore?: DocumentData;
  page?: number;
  pageSize?: number;
  select?: string[] | string; // Field names to include in the result
}

/**
 * Pagination result for paginated queries
 */
export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  hasMore?: boolean; // Alias for hasNextPage for backward compatibility
}

/**
 * Error class for Firestore service
 */
export class FirestoreServiceError extends Error {
  constructor(message: string, public code?: string, public details?: unknown) {
    super(message);
    this.name = 'FirestoreServiceError';
  }
}

/**
 * Interface for Firestore service
 */
export interface IFirestoreService {
  /**
   * Initialize the Firestore service
   * @param firestoreInstance Optional Firestore instance to use
   */
  initialize(firestoreInstance?: Firestore): Promise<void>;
  
  /**
   * Get a collection reference
   * @param path Path to the collection
   */
  collection(path: string): CollectionReference | null;
  
  /**
   * Get a document reference
   * @param path Path to the document
   */
  doc(path: string): DocumentReference | null;
  
  /**
   * Create a document
   * @param collectionPath Path to the collection or document (e.g. 'users' or 'users/user123')
   * @param data Document data
   * @returns Document ID
   */
  createDocument<T extends Record<string, unknown>>(collectionPath: string, data: T): Promise<string>;
  
  /**
   * Update a document
   * @param path Path to the document (e.g. 'users/user123')
   * @param data Document data to update
   */
  updateDocument<T extends Record<string, unknown>>(path: string, data: Partial<T>): Promise<void>;
  
  /**
   * Delete a document
   * @param path Path to the document (e.g. 'users/user123')
   */
  deleteDocument(path: string): Promise<void>;
  
  /**
   * Get a document by path
   * @param path Path to the document (e.g. 'users/user123')
   * @returns Document data or null if not found
   */
  getDocument<T>(path: string): Promise<T | null>;
  
  /**
   * Query documents from a collection
   */
  queryDocuments<T>(collectionPath: string, optionsOrConditions?: FirestoreQueryOptions | FirestoreQueryCondition[]): Promise<T[]>;
  
  /**
   * Get paginated documents
   * @param collectionPath Path to the collection
   * @param options Query options
   * @returns Paginated result
   */
  getPaginatedDocuments<T>(collectionPath: string, options?: FirestoreQueryOptions): Promise<PaginationResult<T>>;

  /**
   * Check if a document exists
   * @param path Path to the document
   * @returns True if document exists, false otherwise
   */
  documentExists(path: string): Promise<boolean>;

  /**
   * Count documents in a collection
   * @param collectionPath Path to the collection
   * @param conditions Query conditions
   * @returns Number of documents
   */
  countDocuments(collectionPath: string, conditions?: FirestoreQueryCondition[]): Promise<number>;
}

/**
 * Factory function to get Firestore service
 * @param firestoreInstance Optional Firestore instance to use
 * @returns Firestore service implementation
 */
export function getFirestoreService(firestoreInstance?: Firestore): IFirestoreService {
  // This is just a placeholder for the interface file
  // The actual implementation will be in firestore-service.ts
  throw new Error('This is just an interface definition, not an implementation');
}
