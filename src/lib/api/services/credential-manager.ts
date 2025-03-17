/**
 * Credential Manager
 * 
 * Centralized service for managing and retrieving credentials for various services.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fixPrivateKey } from '@/lib/firebase/key-fixer';
import { ServiceAccountCredentials as FirestoreServiceAccountCredentials } from '@/lib/gcp/firestore/firestore-utils';

// Ensure environment variables are loaded
dotenv.config();

// Debug mode
const DEBUG_CREDENTIALS = process.env.DEBUG_CREDENTIALS === 'true';

// Define logger for credentials
const credLogger = {
  info: (message: string, ...args: any[]) => console.log(`[CredentialManager] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[CredentialManager] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[CredentialManager] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true' || DEBUG_CREDENTIALS) {
      console.log(`[CredentialManager:DEBUG] ${message}`, ...args);
    }
  }
};

// Extend the source types for different credential sources
export type CredentialSource = 
  | 'base64-env-var'
  | 'environment-variables'
  | 'application-credentials-file'
  | 'service-account-file'
  | 'gcp-metadata'
  | 'application-default'
  | 'mock'
  | 'forced-service-account-path'
  | 'development-mock'
  | 'preview-fallback'
  | 'error-fallback';

// Define Firebase credential structure with extra fields for tracking source
export interface ServiceAccountCredentials extends Partial<FirestoreServiceAccountCredentials> {
  // Required fields made optional for internal flexibility
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  
  // Additional fields for tracking credential source
  source?: CredentialSource;
  // For using application default credentials
  useAppDefault?: boolean;
  // Legacy field names for compatibility
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

// Track the results of our credential attempts
export interface CredentialCheckResult {
  available: boolean;
  source: CredentialSource | null;
  error?: string;
  credentials?: ServiceAccountCredentials;
}

// Function to check for Firebase credentials environment variable availability
export function areFirebaseCredentialsAvailable(): boolean {
  try {
    // Detailed check for various types of credentials
    const hasEnvPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
    const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
    const hasB64ServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const hasAppCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    // Check for complete credentials from environment variables
    const hasEnvCreds = hasEnvPrivateKey && hasClientEmail && hasProjectId;
    
    // Log credential availability for debugging
    credLogger.debug('Firebase Credentials Check:');
    credLogger.debug(`- Environment variables: ${hasEnvCreds}`);
    credLogger.debug(`- B64 Service Account: ${hasB64ServiceAccount}`);
    credLogger.debug(`- App Credentials File: ${hasAppCredentials}`);
    
    // If any of these are available, return true
    if (hasEnvCreds || hasB64ServiceAccount || hasAppCredentials) {
      return true;
    }
    
    // Check for app credentials path
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
          return true;
        }
      } catch (readError: unknown) {
        const errorMessage = readError instanceof Error ? readError.message : String(readError);
        credLogger.warn(`Error checking for service account file: ${errorMessage}`);
      }
    }
  
    // Check for service account in cwd
    const localServiceAccountPath = path.join(process.cwd(), 'service-account.json');
    try {
      if (fs.existsSync(localServiceAccountPath)) {
        return true;
      }
    } catch (fileError: unknown) {
      const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
      credLogger.warn(`Error checking for local service account file: ${errorMessage}`);
    }
  
    // Fallback - credentials are not available
    return false;
  } catch (e) {
    // Error checking for credentials, assume they're not available
    return false;
  }
}

/**
 * Get a service account from a forced path
 */
export function getServiceAccountFromForcedPath(forcedPath: string): ServiceAccountCredentials | null {
  if (forcedPath) {
    try {
      credLogger.debug(`Checking for forced service account at: ${forcedPath}`);
      // Verify file exists
      if (fs.existsSync(forcedPath)) {
        try {
          const serviceAccountContent = fs.readFileSync(forcedPath, 'utf8');
          const serviceAccount = JSON.parse(serviceAccountContent);
          
          // Verify required fields
          if (
            (serviceAccount.project_id || serviceAccount.projectId) && 
            (serviceAccount.client_email || serviceAccount.clientEmail) && 
            (serviceAccount.private_key || serviceAccount.privateKey)
          ) {
            // Normalize field names to camelCase
            const normalizedServiceAccount: ServiceAccountCredentials = {
              projectId: serviceAccount.projectId || serviceAccount.project_id,
              clientEmail: serviceAccount.clientEmail || serviceAccount.client_email,
              privateKey: serviceAccount.privateKey || serviceAccount.private_key,
              source: 'forced-service-account-path',
              
              // Keep snake_case fields for backward compatibility
              project_id: serviceAccount.project_id || serviceAccount.projectId,
              client_email: serviceAccount.client_email || serviceAccount.clientEmail,
              private_key: serviceAccount.private_key || serviceAccount.privateKey
            };
            
            // Fix the private key if needed
            try {
              normalizedServiceAccount.private_key = processPrivateKey(normalizedServiceAccount.private_key);
              normalizedServiceAccount.privateKey = normalizedServiceAccount.private_key;
            } catch (keyFixError: unknown) {
              const errorMessage = keyFixError instanceof Error ? keyFixError.message : String(keyFixError);
              credLogger.warn('Warning: Could not fix private key format in forced service account', errorMessage);
            }
            
            credLogger.debug('Successfully loaded forced service account');
            return normalizedServiceAccount;
          } else {
            credLogger.warn(`Forced service account file at ${forcedPath} is missing required fields`);
          }
        } catch (readError: unknown) {
          const errorMessage = readError instanceof Error ? readError.message : String(readError);
          credLogger.error(`Error reading forced service account file: ${errorMessage}`);
        }
      } else {
        credLogger.error(`Forced service account file not found at: ${forcedPath}`);
      }
    } catch (fileError: unknown) {
      const errorMessage = fileError instanceof Error ? fileError.message : String(fileError);
      credLogger.error(`Error checking forced service account file: ${errorMessage}`);
    }
  }
  
  return null;
}

/**
 * Get a service account from a base64 encoded string
 */
export function getServiceAccountFromBase64(b64ServiceAccount: string): ServiceAccountCredentials | null {
  if (b64ServiceAccount) {
    try {
      credLogger.debug('Decoding base64 service account');
      
      // Decode base64
      const decodedServiceAccount = Buffer.from(b64ServiceAccount, 'base64').toString('utf8');
      const serviceAccountJson = JSON.parse(decodedServiceAccount);
      
      // Verify required fields
      if (
        (serviceAccountJson.project_id || serviceAccountJson.projectId) && 
        (serviceAccountJson.client_email || serviceAccountJson.clientEmail) && 
        (serviceAccountJson.private_key || serviceAccountJson.privateKey)
      ) {
        // Normalize field names to camelCase
        const serviceAccount: ServiceAccountCredentials = {
          projectId: serviceAccountJson.projectId || serviceAccountJson.project_id,
          clientEmail: serviceAccountJson.clientEmail || serviceAccountJson.client_email,
          privateKey: serviceAccountJson.privateKey || serviceAccountJson.private_key,
          source: 'base64-env-var',
          
          // Keep snake_case fields for backward compatibility
          project_id: serviceAccountJson.project_id || serviceAccountJson.projectId,
          client_email: serviceAccountJson.client_email || serviceAccountJson.clientEmail,
          private_key: serviceAccountJson.private_key || serviceAccountJson.privateKey
        };
        
        credLogger.debug('Successfully loaded base64 service account');
        return serviceAccount;
      } else {
        credLogger.warn('Base64 service account is missing required fields');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      credLogger.error('Failed to decode base64 service account:', errorMessage);
    }
  }
  
  return null;
}

/**
 * Get a service account from a file path
 */
export function getServiceAccountFromFile(credPath: string): ServiceAccountCredentials | null {
  if (credPath) {
    try {
      credLogger.debug(`Loading service account from file: ${credPath}`);
      
      // Check if file exists
      if (fs.existsSync(credPath)) {
        const serviceAccountContent = fs.readFileSync(credPath, 'utf8');
        const serviceAccountJson = JSON.parse(serviceAccountContent);
        
        // Verify required fields
        if (
          (serviceAccountJson.project_id || serviceAccountJson.projectId) && 
          (serviceAccountJson.client_email || serviceAccountJson.clientEmail) && 
          (serviceAccountJson.private_key || serviceAccountJson.privateKey)
        ) {
          // Normalize field names to camelCase
          const serviceAccount: ServiceAccountCredentials = {
            projectId: serviceAccountJson.projectId || serviceAccountJson.project_id,
            clientEmail: serviceAccountJson.clientEmail || serviceAccountJson.client_email,
            privateKey: serviceAccountJson.privateKey || serviceAccountJson.private_key,
            source: 'application-credentials-file',
            
            // Keep snake_case fields for backward compatibility
            project_id: serviceAccountJson.project_id || serviceAccountJson.projectId,
            client_email: serviceAccountJson.client_email || serviceAccountJson.clientEmail,
            private_key: serviceAccountJson.private_key || serviceAccountJson.privateKey
          };
          
          credLogger.debug('Successfully loaded credentials from file');
          return serviceAccount;
        } else {
          const missingFields = [];
          if (!serviceAccountJson.project_id && !serviceAccountJson.projectId) missingFields.push('project_id/projectId');
          if (!serviceAccountJson.client_email && !serviceAccountJson.clientEmail) missingFields.push('client_email/clientEmail');
          if (!serviceAccountJson.private_key && !serviceAccountJson.privateKey) missingFields.push('private_key/privateKey');
          
          credLogger.error(`Service account file is missing required fields: ${missingFields.join(', ')}`);
        }
      } else {
        credLogger.error(`Service account file not found at: ${credPath}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      credLogger.error('Error loading service account from file:', errorMessage);
    }
  }
  
  return null;
}

/**
 * Check for service account in common locations
 */
export function findServiceAccountInCommonLocations(): ServiceAccountCredentials | null {
  try {
    // Common locations to check for service account files
    const locations = [
      path.join(process.cwd(), 'service-account.json'),
      path.join(process.cwd(), 'firebase-service-account.json'),
      path.join(process.cwd(), 'firebase-credentials.json'),
      path.join(process.cwd(), 'credentials', 'service-account.json'),
      path.join(process.cwd(), 'credentials', 'firebase-service-account.json'),
      path.join(process.cwd(), 'credentials', 'firebase-credentials.json'),
      path.join(process.cwd(), 'config', 'service-account.json'),
      path.join(process.cwd(), 'config', 'firebase-service-account.json'),
      path.join(process.cwd(), 'config', 'firebase-credentials.json')
    ];
    
    credLogger.debug('Searching for service account in common locations');
    
    // Check each location
    for (const location of locations) {
      if (fs.existsSync(location)) {
        credLogger.debug(`Found service account at: ${location}`);
        
        try {
          const serviceAccountContent = fs.readFileSync(location, 'utf8');
          const serviceAccountJson = JSON.parse(serviceAccountContent);
          
          // Verify required fields
          if (
            (serviceAccountJson.project_id || serviceAccountJson.projectId) && 
            (serviceAccountJson.client_email || serviceAccountJson.clientEmail) && 
            (serviceAccountJson.private_key || serviceAccountJson.privateKey)
          ) {
            // Normalize field names to camelCase
            const serviceAccount: ServiceAccountCredentials = {
              projectId: serviceAccountJson.projectId || serviceAccountJson.project_id,
              clientEmail: serviceAccountJson.clientEmail || serviceAccountJson.client_email,
              privateKey: serviceAccountJson.privateKey || serviceAccountJson.private_key,
              source: 'service-account-file',
              
              // Keep snake_case fields for backward compatibility
              project_id: serviceAccountJson.project_id || serviceAccountJson.projectId,
              client_email: serviceAccountJson.client_email || serviceAccountJson.clientEmail,
              private_key: serviceAccountJson.private_key || serviceAccountJson.privateKey
            };
            
            return serviceAccount;
          }
        } catch (parseError: unknown) {
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          credLogger.debug(`Error parsing service account file at ${location}:`, errorMessage);
        }
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    credLogger.error('Error searching for service account files:', errorMessage);
  }
  
  return null;
}

/**
 * Process private keys that might have escaped newlines
 */
export function processPrivateKey(privateKey: string | undefined): string {
  if (!privateKey) {
    return '';
  }
  
  try {
    // Check if key needs fixing
    if (privateKey.includes('\\n')) {
      credLogger.debug('Private key has escaped newlines, fixing...');
      // Convert escaped newlines
      return privateKey.replace(/\\n/g, '\n');
    }
  } catch (fixError: unknown) {
    const errorMessage = fixError instanceof Error ? fixError.message : String(fixError);
    credLogger.error(`Error processing private key format: ${errorMessage}`);
  }
  
  // Return original if no fix needed or error occurred
  return privateKey;
}

/**
 * Process service account environment variables
 */
export function processServiceAccountEnvVariables(): ServiceAccountCredentials {
  try {
    credLogger.debug('Processing service account from environment variables');
    
    // Collect all required fields
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Check required fields
    if (!projectId || !clientEmail || !privateKey) {
      const missingFields = [];
      if (!projectId) missingFields.push('FIREBASE_PROJECT_ID');
      if (!clientEmail) missingFields.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missingFields.push('FIREBASE_PRIVATE_KEY');
      
      credLogger.error(`Missing environment variables: ${missingFields.join(', ')}`);
      return {} as ServiceAccountCredentials;
    }
    
    // Create base service account
    const result: ServiceAccountCredentials = {
      projectId,
      clientEmail,
      privateKey,
      source: 'environment-variables'
    };
    
    // Process the private key if it has issues
    if (privateKey) {
      try {
        // First try using the dedicated key-fixer module
        try {
          const { fixPrivateKey } = require('@/lib/firebase/key-fixer');
          if (typeof fixPrivateKey === 'function' && privateKey) {
            credLogger.debug('Fixing private key format using key-fixer');
            privateKey = fixPrivateKey(privateKey);
          }
        } catch (keyFixerError: unknown) {
          const errorMessage = keyFixerError instanceof Error ? keyFixerError.message : String(keyFixerError);
          credLogger.debug('key-fixer not available or failed:', errorMessage);
          
          // Fallback: Simple key format fixing if needed
          if (privateKey && privateKey.includes('\\n') && !privateKey.includes('\n')) {
            credLogger.debug('Replacing escaped newlines in private key');
            privateKey = privateKey.replace(/\\n/g, '\n');
          }
        }
        
        // Check if key needs BEGIN/END markers
        if (privateKey && !privateKey.startsWith('-----BEGIN')) {
          credLogger.debug('Adding PEM format wrapper to private key');
          privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
        }
        
        // Update environment variable for other code that might use it directly
        if (privateKey && privateKey !== process.env.FIREBASE_PRIVATE_KEY) {
          credLogger.debug('Updating FIREBASE_PRIVATE_KEY environment variable with fixed key');
          process.env.FIREBASE_PRIVATE_KEY = privateKey;
        }
        
        // Update result
        if (privateKey) {
          result.privateKey = privateKey;
        }
      } catch (keyProcessingError: unknown) {
        const errorMessage = keyProcessingError instanceof Error ? keyProcessingError.message : String(keyProcessingError);
        credLogger.warn('Error processing private key:', errorMessage);
      }
    }
    
    // Add to result
    return {
      ...result,
      project_id: projectId,
      client_email: clientEmail,
      private_key: result.privateKey
    };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    credLogger.error('Error getting credentials from environment:', errorMessage);
    return {} as ServiceAccountCredentials;
  }
}

/**
 * Helper function to check mock environments and provide synthetic credentials
 */
export function getMockCredentials(): CredentialCheckResult {
  if (process.env.NODE_ENV === 'test' || process.env.MOCK_FIREBASE === 'true') {
    credLogger.debug('Using mock Firebase credentials for test environment');
    return {
      available: true,
      source: 'mock' as CredentialSource,
      credentials: {
        projectId: 'test-project-id',
        clientEmail: 'test@example.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----',
        source: 'mock',
        
        // Add snake_case versions for compatibility
        project_id: 'test-project-id',
        client_email: 'test@example.com',
        private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu\nNMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ\n-----END PRIVATE KEY-----'
      }
    };
  }

  return {
    available: false,
    source: null
  };
}

/**
 * Check the result of a credential attempt
 */
export function checkCredentialResult(result: CredentialCheckResult): boolean {
  if (!result.available || !result.credentials) {
    if (result.error) {
      credLogger.error(`Credential check failed: ${result.error}`);
    }
    return false;
  }
  return true;
}

/**
 * Credential Manager Class
 * Provides methods for retrieving and managing different credentials
 */
export class CredentialManager {
  private credCache: Map<string, any>;
  
  constructor() {
    this.credCache = new Map();
  }
  
  /**
   * Get Firebase credentials from available sources
   */
  getFirebaseCredentials(): ServiceAccountCredentials | null {
    // Try all credential sources in priority order
    
    // 1. Check for forced service account path
    if (process.env.FORCED_SERVICE_ACCOUNT_PATH) {
      const forcedCreds = getServiceAccountFromForcedPath(process.env.FORCED_SERVICE_ACCOUNT_PATH);
      if (forcedCreds) return forcedCreds;
    }
    
    // 2. Check for B64 encoded service account
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const b64Creds = getServiceAccountFromBase64(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (b64Creds) return b64Creds;
    }
    
    // 3. Check for direct environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      return processServiceAccountEnvVariables();
    }
    
    // 4. Check for application credentials file
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const appCreds = getServiceAccountFromFile(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      if (appCreds) return appCreds;
    }
    
    // 5. Check for service account in common locations
    const localCreds = findServiceAccountInCommonLocations();
    if (localCreds) return localCreds;
    
    // 6. Check for mock credentials in development
    const mockResult = getMockCredentials();
    if (mockResult.available && mockResult.credentials) {
      return mockResult.credentials;
    }
    
    // 7. Return application default credentials as fallback
    return {
      projectId: 'unknown-project',
      clientEmail: 'unknown@example.com',
      privateKey: '',
      useAppDefault: true,
      source: 'application-default'
    };
  }
  
  /**
   * Clear the credential cache
   */
  clearCache() {
    this.credCache.clear();
  }

  /**
   * Get the status of all credentials
   */
  async getCredentialStatus() {
    try {
      // Get firebase status
      return getFirebaseStatus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        error: errorMessage,
        environment: process.env.NODE_ENV || 'unknown'
      };
    }
  }
}

/**
 * Helper function to get Firebase credentials directly
 * This simplifies access for external modules
 */
export function getFirebaseCredentials(): ServiceAccountCredentials | null {
  const manager = new CredentialManager();
  return manager.getFirebaseCredentials();
}

/**
 * Get the credential manager instance
 */
export function getCredentialManager() {
  return new CredentialManager();
}

/**
 * Helper function to get Firebase initialization status
 */
export function getFirebaseStatus() {
  if (typeof window === 'undefined') {
    try {
      // Get credential status
      const credentialManager = new CredentialManager();
      const credentials = credentialManager.getFirebaseCredentials();
      
      // Determine source type
      const sourceType: CredentialSource = 
        !credentials ? 'error-fallback' :
          credentials.useAppDefault ? 'application-default' : 
          (credentials.project_id === 'mock-project-id' || credentials.projectId === 'mock-project-id') ? 'mock' : 
          (process.env.FIREBASE_PRIVATE_KEY ? 'environment-variables' : 'service-account-file');
      
      return {
        available: !!credentials,
        source: sourceType,
        environment: process.env.NODE_ENV || 'unknown'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        available: false,
        source: 'error-fallback' as CredentialSource,
        error: errorMessage,
        environment: process.env.NODE_ENV || 'unknown'
      };
    }
  }
  
  // Return empty result for client-side
  return { available: false, source: 'error-fallback' as CredentialSource };
}