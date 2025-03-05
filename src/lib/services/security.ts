/**
 * Security Service
 * 
 * Provides security features for the data generation system, including:
 * - Customer isolation
 * - Rate limiting enforcement
 * - Access control
 * - Data validation
 */

import { JobConfiguration } from '../models/data-generation/types';

export interface SecurityOptions {
  enableCustomerIsolation: boolean;
  enableRateLimiting: boolean;
  enableAccessControl: boolean;
  enableDataValidation: boolean;
}

export interface CustomerContext {
  customerId: string;
  projectId?: string;
  roles: string[];
  permissions: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SecurityService {
  private options: SecurityOptions;
  
  constructor(options: Partial<SecurityOptions> = {}) {
    this.options = {
      enableCustomerIsolation: true,
      enableRateLimiting: true,
      enableAccessControl: true,
      enableDataValidation: true,
      ...options,
    };
  }
  
  /**
   * Enforces customer isolation by ensuring that a customer can only access their own resources.
   * 
   * @param customerContext The customer context
   * @param resourceCustomerId The customer ID associated with the resource
   * @returns True if the customer is allowed to access the resource, false otherwise
   */
  public enforceCustomerIsolation(customerContext: CustomerContext, resourceCustomerId: string): boolean {
    if (!this.options.enableCustomerIsolation) {
      return true;
    }
    
    // Check if the customer is accessing their own resource
    return customerContext.customerId === resourceCustomerId;
  }
  
  /**
   * Enforces rate limiting by checking if a customer has exceeded their rate limit.
   * 
   * @param customerContext The customer context
   * @param currentActiveJobs The number of currently active jobs for the customer
   * @param maxActiveJobs The maximum number of active jobs allowed for the customer
   * @returns True if the customer is within their rate limit, false otherwise
   */
  public enforceRateLimit(
    customerContext: CustomerContext,
    currentActiveJobs: number,
    maxActiveJobs: number
  ): boolean {
    if (!this.options.enableRateLimiting) {
      return true;
    }
    
    // Check if the customer has exceeded their rate limit
    return currentActiveJobs < maxActiveJobs;
  }
  
  /**
   * Enforces access control by checking if a customer has the required permissions.
   * 
   * @param customerContext The customer context
   * @param requiredPermissions The permissions required to perform the action
   * @returns True if the customer has the required permissions, false otherwise
   */
  public enforceAccessControl(
    customerContext: CustomerContext,
    requiredPermissions: string[]
  ): boolean {
    if (!this.options.enableAccessControl) {
      return true;
    }
    
    // Check if the customer has all required permissions
    return requiredPermissions.every(permission => customerContext.permissions.includes(permission));
  }
  
  /**
   * Validates job configuration data to ensure it meets security requirements.
   * 
   * @param jobConfig The job configuration to validate
   * @returns A validation result indicating whether the configuration is valid
   */
  public validateJobConfiguration(jobConfig: JobConfiguration): ValidationResult {
    if (!this.options.enableDataValidation) {
      return { isValid: true, errors: [] };
    }
    
    const errors: string[] = [];
    
    // Validate job name (required, no special characters)
    if (!jobConfig.name || jobConfig.name.trim() === '') {
      errors.push('Job name is required');
    } else if (/[<>'"&]/.test(jobConfig.name)) {
      errors.push('Job name contains invalid characters');
    }
    
    // Validate record count (positive number, within limits)
    if (typeof jobConfig.recordCount !== 'number' || jobConfig.recordCount <= 0) {
      errors.push('Record count must be a positive number');
    } else if (jobConfig.recordCount > 1000000) {
      errors.push('Record count exceeds maximum limit of 1,000,000');
    }
    
    // Validate output format (must be one of the supported formats)
    const supportedFormats = ['csv', 'json', 'xml', 'sql'];
    if (!supportedFormats.includes(jobConfig.outputFormat)) {
      errors.push(`Output format must be one of: ${supportedFormats.join(', ')}`);
    }
    
    // Validate schema (must have at least one field)
    if (!jobConfig.schema || !jobConfig.schema.fields || Object.keys(jobConfig.schema.fields).length === 0) {
      errors.push('Schema must have at least one field');
    } else {
      // Validate field names (no special characters, no duplicates)
      const fieldNames = Object.keys(jobConfig.schema.fields);
      const invalidFieldNames = fieldNames.filter(name => /[<>'"&]/.test(name));
      
      if (invalidFieldNames.length > 0) {
        errors.push(`Field names contain invalid characters: ${invalidFieldNames.join(', ')}`);
      }
      
      // Validate field types (must be supported)
      const supportedTypes = [
        'string', 'integer', 'float', 'boolean', 'date', 'uuid',
        'fullName', 'firstName', 'lastName', 'email', 'phone',
        'address', 'city', 'country', 'zipCode', 'company',
        'jobTitle', 'creditCard', 'iban', 'color', 'url',
        'ipAddress', 'lorem',
      ];
      
      for (const [fieldName, field] of Object.entries(jobConfig.schema.fields)) {
        if (!supportedTypes.includes(field.type)) {
          errors.push(`Field "${fieldName}" has unsupported type: ${field.type}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Sanitizes job configuration data to remove any potentially harmful content.
   * 
   * @param jobConfig The job configuration to sanitize
   * @returns A sanitized copy of the job configuration
   */
  public sanitizeJobConfiguration(jobConfig: JobConfiguration): JobConfiguration {
    if (!this.options.enableDataValidation) {
      return jobConfig;
    }
    
    // Create a deep copy of the job configuration
    const sanitized = JSON.parse(JSON.stringify(jobConfig)) as JobConfiguration;
    
    // Sanitize job name (remove special characters)
    if (sanitized.name) {
      sanitized.name = sanitized.name.replace(/[<>'"&]/g, '');
    }
    
    // Sanitize job description (remove special characters)
    if (sanitized.description) {
      sanitized.description = sanitized.description.replace(/[<>'"&]/g, '');
    }
    
    // Sanitize field names (remove special characters)
    if (sanitized.schema && sanitized.schema.fields) {
      const sanitizedFields: Record<string, any> = {};
      
      for (const [fieldName, field] of Object.entries(sanitized.schema.fields)) {
        const sanitizedFieldName = fieldName.replace(/[<>'"&]/g, '');
        sanitizedFields[sanitizedFieldName] = field;
      }
      
      sanitized.schema.fields = sanitizedFields;
    }
    
    return sanitized;
  }
  
  /**
   * Creates a secure storage path for a customer's data.
   * 
   * @param customerContext The customer context
   * @param jobId The job ID
   * @returns A secure storage path
   */
  public createSecureStoragePath(customerContext: CustomerContext, jobId: string): string {
    // Create a path that isolates customer data
    const basePath = customerContext.projectId
      ? `customers/${customerContext.customerId}/projects/${customerContext.projectId}`
      : `customers/${customerContext.customerId}`;
    
    return `${basePath}/jobs/${jobId}`;
  }
  
  /**
   * Logs a security event for auditing purposes.
   * 
   * @param customerContext The customer context
   * @param eventType The type of security event
   * @param details Additional details about the event
   */
  public logSecurityEvent(
    customerContext: CustomerContext,
    eventType: 'access' | 'rate_limit' | 'validation' | 'isolation',
    details: Record<string, any>
  ): void {
    // In a real implementation, this would log to a secure audit log
    console.log(`[SECURITY] ${eventType.toUpperCase()} - Customer: ${customerContext.customerId}`, details);
  }
} 