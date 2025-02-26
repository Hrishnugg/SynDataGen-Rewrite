/**
 * Database Utility Functions
 * 
 * Helper functions for MongoDB and Firestore operations.
 */

import { ObjectId } from 'mongodb';

/**
 * Check if a string is a valid MongoDB ObjectId
 * 
 * @param id String to check
 * @returns True if string is a valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
  try {
    return ObjectId.isValid(id);
  } catch (e) {
    return false;
  }
}

/**
 * Convert MongoDB _id to string
 * 
 * @param doc MongoDB document with _id
 * @returns Document with _id converted to string id
 */
export function normalizeMongoId<T extends Record<string, any>>(doc: T & { _id: ObjectId }): Omit<T, '_id'> & { id: string } {
  if (!doc) return null as any;
  
  const { _id, ...rest } = doc;
  // Use type assertion to handle the transformation correctly
  return {
    ...rest,
    id: _id.toString()
  } as Omit<T, '_id'> & { id: string };
}

/**
 * Convert an array of MongoDB documents, normalizing _id to id
 * 
 * @param docs Array of MongoDB documents
 * @returns Array with normalized ids
 */
export function normalizeMongoIds<T extends Record<string, any>>(
  docs: Array<T & { _id: ObjectId }>
): Array<Omit<T, '_id'> & { id: string }> {
  return docs.map(normalizeMongoId);
}

/**
 * Converts a date string or timestamp to a Date object
 * 
 * @param date Date as string, number or Date
 * @returns Date object
 */
export function toDate(date: string | number | Date): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date);
  if (typeof date === 'string') return new Date(date);
  return new Date();
}

/**
 * Format a Firestore or MongoDB document by ensuring date fields are properly converted
 * 
 * @param doc Document to format
 * @param dateFields Array of field names that should be dates
 * @returns Formatted document
 */
export function formatDocument<T extends Record<string, any>>(
  doc: T,
  dateFields: string[] = ['createdAt', 'updatedAt']
): T {
  if (!doc) return doc;
  
  // Create a mutable copy of the document
  const formatted: Record<string, any> = { ...doc };
  
  // Convert date fields
  for (const field of dateFields) {
    if (formatted[field]) {
      formatted[field] = toDate(formatted[field]);
    }
  }
  
  // Cast back to the original type
  return formatted as T;
}