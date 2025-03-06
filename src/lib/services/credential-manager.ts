/**
 * Credential Manager
 * 
 * Centralized service for managing and retrieving credentials for various services.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Define logger for credentials
const credLogger = {
  info: (message: string, ...args: any[]) => console.log(`[CredentialManager] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[CredentialManager] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[CredentialManager] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
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
 * Get Firebase credentials from all possible sources with detailed results
 */
/**
 * Get Firebase credentials from all possible sources
 * Follows a strict priority order with detailed logging
 * 
 * Priority order:
 * 1. FIREBASE_SERVICE_ACCOUNT environment variable (base64 encoded)
 * 2. FIREBASE_PRIVATE_KEY + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID environment variables
 * 3. GOOGLE_APPLICATION_CREDENTIALS file path
 * 4. Local service account files in common locations
 * 5. Application Default Credentials
 * 6. Emulator for development/testing
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
  const credentials: ServiceAccountCredentials = {};
  
  // Log available environment variables (filtered for security)
  const envKeys = Object.keys(process.env);
  const firebaseKeys = envKeys.filter(
    key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP')
  );
  
  credLogger.debug(`Found ${firebaseKeys.length} potential Firebase-related environment variables:`, 
    firebaseKeys.map(k => `${k}: ${k.includes('KEY') ? '[REDACTED]' : (process.env[k] ? 'present' : 'empty')}`));
  
  // Check for private key
  let private_key = process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  if (private_key) {
    credLogger.debug('Private key found in environment variable, length:', private_key.length);
    
    try {
      // Use our key fixer utility to ensure proper formatting
      const { fixPrivateKey } = require('@/lib/key-fixer');
      private_key = fixPrivateKey(private_key);
      credLogger.debug('Private key processed successfully with key-fixer');
    } catch (keyFixError) {
      credLogger.error('Error processing private key with key-fixer:', keyFixError);
      
      // Fallback to manual processing if key-fixer fails
      credLogger.debug('Falling back to manual key processing');
      
      // Handle surrounding quotes if present
      if (private_key.startsWith('"') && private_key.endsWith('"')) {
        credLogger.debug('Removing surrounding quotes from private key');
        private_key = private_key.slice(1, -1);
      }
      
      // Handle escaped newlines in private key
      if (private_key.includes('\\n')) {
        credLogger.debug('Processing escaped newlines in private key');
        private_key = private_key.replace(/\\n/g, '\n');
      }
      
      // Verify the key format
      if (!private_key.includes('-----BEGIN PRIVATE KEY-----') || 
          !private_key.includes('-----END PRIVATE KEY-----')) {
        credLogger.warn('Private key appears to be malformed - missing BEGIN/END markers');
        
        // Last resort fix - extract base64 and reformat
        try {
          const base64Content = private_key.replace(/[^A-Za-z0-9+/=]/g, '');
          private_key = `-----BEGIN PRIVATE KEY-----\n${base64Content}\n-----END PRIVATE KEY-----`;
          credLogger.debug('Applied last-resort key fix with base64 extraction');
        } catch (lastResortError) {
          credLogger.error('Failed to apply last-resort key fix:', lastResortError);
        }
      }
    }
    
    credentials.private_key = private_key;
  }
  
  // Check for other required fields
  const client_email = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  if (client_email) {
    credLogger.debug('Client email found in environment variable');
    credentials.client_email = client_email;
  }
  
  const project_id = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID;
  if (project_id) {
    credLogger.debug('Project ID found in environment variable:', project_id);
    credentials.project_id = project_id;
  }
  
  return credentials;
}

/**
 * Get Firebase credentials from service account JSON file
 */
async function getFirebaseCredentialsFromFile(): Promise<ServiceAccountCredentials | null> {
  // Check for credentials file path in environment
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialPath) {
    credLogger.debug('GOOGLE_APPLICATION_CREDENTIALS environment variable found:', credentialPath);
    
    try {
      if (fs.existsSync(credentialPath)) {
        credLogger.debug(`Service account file exists at ${credentialPath}`);
        const fileContent = fs.readFileSync(credentialPath, 'utf-8');
        return JSON.parse(fileContent);
      } else {
        credLogger.error(`Service account file does not exist at specified path: ${credentialPath}`);
      }
    } catch (error) {
      credLogger.error('Error reading service account file:', error instanceof Error ? error.message : String(error));
    }
  }
  
  // Check common locations for service account file in development
  if (process.env.NODE_ENV === 'development') {
    const possiblePaths = [
      './firebase-service-account.json',
      './service-account.json',
      './.firebase/service-account.json',
      './secrets/firebase-service-account.json',
      path.join(process.cwd(), 'firebase-service-account.json'),
      path.join(process.cwd(), 'service-account.json'),
      path.join(process.cwd(), '.firebase', 'service-account.json'),
      path.join(process.cwd(), 'secrets', 'firebase-service-account.json')
    ];
    
    credLogger.debug('Checking common locations for service account file in development mode');
    
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath)) {
          credLogger.debug(`Found service account file at ${filePath}`);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          return JSON.parse(fileContent);
        }
      } catch (error) {
        credLogger.warn(`Error checking or reading file at ${filePath}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    credLogger.debug('No service account file found in common locations');
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
  credLogger.info('Available credential sources:');
  
  // Environment variables
  const envKeys = Object.keys(process.env).filter(
    key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP')
  );
  
  credLogger.info(`- Environment variables (${envKeys.length} related to Google/Firebase found)`);
  
  // Service account file
  const appCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (appCredPath) {
    const exists = fs.existsSync(appCredPath);
    credLogger.info(`- GOOGLE_APPLICATION_CREDENTIALS file: ${appCredPath} (exists: ${exists})`);
  } else {
    credLogger.info('- GOOGLE_APPLICATION_CREDENTIALS not set');
  }
  
  // Check common locations
  if (process.env.NODE_ENV === 'development') {
    const commonLocations = [
      './firebase-service-account.json',
      './service-account.json',
      './.firebase/service-account.json'
    ];
    
    for (const loc of commonLocations) {
      const exists = fs.existsSync(loc);
      if (exists) {
        credLogger.info(`- Service account file found at: ${loc}`);
      }
    }
  }
  
  // Application default location
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    const adcPath = path.join(homeDir, '.config/gcloud/application_default_credentials.json');
    const exists = fs.existsSync(adcPath);
    credLogger.info(`- Application Default Credentials: ${adcPath} (exists: ${exists})`);
  }
  
  // GCP environment
  credLogger.info(`- Running in GCP environment: ${isRunningInGCP()}`);
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