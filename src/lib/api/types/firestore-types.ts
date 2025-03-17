/**
 * Firestore Types
 * 
 * This file defines the types used by the Firestore service.
 */

import { DocumentData } from 'firebase-admin/firestore';

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
 * Query options for Firestore queries
 */
export interface FirestoreQueryOptions {
  conditions?: FirestoreQueryCondition[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  startAfter?: DocumentData;
  endBefore?: DocumentData;
  page?: number;
  pageSize?: number;
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
}

/**
 * Base document type that includes an ID field
 */
export interface BaseDocument {
  id: string;
  [key: string]: any;
}

/**
 * Type for a document with a specific structure
 */
export type FirestoreDocument<T> = T & BaseDocument; 