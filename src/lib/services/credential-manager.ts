/**
 * Credential Manager
 * 
 * Centralized service for managing and retrieving credentials for various services.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fixPrivateKey } from '@/lib/key-fixer';

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

// Define Firebase credential structure
export interface ServiceAccountCredentials {
  type?: string;
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
  // For tracking credential source
  source?: 'base64-env-var' | 'environment-variables' | 'application-credentials-file' | 'service-account-file' | 'gcp-metadata' | 'application-default' | 'mock' | 'forced-service-account-path';
  // For using application default credentials
  useAppDefault?: boolean;
}

// Track the results of our credential attempts
export interface CredentialCheckResult {
  source: string;
  available: boolean;
  isValid: boolean;
  error?: string;
  credentials?: ServiceAccountCredentials;
}

/**
 * Check if Firebase credentials are available
 */
export function areFirebaseCredentialsAvailable(): boolean {
  // Check for base64 encoded service account
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return true;
  }
  
  // Check for environment variable with path to service account file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        return true;
      }
    } catch (error) {
      // File access error, but we'll just return false
    }
  }

  // Check for local service account file
  try {
    const localServiceAccountPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(localServiceAccountPath)) {
      return true;
    }
  } catch (error) {
    // File access error, but we'll just return false
  }

  // Fallback - credentials are not available
  return false;
}

/**
 * Get Firebase credentials from all possible sources
 * Follows a strict priority order with detailed logging
 * 
 * Priority order:
 * 1. FORCE_SERVICE_ACCOUNT_PATH environment variable (highest priority override)
 * 2. FIREBASE_SERVICE_ACCOUNT environment variable (base64 encoded)
 * 3. FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID environment variables
 * 4. GOOGLE_APPLICATION_CREDENTIALS file path
 * 5. Local service account files in common locations
 * 6. Application Default Credentials
 * 7. Emulator for development/testing
 */
export async function getFirebaseCredentials(): Promise<ServiceAccountCredentials> {
  credLogger.info('Attempting to retrieve Firebase credentials');
  
  // Output environmental information for debugging
  credLogger.debug('Environment mode:', process.env.NODE_ENV);
  credLogger.debug('MOCK_FIREBASE setting:', process.env.MOCK_FIREBASE);
  
  // Log all Firebase-related environment variables (with values redacted)
  const firebaseEnvVars = Object.keys(process.env).filter(key => 
    key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP')
  ).map(key => {
    const value = process.env[key];
    if (key.includes('KEY')) {
      return `${key}: ${value ? '[PRESENT]' : '[MISSING]'} (${value ? value.length + ' chars' : 'N/A'})`;
    }
    return `${key}: ${value || '[MISSING]'}`;
  });
  
  credLogger.debug('Available Firebase-related environment variables:', firebaseEnvVars);
  
  // PRIORITY 0: Check for FORCE_SERVICE_ACCOUNT_PATH special override
  if (process.env.FORCE_SERVICE_ACCOUNT_PATH && DEBUG_CREDENTIALS) {
    credLogger.debug('Found FORCE_SERVICE_ACCOUNT_PATH override - this takes highest priority');
    const forcedPath = process.env.FORCE_SERVICE_ACCOUNT_PATH;
    
    try {
      if (fs.existsSync(forcedPath)) {
        credLogger.debug(`Service account file exists at forced path: ${forcedPath}`);
        
        try {
          const fileContent = fs.readFileSync(forcedPath, 'utf-8');
          const serviceAccount = JSON.parse(fileContent);
          
          if (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
            credLogger.info('Successfully loaded service account from forced path');
            
            // Fix the private key if needed
            try {
              serviceAccount.private_key = fixPrivateKey(serviceAccount.private_key);
            } catch (keyFixError) {
              credLogger.warn('Warning: Could not fix private key format in forced service account', keyFixError);
            }
            
            return {
              ...serviceAccount,
              source: 'forced-service-account-path'
            };
          } else {
            credLogger.warn(`Forced service account file at ${forcedPath} is missing required fields`);
          }
        } catch (readError) {
          credLogger.error(`Error reading forced service account file: ${readError.message}`);
        }
      } else {
        credLogger.error(`Forced service account file not found at: ${forcedPath}`);
      }
    } catch (fileError) {
      credLogger.error(`Error checking forced service account file: ${fileError.message}`);
    }
  }
  
  // PRIORITY 1: Check for base64 encoded service account in environment
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      credLogger.debug('Found FIREBASE_SERVICE_ACCOUNT environment variable');
      const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
      const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString();
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      if (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
        credLogger.info('Successfully decoded base64 Firebase service account');
        
        // Process private key if needed
        if (serviceAccount.private_key.includes('\\n')) {
          credLogger.debug('Processing escaped newlines in base64-encoded private key');
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        
        return {
          ...serviceAccount,
          source: 'base64-env-var'
        };
      } else {
        credLogger.warn('Base64 service account is missing required fields');
      }
    } catch (error) {
      credLogger.error('Failed to decode base64 service account:', 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // PRIORITY 2: Check for individual environment variables
  credLogger.debug('Checking individual environment variables for Firebase credentials');
  const envCredentials = getFirebaseCredentialsFromEnv();
  
  if (isValidFirebaseCredential(envCredentials)) {
    credLogger.info('Found valid Firebase credentials in environment variables');
    
    // Additional diagnostics
    credLogger.debug('Valid credentials from environment:', {
      project_id_length: envCredentials.project_id?.length,
      client_email_length: envCredentials.client_email?.length,
      private_key_valid: envCredentials.private_key?.includes('BEGIN PRIVATE KEY')
    });
    
    return {
      ...envCredentials,
      source: 'environment-variables'
    };
  } else if (envCredentials && Object.keys(envCredentials).length > 0) {
    credLogger.debug('Environment contained some Firebase variables, but not a complete set:', 
      Object.keys(envCredentials).filter(k => !!envCredentials[k as keyof ServiceAccountCredentials]));
    
    // Log what's missing
    const missing: string[] = [];
    if (!envCredentials.project_id) missing.push('project_id');
    if (!envCredentials.private_key) missing.push('private_key');
    if (!envCredentials.client_email) missing.push('client_email');
    
    credLogger.debug(`Missing fields in environment variables: ${missing.join(', ')}`);
    
    // Additional diagnostic info about partial credentials
    if (envCredentials.private_key) {
      credLogger.debug('Private key present but credentials invalid. Private key starts with:', 
        envCredentials.private_key.substring(0, 20) + '...');
      credLogger.debug('Private key contains BEGIN marker:', 
        envCredentials.private_key.includes('BEGIN PRIVATE KEY'));
    }
  }
  
  // PRIORITY 3: Check for service account file specified by environment variable
  credLogger.debug('Checking for service account file specified by environment variable');
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credLogger.debug(`Found GOOGLE_APPLICATION_CREDENTIALS pointing to: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    try {
      const fs = require('fs');
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (fs.existsSync(credPath)) {
        const fileContent = fs.readFileSync(credPath, 'utf-8');
        const serviceAccount = JSON.parse(fileContent);
        
        if (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
          credLogger.info(`Successfully loaded service account from: ${credPath}`);
          return {
            ...serviceAccount,
            source: 'application-credentials-file'
          };
        } else {
          credLogger.warn(`Service account file at ${credPath} is missing required fields`);
        }
      } else {
        credLogger.error(`Service account file not found at: ${credPath}`);
      }
    } catch (error) {
      credLogger.error('Error loading service account from file:', 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  // PRIORITY 4: Check for service account file in common locations
  credLogger.debug('Checking for service account file in common locations');
  const fileCredentials = await getFirebaseCredentialsFromFile();
  if (isValidFirebaseCredential(fileCredentials)) {
    credLogger.info('Found valid Firebase credentials in service account file');
    return {
      ...fileCredentials,
      source: 'service-account-file'
    };
  }
  
  // PRIORITY 5: Try application default credentials
  credLogger.debug('Checking for application default credentials');
  if (isRunningInGCP()) {
    credLogger.info('Running in Google Cloud Platform - using application default credentials');
    return { 
      useAppDefault: true,
      source: 'gcp-metadata'
    };
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // We already checked the file contents above, but it might be in ADC format
    credLogger.info('Using application default credentials from GOOGLE_APPLICATION_CREDENTIALS');
    return { 
      useAppDefault: true,
      source: 'application-default'
    };
  }
  
  // No valid credentials found - handle based on environment
  credLogger.error('No valid Firebase credentials found from any source');
  logAvailableCredentialSources();
  
  // PRIORITY 6: Development/test fallbacks
  const isDev = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
  
  // For development/test environments, use emulator by default
  if (isDev || isTest || process.env.MOCK_FIREBASE === 'true') {
    credLogger.warn('Using mock Firebase credentials for development/testing environment');
    return {
      project_id: 'syndata-dev',
      private_key: 'mock-private-key',
      client_email: 'mock@example.com',
      type: 'service_account',
      useAppDefault: true, // Mark as using app default to bypass validation
      source: 'development-mock'
    };
  }
  
  // For preview environments (e.g., Vercel preview deployments)
  if (process.env.VERCEL_ENV === 'preview') {
    credLogger.warn('Using limited functionality mode for preview environment');
    return {
      project_id: 'preview-environment',
      private_key: 'preview-mode-key',
      client_email: 'preview@example.com',
      type: 'service_account',
      useAppDefault: true,
      source: 'preview-fallback'
    };
  }
  
  // For production, this is a critical error but return a value to avoid crashes
  credLogger.error('CRITICAL: Firebase credentials missing in production!');
  credLogger.error('See FIREBASE-SETUP.md for setup instructions.');
  
  return {
    project_id: 'missing-credentials-error',
    private_key: 'missing-credentials-error',
    client_email: 'missing@credentials.error',
    type: 'service_account',
    useAppDefault: true,
    source: 'error-fallback'
  };
}

/**
 * Get Firebase credentials from environment variables
 */
function getFirebaseCredentialsFromEnv(): ServiceAccountCredentials {
  try {
    credLogger.debug('Attempting to get Firebase credentials from environment variables');
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    const result: ServiceAccountCredentials = {};
    
    // Add fields that are present
    if (projectId) result.project_id = projectId;
    if (clientEmail) result.client_email = clientEmail;
    
    // Only process private key if it exists
    if (privateKey) {
      // Log diagnostic information
      credLogger.debug('Private key details:', {
        length: privateKey.length,
        hasNewlines: privateKey.includes('\n'),
        hasEscapedNewlines: privateKey.includes('\\n'),
        hasHeader: privateKey.includes('BEGIN PRIVATE KEY'),
        hasFooter: privateKey.includes('END PRIVATE KEY')
      });
      
      // Try to fix the private key using our key-fixer utility
      try {
        const originalKey = privateKey;
        
        // First try using the dedicated key-fixer module
        try {
          privateKey = fixPrivateKey(privateKey);
          credLogger.debug('Fixed private key using key-fixer utility');
        } catch (fixError) {
          credLogger.debug('Failed to use key-fixer, using manual processing:', fixError.message);
          
          // Manual processing if key-fixer fails
          // Handle escaped newlines
          if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
            credLogger.debug('Replacing escaped newlines in private key');
            privateKey = privateKey.replace(/\\n/g, '\n');
          }
          
          // Fix quotes if they're included in the environment variable
          if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            credLogger.debug('Removing surrounding quotes from private key');
            privateKey = privateKey.slice(1, -1);
          }
        }
        
        // Check if the key was modified
        const wasFixed = privateKey !== originalKey;
        if (wasFixed) {
          credLogger.debug('Private key was fixed during processing');
          
          // Diagnostic info about the fixed key
          credLogger.debug('Fixed private key details:', {
            length: privateKey.length,
            hasNewlines: privateKey.includes('\n'),
            hasEscapedNewlines: privateKey.includes('\\n'),
            hasHeader: privateKey.includes('BEGIN PRIVATE KEY'),
            hasFooter: privateKey.includes('END PRIVATE KEY')
          });
          
          // Update the environment variable with the fixed key for downstream consumers
          if (DEBUG_CREDENTIALS) {
            credLogger.debug('DEBUG_CREDENTIALS is enabled, updating FIREBASE_PRIVATE_KEY environment variable with fixed key');
            process.env.FIREBASE_PRIVATE_KEY = privateKey;
          }
        }
      } catch (keyProcessingError) {
        credLogger.warn('Error processing private key:', keyProcessingError.message);
      }
      
      // Add to result
      result.private_key = privateKey;
    }
    
    // Log whether we have all required fields
    credLogger.debug('Credential extraction result:', {
      hasProjectId: !!result.project_id,
      hasClientEmail: !!result.client_email,
      hasPrivateKey: !!result.private_key
    });
    
    return result;
  } catch (error) {
    credLogger.error('Error getting credentials from environment:', error);
    return {};
  }
}

/**
 * Get Firebase credentials from service account JSON file
 */
async function getFirebaseCredentialsFromFile(): Promise<ServiceAccountCredentials | null> {
  // First, check for credentials file path in environment
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentialPath) {
    credLogger.debug('GOOGLE_APPLICATION_CREDENTIALS environment variable found:', credentialPath);
    
    try {
      if (fs.existsSync(credentialPath)) {
        credLogger.debug(`Service account file exists at ${credentialPath}`);
        
        try {
          // Read the file content
          const fileContent = fs.readFileSync(credentialPath, 'utf-8');
          // Parse as JSON
          const serviceAccount = JSON.parse(fileContent);
          
          // Check if it has the required fields
          if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
            credLogger.debug('Service account file has all required fields');
            
            // Process the private key using the key-fixer if available
            try {
              const { fixPrivateKey } = require('@/lib/key-fixer');
              if (typeof fixPrivateKey === 'function') {
                credLogger.debug('Fixing private key format using key-fixer');
                serviceAccount.private_key = fixPrivateKey(serviceAccount.private_key);
              }
            } catch (keyFixerError) {
              credLogger.debug('key-fixer not available or failed:', keyFixerError.message);
              
              // Fallback: Simple key format fixing if needed
              if (serviceAccount.private_key.includes('\\n')) {
                credLogger.debug('Replacing escaped newlines in private key');
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
              }
            }
            
            // Log diagnostic info
            credLogger.debug('Private key info:', {
              length: serviceAccount.private_key.length,
              hasNewlines: serviceAccount.private_key.includes('\n'),
              hasHeader: serviceAccount.private_key.includes('BEGIN PRIVATE KEY'),
              hasFooter: serviceAccount.private_key.includes('END PRIVATE KEY')
            });
            
            return serviceAccount;
          } else {
            // List which fields are missing
            const missingFields = [];
            if (!serviceAccount.project_id) missingFields.push('project_id');
            if (!serviceAccount.client_email) missingFields.push('client_email');
            if (!serviceAccount.private_key) missingFields.push('private_key');
            
            credLogger.error(`Service account file is missing required fields: ${missingFields.join(', ')}`);
          }
        } catch (parseError) {
          credLogger.error('Error parsing service account file:', parseError instanceof Error ? parseError.message : String(parseError));
        }
      } else {
        credLogger.error(`Service account file does not exist at specified path: ${credentialPath}`);
      }
    } catch (fileError) {
      credLogger.error('Error accessing service account file:', fileError instanceof Error ? fileError.message : String(fileError));
    }
  }
  
  // Look for service account files in common locations
  try {
    const commonLocations = [
      path.join(process.cwd(), 'service-account.json'),
      path.join(process.cwd(), 'firebase-service-account.json'),
      path.join(process.cwd(), 'credentials', 'firebase-service-account.json'),
      path.join(process.cwd(), '.firebase', 'service-account.json')
    ];
    
    for (const location of commonLocations) {
      if (fs.existsSync(location)) {
        credLogger.debug(`Found service account file at ${location}`);
        
        try {
          // Read the file content
          const fileContent = fs.readFileSync(location, 'utf-8');
          // Parse as JSON
          const serviceAccount = JSON.parse(fileContent);
          
          // Check if it has the required fields
          if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
            credLogger.debug(`Service account file at ${location} has all required fields`);
            
            // Process the private key using the key-fixer if available
            try {
              const { fixPrivateKey } = require('@/lib/key-fixer');
              if (typeof fixPrivateKey === 'function') {
                credLogger.debug('Fixing private key format using key-fixer');
                serviceAccount.private_key = fixPrivateKey(serviceAccount.private_key);
              }
            } catch (keyFixerError) {
              credLogger.debug('key-fixer not available or failed:', keyFixerError.message);
              
              // Fallback: Simple key format fixing if needed
              if (serviceAccount.private_key.includes('\\n')) {
                credLogger.debug('Replacing escaped newlines in private key');
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
              }
            }
            
            // Log the environment variable that could be set
            credLogger.info(`Found valid service account file at ${location}. You can set GOOGLE_APPLICATION_CREDENTIALS=${location}`);
            
            return serviceAccount;
          }
        } catch (parseError) {
          credLogger.debug(`Error parsing service account file at ${location}:`, parseError.message);
        }
      }
    }
  } catch (error) {
    credLogger.error('Error searching for service account files:', error instanceof Error ? error.message : String(error));
  }
  
  return null;
}

/**
 * Validate Firebase credentials
 */
function isValidFirebaseCredential(cred?: ServiceAccountCredentials | null): boolean {
  if (!cred) return false;
  
  // Application default credentials are valid
  if (cred.useAppDefault) return true;
  
  // Service account credentials need these fields
  const hasRequiredFields = cred.project_id && cred.private_key && cred.client_email;
  
  credLogger.debug('Credential validation result:', {
    hasProjectId: !!cred.project_id,
    hasPrivateKey: !!cred.private_key,
    hasClientEmail: !!cred.client_email,
    isValid: !!hasRequiredFields
  });
  
  return !!hasRequiredFields;
}

/**
 * Check if running in Google Cloud environment
 */
function isRunningInGCP(): boolean {
  // GCP sets these environment variables
  return !!(
    process.env.FUNCTION_NAME || // Cloud Functions
    process.env.K_SERVICE ||     // Cloud Run
    process.env.GAE_SERVICE      // App Engine
  );
}

/**
 * Log available credential sources for troubleshooting
 */
function logAvailableCredentialSources() {
  console.log('===== FIREBASE CREDENTIAL DIAGNOSTIC INFORMATION =====');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('MOCK_FIREBASE setting:', process.env.MOCK_FIREBASE);
  
  // Check for all possible credential sources
  let foundSources = [];
  
  // 1. Base64 encoded service account
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const length = process.env.FIREBASE_SERVICE_ACCOUNT.length;
    foundSources.push(`FIREBASE_SERVICE_ACCOUNT (${length} characters)`);
    
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString();
      const parsed = JSON.parse(decoded);
      const hasRequiredFields = parsed.project_id && parsed.private_key && parsed.client_email;
      console.log(`  - Base64 decode ${parsed ? 'succeeded' : 'failed'}`);
      console.log(`  - Has required fields: ${hasRequiredFields ? 'YES' : 'NO'}`);
      if (parsed.project_id) console.log(`  - Project ID: ${parsed.project_id}`);
      if (!parsed.private_key) console.log(`  - Missing private_key field`);
      if (!parsed.client_email) console.log(`  - Missing client_email field`);
    } catch (e) {
      console.log(`  - Base64 decode failed: ${e.message}`);
    }
  }
  
  // 2. Individual environment variables
  let individualVars = [];
  if (process.env.FIREBASE_PROJECT_ID) {
    individualVars.push(`FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID}`);
  }
  if (process.env.GCP_PROJECT_ID) {
    individualVars.push(`GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID}`);
  }
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    individualVars.push(`GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  }
  if (process.env.FIREBASE_CLIENT_EMAIL) {
    individualVars.push(`FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL}`);
  }
  if (process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const hasCorrectHeader = privateKey.includes('BEGIN PRIVATE KEY');
    const hasCorrectFooter = privateKey.includes('END PRIVATE KEY');
    const hasActualNewlines = privateKey.includes('\n');
    const hasEscapedNewlines = privateKey.includes('\\n');
    
    individualVars.push(`FIREBASE_PRIVATE_KEY: ${privateKey.length} characters`);
    individualVars.push(`  - Has correct header: ${hasCorrectHeader ? 'YES' : 'NO'}`);
    individualVars.push(`  - Has correct footer: ${hasCorrectFooter ? 'YES' : 'NO'}`);
    individualVars.push(`  - Contains actual newlines: ${hasActualNewlines ? 'YES' : 'NO'}`);
    individualVars.push(`  - Contains escaped newlines: ${hasEscapedNewlines ? 'YES' : 'NO'}`);
  }
  
  if (individualVars.length > 0) {
    foundSources.push('Individual environment variables:');
    individualVars.forEach(v => foundSources.push(`  - ${v}`));
  }
  
  // 3. Application credentials file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    foundSources.push(`GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    try {
      const fs = require('fs');
      if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        foundSources.push('  - File exists: YES');
        
        try {
          const content = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
          const parsed = JSON.parse(content);
          const hasRequiredFields = parsed.project_id && parsed.private_key && parsed.client_email;
          foundSources.push(`  - File parse: ${parsed ? 'SUCCESS' : 'FAILED'}`);
          foundSources.push(`  - Has required fields: ${hasRequiredFields ? 'YES' : 'NO'}`);
        } catch (e) {
          foundSources.push(`  - File read/parse failed: ${e.message}`);
        }
      } else {
        foundSources.push('  - File exists: NO');
      }
    } catch (e) {
      foundSources.push(`  - File access error: ${e.message}`);
    }
  }
  
  // 4. Local service account file
  try {
    const fs = require('fs');
    const localPaths = [
      path.join(process.cwd(), 'service-account.json'),
      path.join(process.cwd(), 'firebase-service-account.json'),
      path.join(process.cwd(), 'firestore-service-account.json'),
    ];
    
    const existingFiles = localPaths.filter(p => fs.existsSync(p));
    if (existingFiles.length > 0) {
      foundSources.push('Local service account files:');
      existingFiles.forEach(file => foundSources.push(`  - ${file}`));
    }
  } catch (e) {
    foundSources.push(`Local file check error: ${e.message}`);
  }
  
  // 5. Running in GCP
  const gcpEnv = isRunningInGCP();
  foundSources.push(`Running in GCP: ${gcpEnv ? 'YES' : 'NO'}`);
  
  // Output results
  if (foundSources.length === 0) {
    console.log('No Firebase credential sources found in the environment');
  } else {
    console.log('Found the following credential sources:');
    foundSources.forEach(source => console.log(`- ${source}`));
  }
  
  // Add a verification test that would actually try to initialize Firebase
  console.log('\nTo validate your credentials, run:');
  console.log('  npx ts-node scripts/verify-firebase-credentials.ts');
  
  console.log('=======================================================');
}

/**
 * Credential Manager class for centralized credential management
 */
export class CredentialManager {
  /**
   * Get the status of all credentials
   */
  async getCredentialStatus() {
    try {
      // Check Firebase credentials
      const firebaseStatus = { available: false, source: null };
      try {
        const credentials = await getFirebaseCredentials();
        firebaseStatus.available = true;
        firebaseStatus.source = 
          credentials.useAppDefault ? 'application_default' : 
          (credentials.project_id === 'mock-project-id' ? 'mock' : 
           (process.env.FIREBASE_PRIVATE_KEY ? 'environment' : 'service_account_file'));
      } catch (error) {
        firebaseStatus.error = error instanceof Error ? error.message : 'Unknown error';
      }

      return {
        firebase: firebaseStatus,
        environment: process.env.NODE_ENV || 'unknown'
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error checking credentials',
        environment: process.env.NODE_ENV || 'unknown'
      };
    }
  }
}

/**
 * Get the credential manager instance
 */
export function getCredentialManager() {
  return new CredentialManager();
} 