/**
 * Migration Transformers
 * 
 * Functions to transform MongoDB documents to Firestore-compatible format.
 */

import { TransformOptions, TransformFunction } from './types';

/**
 * Basic transformer that handles common MongoDB to Firestore transformations
 * 
 * @param document MongoDB document
 * @param options Transform options
 * @returns Transformed document suitable for Firestore
 */
export function baseTransformer<T extends Record<string, any>>(
  document: T,
  options: TransformOptions = {}
): Record<string, any> {
  const {
    includeId = false,
    stringifyIds = true,
    fieldMappings = {},
    excludeFields = ['__v'],
    defaultValues = {}
  } = options;

  // Create a copy to avoid modifying the original
  const result: Record<string, any> = {};
  
  // Process MongoDB ID
  if (includeId && document._id) {
    result.id = stringifyIds ? document._id.toString() : document._id;
  }
  
  // Add all other fields with potential transformations
  for (const [key, value] of Object.entries(document)) {
    // Skip _id as it's already handled and any excluded fields
    if (key === '_id' || excludeFields.includes(key)) {
      continue;
    }
    
    // Map field name if specified in fieldMappings
    const targetKey = fieldMappings[key] || key;
    
    // Transform the value
    result[targetKey] = transformValue(value, stringifyIds);
  }
  
  // Add default values for missing fields
  for (const [key, value] of Object.entries(defaultValues)) {
    if (result[key] === undefined) {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Transform a specific value type from MongoDB to Firestore compatible format
 * 
 * @param value The value to transform
 * @param stringifyIds Whether to convert ObjectIds to strings
 * @returns Transformed value
 */
function transformValue(value: any, stringifyIds: boolean): any {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle Date objects - Firestore accepts Date objects directly
  if (value instanceof Date) {
    return value;
  }
  
  // Handle MongoDB ObjectId
  if (value && typeof value === 'object' && value.constructor.name === 'ObjectId') {
    return stringifyIds ? value.toString() : value;
  }
  
  // Handle arrays recursively
  if (Array.isArray(value)) {
    return value.map(item => transformValue(item, stringifyIds));
  }
  
  // Handle nested objects recursively
  if (typeof value === 'object') {
    const transformedObj: Record<string, any> = {};
    
    for (const [k, v] of Object.entries(value)) {
      transformedObj[k] = transformValue(v, stringifyIds);
    }
    
    return transformedObj;
  }
  
  // Primitive values can be returned as is
  return value;
}

/**
 * Gets a transformer function for a specific collection
 * 
 * @param collectionName Name of the collection to get transformer for
 * @returns Transform function for the collection
 */
export function getTransformer(collectionName: string): TransformFunction {
  // Each collection can have specific transformation logic
  switch (collectionName) {
    case 'users':
      return (doc: Record<string, any>) => {
        // Start with base transformation
        const transformed = baseTransformer(doc, {
          includeId: false, // We'll use Firestore's auto ID
          stringifyIds: true,
          // Map fields that need renaming
          fieldMappings: {
            // Example: accountStatus -> status
            accountStatus: 'status'
          },
          // Add default values
          defaultValues: {
            status: 'active',
            preference: {
              emailNotifications: true,
              theme: 'light'
            }
          }
        });
        
        // Add any custom transformations for users
        transformed.createdAt = doc.createdAt || new Date();
        transformed.updatedAt = doc.updatedAt || new Date();
        
        // If we're using Firebase Authentication, we might need to adjust fields
        if (transformed.firebaseUid) {
          transformed.authProvider = 'firebase';
        }
        
        return transformed;
      };
      
    case 'projects':
      return (doc: Record<string, any>) => {
        const transformed = baseTransformer(doc, {
          includeId: false,
          stringifyIds: true,
          // Transform team members to have string IDs
          defaultValues: {
            status: 'active',
            settings: {
              dataRetentionDays: 30,
              maxStorageGB: 10
            }
          }
        });
        
        // Ensure dates are proper Firestore timestamps
        transformed.createdAt = doc.createdAt || new Date();
        transformed.updatedAt = doc.updatedAt || new Date();
        
        // Transform team members array to ensure IDs are strings
        if (Array.isArray(transformed.teamMembers)) {
          transformed.teamMembers = transformed.teamMembers.map(member => ({
            ...member,
            userId: member.userId.toString(),
            addedAt: member.addedAt || new Date()
          }));
        }
        
        return transformed;
      };
      
    case 'dataJobs':
      return (doc: Record<string, any>) => {
        const transformed = baseTransformer(doc, {
          includeId: false,
          stringifyIds: true,
          fieldMappings: {
            // Rename fields if needed
            jobId: 'id',
            creationTime: 'createdAt'
          }
        });
        
        // Ensure all job references use string IDs
        if (transformed.projectId) {
          transformed.projectId = transformed.projectId.toString();
        }
        
        if (transformed.createdBy) {
          transformed.createdBy = transformed.createdBy.toString();
        }
        
        // Convert status to Firestore-friendly format
        transformed.status = transformed.status || 'queued';
        
        // Add timestamps if missing
        transformed.createdAt = doc.createdAt || doc.creationTime || new Date();
        transformed.updatedAt = doc.updatedAt || new Date();
        
        return transformed;
      };
      
    case 'waitlist':
      return (doc: Record<string, any>) => {
        return baseTransformer(doc, {
          includeId: false,
          // Simple transformation with no special logic
          defaultValues: {
            status: 'pending'
          }
        });
      };
      
    default:
      // Default to basic transformer for unknown collections
      return (doc: Record<string, any>) => baseTransformer(doc);
  }
}
