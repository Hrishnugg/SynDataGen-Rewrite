/**
 * Migration Validation Utilities
 * 
 * Tools for validating data during the migration process.
 */

import { ValidationResult } from './types';

/**
 * Basic schema format for validation
 */
interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'any';
    required?: boolean;
    min?: number;
    max?: number;
    enum?: any[];
    pattern?: RegExp;
    nested?: ValidationSchema;
    validator?: (value: any) => boolean | string;
  };
}

/**
 * Validate a single document against a schema
 * 
 * @param document The document to validate
 * @param schema Validation schema
 * @returns String error message if invalid, null if valid
 */
export function validateDocument(
  document: Record<string, any>,
  schema: ValidationSchema
): string | null {
  if (!document || typeof document !== 'object') {
    return 'Document must be an object';
  }
  
  // Check each field in the schema
  for (const [field, rules] of Object.entries(schema)) {
    const value = document[field];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      return `Field '${field}' is required`;
    }
    
    // Skip validation for undefined optional fields
    if (value === undefined) {
      continue;
    }
    
    // Type validation
    if (rules.type !== 'any' && value !== null) {
      let typeValid = false;
      
      switch (rules.type) {
        case 'string':
          typeValid = typeof value === 'string';
          break;
        case 'number':
          typeValid = typeof value === 'number';
          break;
        case 'boolean':
          typeValid = typeof value === 'boolean';
          break;
        case 'object':
          typeValid = typeof value === 'object' && !Array.isArray(value);
          break;
        case 'array':
          typeValid = Array.isArray(value);
          break;
        case 'date':
          typeValid = value instanceof Date || 
                     (typeof value === 'string' && !isNaN(Date.parse(value))) ||
                     (typeof value === 'object' && value.seconds !== undefined);
          break;
      }
      
      if (!typeValid) {
        return `Field '${field}' must be of type ${rules.type}`;
      }
    }
    
    // Skip further validation if value is null
    if (value === null) {
      continue;
    }
    
    // String-specific validations
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.min !== undefined && value.length < rules.min) {
        return `Field '${field}' must be at least ${rules.min} characters long`;
      }
      
      if (rules.max !== undefined && value.length > rules.max) {
        return `Field '${field}' must be at most ${rules.max} characters long`;
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        return `Field '${field}' must match pattern ${rules.pattern}`;
      }
    }
    
    // Number-specific validations
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        return `Field '${field}' must be at least ${rules.min}`;
      }
      
      if (rules.max !== undefined && value > rules.max) {
        return `Field '${field}' must be at most ${rules.max}`;
      }
    }
    
    // Array-specific validations
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.min !== undefined && value.length < rules.min) {
        return `Field '${field}' must have at least ${rules.min} items`;
      }
      
      if (rules.max !== undefined && value.length > rules.max) {
        return `Field '${field}' must have at most ${rules.max} items`;
      }
    }
    
    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      return `Field '${field}' must be one of: ${rules.enum.join(', ')}`;
    }
    
    // Nested object validation
    if (rules.type === 'object' && rules.nested && typeof value === 'object') {
      const nestedValidation = validateDocument(value, rules.nested);
      if (nestedValidation) {
        return `${field}.${nestedValidation}`;
      }
    }
    
    // Custom validator
    if (rules.validator) {
      const validatorResult = rules.validator(value);
      if (validatorResult !== true) {
        return typeof validatorResult === 'string' 
          ? `Field '${field}': ${validatorResult}`
          : `Field '${field}' failed custom validation`;
      }
    }
  }
  
  return null;
}

/**
 * Validate a batch of documents against a schema
 * 
 * @param documents Array of documents to validate
 * @param schema Validation schema
 * @returns Validation results with valid and invalid indexes
 */
export async function validateMigrationData(
  documents: Record<string, any>[],
  schema?: ValidationSchema
): Promise<ValidationResult> {
  const result: ValidationResult = {
    validIndexes: [],
    invalidIndexes: [],
    errors: {},
    allValid: true
  };
  
  // If no schema provided, consider all documents valid
  if (!schema) {
    result.validIndexes = documents.map((_, index) => index);
    return result;
  }
  
  // Validate each document
  documents.forEach((doc, index) => {
    const validationError = validateDocument(doc, schema);
    
    if (validationError) {
      result.invalidIndexes.push(index);
      result.errors[index] = validationError;
      result.allValid = false;
    } else {
      result.validIndexes.push(index);
    }
  });
  
  return result;
}

/**
 * Create a validation schema for a specific collection
 * 
 * @param collectionName The collection to create a schema for
 * @returns Validation schema for the collection
 */
export function getValidationSchema(collectionName: string): ValidationSchema {
  switch (collectionName) {
    case 'users':
      return {
        name: { type: 'string', required: true },
        email: { 
          type: 'string', 
          required: true, 
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        // Password is hashed, so it should be a string
        password: { type: 'string', required: true },
        company: { type: 'string', required: true },
        createdAt: { type: 'date', required: true },
        updatedAt: { type: 'date', required: true }
      };
      
    case 'projects':
      return {
        name: { type: 'string', required: true },
        description: { type: 'string', required: true },
        ownerId: { type: 'string', required: true },
        teamMembers: { 
          type: 'array', 
          required: true,
          // We can add nested validation for each team member
          validator: (members) => {
            if (!Array.isArray(members)) return 'Must be an array';
            
            for (let i = 0; i < members.length; i++) {
              const member = members[i];
              if (!member.userId || typeof member.userId !== 'string') {
                return `Team member at index ${i} must have a valid userId`;
              }
              if (!['owner', 'admin', 'member', 'viewer'].includes(member.role)) {
                return `Team member at index ${i} has invalid role`;
              }
            }
            
            return true;
          }
        },
        createdAt: { type: 'date', required: true },
        updatedAt: { type: 'date', required: true },
        status: { 
          type: 'string', 
          required: true,
          enum: ['active', 'archived'] 
        },
        storageConfig: {
          type: 'object',
          required: true,
          nested: {
            bucketName: { type: 'string', required: true },
            region: { type: 'string', required: true }
          }
        },
        settings: {
          type: 'object',
          required: true,
          nested: {
            dataRetentionDays: { type: 'number', required: true },
            maxStorageGB: { type: 'number', required: true }
          }
        },
        metadata: { type: 'object', required: true }
      };
      
    case 'waitlist':
      return {
        email: { 
          type: 'string', 
          required: true, 
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        name: { type: 'string', required: true },
        company: { type: 'string', required: true },
        industry: { type: 'string', required: true },
        dataVolume: { type: 'string', required: true },
        useCase: { type: 'string', required: true },
        createdAt: { type: 'date', required: true },
        status: { type: 'string', required: true },
        ipAddress: { type: 'string', required: false }
      };
      
    default:
      // Return a minimal schema that just ensures documents are objects
      return { _id: { type: 'any', required: false } };
  }
}
