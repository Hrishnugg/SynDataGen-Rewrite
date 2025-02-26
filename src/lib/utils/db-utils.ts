/**
 * Database Utility Functions
 * 
 * Helper functions for Firestore operations.
 */

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
 * Format a Firestore document by ensuring date fields are properly converted
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

/**
 * Validate ID format
 * 
 * @param id ID string to validate
 * @returns True if the ID is valid
 */
export function isValidId(id: string): boolean {
  return !!id && typeof id === 'string' && id.length > 0;
}