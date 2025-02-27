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

/**
 * Get Firebase credentials from all possible sources
 */
export async function getFirebaseCredentials(): Promise<ServiceAccountCredentials> {
  credLogger.info('Attempting to retrieve Firebase credentials');
  
  // First, try to get from environment variables
  credLogger.debug('Checking environment variables for Firebase credentials');
  const envCredentials = getFirebaseCredentialsFromEnv();
  if (isValidFirebaseCredential(envCredentials)) {
    credLogger.info('Found valid Firebase credentials in environment variables');
    return envCredentials;
  } else {
    credLogger.debug('Environment variables did not contain valid Firebase credentials');
    if (envCredentials) {
      credLogger.debug('Environment contained some Firebase variables, but not a complete set:', 
        Object.keys(envCredentials).filter(k => !!envCredentials[k as keyof ServiceAccountCredentials]));
    }
  }
  
  // Next, try to get from service account file
  credLogger.debug('Checking service account file');
  const fileCredentials = await getFirebaseCredentialsFromFile();
  if (isValidFirebaseCredential(fileCredentials)) {
    credLogger.info('Found valid Firebase credentials in service account file');
    return fileCredentials;
  }
  
  // Finally, try application default credentials
  credLogger.debug('Checking for application default credentials');
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || isRunningInGCP()) {
    credLogger.info('Using application default credentials');
    return { useAppDefault: true };
  }
  
  // No credentials found
  credLogger.error('No valid Firebase credentials found from any source');
  logAvailableCredentialSources();
  
  // Return a mock implementation for development
  if (process.env.NODE_ENV === 'development') {
    credLogger.warn('Returning mock credentials for development environment');
    return {
      project_id: 'mock-project-id',
      private_key: 'mock-private-key',
      client_email: 'mock@example.com',
      type: 'service_account'
    };
  }
  
  throw new Error('No valid Firebase credentials found from any source');
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
    // Handle escaped newlines in private key
    if (private_key.includes('\\n')) {
      credLogger.debug('Processing escaped newlines in private key');
      private_key = private_key.replace(/\\n/g, '\n');
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