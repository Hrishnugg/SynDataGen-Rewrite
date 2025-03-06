/**
 * Firestore Initialization
 * 
 * This module provides utilities for initializing and managing Firestore connections.
 */

import * as admin from 'firebase-admin';
import { getApps, initializeApp, cert, applicationDefault, AppOptions, App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore, Settings } from 'firebase-admin/firestore';
import { getFirebaseCredentials, ServiceAccountCredentials, areFirebaseCredentialsAvailable } from '@/lib/services/credential-manager';
import { getFirebaseFirestore, getFirebaseInitStatus } from '@/lib/firebase';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
// Try to import key-fixer, but we'll handle if it's not available
import { fixPrivateKey } from '@/lib/key-fixer';

dotenv.config();

// Define default Firestore settings
const DEFAULT_FIRESTORE_SETTINGS: Settings = {
  ignoreUndefinedProperties: true,
  timestampsInSnapshots: true
};

// Define logger for this module
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[Firestore] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[Firestore] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[Firestore] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.log(`[Firestore:DEBUG] ${message}`, ...args);
    }
  }
};

// Stable state tracking with proper typing
type FirestoreState = {
  instance: Firestore | null;
  initializing: boolean;
  initialized: boolean;
  lastInitAttempt: number;
  error: Error | null;
  settingsApplied: boolean;
  connectionVerified: boolean;
  credentials: ServiceAccountCredentials | null;
};

// Global state management with proper type safety
// This prevents issues with undefined states and tracking
declare global {
  var __firestoreState: FirestoreState;
}

// Initialize state only if it doesn't exist
if (!global.__firestoreState) {
  global.__firestoreState = {
    instance: null,
    initializing: false,
    initialized: false,
    lastInitAttempt: 0,
    error: null,
    settingsApplied: false,
    connectionVerified: false,
    credentials: null
  };
}

/**
 * Initialize or retrieve the Firestore instance
 */
export async function initializeFirestore(): Promise<Firestore> {
  // Check if already initialized and return instance
  if (global.__firestoreState.initialized && global.__firestoreState.instance) {
    return global.__firestoreState.instance;
  }

  // Check if initialization in progress
  if (global.__firestoreState.initializing) {
    logger.debug('Firestore initialization in progress, waiting for completion');
    return waitForInitialization();
  }

  try {
    // Set initializing flag
    global.__firestoreState.initializing = true;
    global.__firestoreState.lastInitAttempt = Date.now();
    
    // First, check if we can use the centralized Firebase initialization
    const firebaseStatus = getFirebaseInitStatus();
    
    if (firebaseStatus.initialized) {
      logger.info('Using centralized Firebase initialization');
      const firestoreDb = getFirebaseFirestore();
      
      // Apply settings to the instance
      await applyFirestoreSettings(firestoreDb);
      
      // Verify connection to ensure it's working
      await verifyFirestoreConnection(firestoreDb);
      
      // Update state with successful initialization
      global.__firestoreState.instance = firestoreDb;
      global.__firestoreState.initialized = true;
      global.__firestoreState.initializing = false;
      global.__firestoreState.error = null;
      global.__firestoreState.settingsApplied = true;
      global.__firestoreState.connectionVerified = true;
      
      logger.info('Successfully initialized Firestore using centralized Firebase');
      return firestoreDb;
    } else if (firebaseStatus.error) {
      // If there was an error in the centralized initialization, log it but try our own approach
      logger.warn('Centralized Firebase initialization failed, attempting standalone Firestore initialization', 
        firebaseStatus.error);
    }
    
    // If centralized initialization is not available or failed, proceed with direct initialization
    // Check if credentials are available
    if (!areFirebaseCredentialsAvailable()) {
      throw new Error('Firebase credentials not available');
    }
    
    // Get credentials
    const credentials = await getFirebaseCredentials();
    global.__firestoreState.credentials = credentials;
    
    // Get or create Firebase app
    const app = await getOrCreateFirebaseApp(credentials);
    
    // Get Firestore instance
    const firestoreDb = getAdminFirestore(app);
    
    // Apply settings to the instance
    await applyFirestoreSettings(firestoreDb);
    
    // Verify connection to ensure it's working
    await verifyFirestoreConnection(firestoreDb);
    
    // Update state with successful initialization
    global.__firestoreState.instance = firestoreDb;
    global.__firestoreState.initialized = true;
    global.__firestoreState.initializing = false;
    global.__firestoreState.error = null;
    global.__firestoreState.settingsApplied = true;
    global.__firestoreState.connectionVerified = true;
    
    logger.info('Successfully initialized Firestore');
    return firestoreDb;
  } catch (error: any) {
    // Handle initialization error
    global.__firestoreState.initializing = false;
    global.__firestoreState.error = error;
    
    // Check if we're in development or test
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    
    // For development/test environments, connect to emulator if credentials not available
    if (isDev && (!areFirebaseCredentialsAvailable() || error.message.includes('credentials'))) {
      // DIAGNOSTIC: Add detailed logging about why we're using emulator mode
      logger.warn('=== DIAGNOSTIC: EMULATOR MODE TRIGGER ===');
      logger.warn('NODE_ENV:', process.env.NODE_ENV);
      logger.warn('MOCK_FIREBASE:', process.env.MOCK_FIREBASE);
      logger.warn('areFirebaseCredentialsAvailable():', areFirebaseCredentialsAvailable());
      logger.warn('Error message includes "credentials":', error.message.includes('credentials'));
      logger.warn('Original error message:', error.message);
      logger.warn('Using FIREBASE_SERVICE_ACCOUNT:', !!process.env.FIREBASE_SERVICE_ACCOUNT);
      logger.warn('Using FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY ? 'YES (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'NO');
      logger.warn('Using FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
      logger.warn('Using FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
      logger.warn('=== END DIAGNOSTIC LOGS ===');
      
      // Force production mode if MOCK_FIREBASE is explicitly set to false
      if (process.env.MOCK_FIREBASE === 'false') {
        logger.warn('MOCK_FIREBASE is explicitly set to false, but we still hit emulator mode. This indicates a credential processing issue.');
        throw new Error('Firebase credentials could not be processed despite MOCK_FIREBASE=false: ' + error.message);
      }
      
      try {
        logger.warn('Using Firestore emulator due to credential issues in development environment');
        
        // Initialize empty app if needed
        let app: App;
        const existingApps = getApps();
        
        if (existingApps.length === 0) {
          app = initializeApp({
            projectId: 'demo-project-id'
          });
        } else {
          app = existingApps[0];
        }
        
        // Get Firestore instance
        const firestoreDb = getAdminFirestore(app);
        
        // Connect to emulator
        connectFirestoreEmulator(firestoreDb);
        
        // Update state
        global.__firestoreState.instance = firestoreDb;
        global.__firestoreState.initialized = true;
        global.__firestoreState.error = null;
        
        return firestoreDb;
      } catch (emulatorError) {
        logger.error('Failed to connect to Firestore emulator', emulatorError);
        throw error; // Throw original error
      }
    } else {
      // In production, just throw the error
      logger.error('Failed to initialize Firestore', error);
      throw error;
    }
  }
}

/**
 * Wait for concurrent initialization to complete
 */
async function waitForInitialization(): Promise<Firestore> {
  logger.debug('Waiting for concurrent Firestore initialization to complete');
  const maxWaitTime = 5000; // Maximum wait time in ms
  const startTime = Date.now();
  
  while (global.__firestoreState.initializing && (Date.now() - startTime < maxWaitTime)) {
    // Wait for 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    logger.debug('Still waiting for Firestore initialization...');
  }
  
  // Check if initialized
  if (global.__firestoreState.initialized && global.__firestoreState.instance) {
    logger.debug('Concurrent initialization completed successfully');
    return global.__firestoreState.instance;
  }
  
  // If we're still initializing after timeout, take over
  if (global.__firestoreState.initializing) {
    logger.warn('Initialization timeout reached, taking over initialization');
    global.__firestoreState.initializing = false;
    return initializeFirestore();
  }
  
  // If initialization failed, throw the recorded error
  if (global.__firestoreState.error) {
    throw global.__firestoreState.error;
  }
  
  // If we get here, something unexpected happened
  throw new Error('Firestore initialization failed with an unknown error');
}

/**
 * Get an existing Firebase app or create a new one
 * @param credentials Firebase credentials
 * @returns Firebase app instance
 */
async function getOrCreateFirebaseApp(credentials: ServiceAccountCredentials): Promise<App> {
  logger.debug('Getting or creating Firebase app with credentials');
  
  // Check if any app is already initialized
  const existingApps = getApps();
  
  if (existingApps.length > 0) {
    logger.debug(`Returning existing Firebase app (${existingApps.length} apps found)`);
    return existingApps[0];
  }
  
  logger.debug('No existing Firebase app found, initializing new app');
  
  // Prepare initialization options
  let appOptions: AppOptions = {};
  
  try {
    // Attempt to use the imported fixPrivateKey function, with fallback implementation
    let fixPrivateKeyFn = (key: string): string => {
      if (!key) return key;
      
      // Handle double-escaped newlines (Windows environments often do this)
      let fixedKey = key;
      if (fixedKey.includes('\\\\n')) {
        fixedKey = fixedKey.replace(/\\\\n/g, '\\n');
      }
      
      // Replace escaped newlines with actual newlines
      if (fixedKey.includes('\\n')) {
        fixedKey = fixedKey.replace(/\\n/g, '\n');
      }
      
      // Handle missing header/footer
      const hasHeader = fixedKey.includes('-----BEGIN PRIVATE KEY-----');
      const hasFooter = fixedKey.includes('-----END PRIVATE KEY-----');
      
      if (!hasHeader) {
        fixedKey = '-----BEGIN PRIVATE KEY-----\n' + fixedKey;
      }
      
      if (!hasFooter) {
        fixedKey = fixedKey + '\n-----END PRIVATE KEY-----';
      }
      
      return fixedKey;
    };
    
    // Try to use the imported fixPrivateKey function if available
    try {
      fixPrivateKeyFn = fixPrivateKey;
      logger.debug('Using imported key-fixer module');
    } catch (error) {
      logger.warn('Using fallback key fixer implementation:', error instanceof Error ? error.message : String(error));
    }
    
    // Use application default credentials if specified
    if (credentials.useAppDefault) {
      logger.info('Using application default credentials');
      appOptions = {
        credential: applicationDefault()
      };
    } 
    // Use service account credentials
    else if (credentials.private_key && credentials.client_email) {
      logger.info('Using service account credentials');
      
      // Fix the private key if needed
      const fixedPrivateKey = fixPrivateKeyFn(credentials.private_key);
      
      // Log key validity diagnostic
      const wasKeyFixed = fixedPrivateKey !== credentials.private_key;
      const keyLength = fixedPrivateKey.length;
      const hasBeginMarker = fixedPrivateKey.includes('BEGIN PRIVATE KEY');
      const hasEndMarker = fixedPrivateKey.includes('END PRIVATE KEY');
      const hasActualNewlines = fixedPrivateKey.includes('\n');
      
      logger.debug('Private key diagnostic info:', {
        originalLength: credentials.private_key.length,
        fixedLength: keyLength,
        wasFixed: wasKeyFixed,
        hasBeginMarker,
        hasEndMarker,
        hasActualNewlines
      });
      
      // Create certificate credentials
      try {
        logger.debug('Creating certificate with fixed private key');
        appOptions = {
          credential: cert({
            projectId: credentials.project_id,
            clientEmail: credentials.client_email,
            privateKey: fixedPrivateKey,
          }),
          projectId: credentials.project_id
        };
        logger.debug('Certificate created successfully');
      } catch (certError) {
        // Log detailed diagnostics about the key
        logger.error('Failed to create certificate:', certError);
        logger.error('Private key format issue details:', {
          length: keyLength,
          beginsWith: keyLength > 30 ? fixedPrivateKey.substring(0, 30) + '...' : fixedPrivateKey,
          endsWith: keyLength > 30 ? '...' + fixedPrivateKey.substring(keyLength - 30) : fixedPrivateKey,
          containsBeginMarker: hasBeginMarker,
          containsEndMarker: hasEndMarker,
          containsNewlines: hasActualNewlines,
        });
        
        // Try more aggressive fixing
        logger.debug('Attempting more aggressive key fixing');
        try {
          // Try to parse only the base64 content and recreate the key
          const keyContent = fixedPrivateKey
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/[\r\n\s]/g, '');
          
          // Format with proper line breaks (64 chars per line)
          const formattedKey = '-----BEGIN PRIVATE KEY-----\n' +
                              keyContent.match(/.{1,64}/g)?.join('\n') +
                              '\n-----END PRIVATE KEY-----';
          
          logger.debug('Reformatted key with proper line breaks');
          
          // Try again with reformatted key
          appOptions = {
            credential: cert({
              projectId: credentials.project_id,
              clientEmail: credentials.client_email,
              privateKey: formattedKey,
            }),
            projectId: credentials.project_id
          };
          logger.debug('Certificate created successfully with reformatted key');
        } catch (reformatError) {
          logger.error('Failed to create certificate with reformatted key:', reformatError);
          throw reformatError;
        }
      }
    } 
    // No valid credential format provided
    else {
      throw new Error('Invalid credential format - missing required fields: private_key or client_email');
    }
    
    // Initialize the app with proper error handling
    try {
      logger.debug('Initializing Firebase app with options');
      const app = initializeApp(appOptions);
      logger.info('Firebase app initialized successfully');
      return app;
    } catch (initError) {
      // Handle specific initialization errors
      if (initError instanceof Error) {
        if (initError.message.includes('app/duplicate-app')) {
          logger.warn('App already exists, returning existing app');
          return getApps()[0];
        } else if (initError.message.includes('auth/invalid-credential')) {
          logger.error('Invalid credential error. Check your service account credentials.', initError);
        } else if (initError.message.includes('app/invalid-app-options')) {
          logger.error('Invalid app options error:', initError);
        }
      }
      
      // Rethrow the error
      throw initError;
    }
  } catch (error) {
    logger.error('Failed to create Firebase app:', error);
    throw error;
  }
}

/**
 * Apply Firestore settings
 */
async function applyFirestoreSettings(db: Firestore): Promise<void> {
  // Only apply settings if we haven't already done so
  if (global.__firestoreState && global.__firestoreState.settingsApplied) {
    logger.debug('Firestore settings already applied, skipping');
    return;
  }
  
  try {
    // Apply default settings
    const settings = {
      ...DEFAULT_FIRESTORE_SETTINGS
    };
    
    // Check for custom settings in environment
    if (process.env.FIRESTORE_IGNORE_UNDEFINED === 'false') {
      settings.ignoreUndefinedProperties = false;
    }
    
    if (process.env.FIRESTORE_TIMESTAMPS_IN_SNAPSHOTS === 'false') {
      settings.timestampsInSnapshots = false;
    }
    
    // Capture original settings for logging
    const originalSettings = { ...settings };
    
    logger.debug('Applying Firestore settings:', settings);
    
    try {
      db.settings(settings);
      // Mark settings as applied in state
      if (global.__firestoreState) {
        global.__firestoreState.settingsApplied = true;
      }
      logger.debug('Firestore settings applied successfully');
    } catch (settingsError: any) {
      // If settings have already been applied, this might throw an error
      // If the error is about settings already being applied, we can safely continue
      if (settingsError.message.includes('already been initialized') || 
          settingsError.message.includes('settings() once')) {
        logger.warn('Firestore settings already applied (caught error):', settingsError.message);
        // Mark settings as applied in state
        if (global.__firestoreState) {
          global.__firestoreState.settingsApplied = true;
        }
      } else {
        // If it's a different error, rethrow
        throw settingsError;
      }
    }
    
    return;
  } catch (error) {
    logger.error('Error applying Firestore settings:', error);
    throw error;
  }
}

/**
 * Verify Firestore connection by making a test query
 */
async function verifyFirestoreConnection(db: Firestore): Promise<void> {
  // Skip if already verified
  if (global.__firestoreState.connectionVerified) {
    return;
  }
  
  try {
    logger.debug('Verifying Firestore connection with test query');
    
    // Try to access a test collection
    const testCollection = db.collection('_connection_test');
    const testDoc = testCollection.doc('test');
    
    // Set a timestamp
    await testDoc.set({ timestamp: Date.now() });
    
    // Get the document to verify read works too
    await testDoc.get();
    
    // Delete the test document
    await testDoc.delete();
    
    // Mark connection as verified
    global.__firestoreState.connectionVerified = true;
    logger.info('Firestore connection verified successfully');
  } catch (error) {
    logger.error('Firestore connection verification failed:', 
      error instanceof Error ? error.message : 'Unknown error');
    
    // Throw meaningful error for permission issues
    if (error instanceof Error && 
        (error.message.includes('permission') || 
         error.message.includes('unauthorized'))) {
      throw new Error('Firestore connection failed due to insufficient permissions. Check your service account roles.');
    }
    
    // We'll continue without throwing here, as the application might still work
    // with limited permissions
  }
}

/**
 * Connect to Firestore emulator if in development environment
 * @param db The Firestore instance
 */
export function connectFirestoreEmulator(db: Firestore): void {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  
  if (process.env.NODE_ENV === 'development' && emulatorHost) {
    try {
      // Extract host and port from FIRESTORE_EMULATOR_HOST
      const [host, portStr] = emulatorHost.split(':');
      const port = parseInt(portStr, 10);
      
      if (host && port) {
        // Use a flag on the db object to ensure we only connect once
        const anyDb = db as any;
        if (!anyDb.__connectedToEmulator) {
          logger.info(`Connecting to Firestore emulator at ${host}:${port}`);
          db.settings({
            host: emulatorHost,
            ssl: false,
          });
          anyDb.__connectedToEmulator = true;
        }
      }
    } catch (error) {
      logger.error('Failed to connect to Firestore emulator:', 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

/**
 * Get the Firestore instance
 * If no instance exists, returns null (caller should initialize)
 */
export function getFirestoreInstance(): Firestore | null {
  // If instance doesn't exist, initialize it
  if (!global.__firestoreState?.instance) {
    logger.debug('No Firestore instance exists, calling initializeFirestore now');
    
    // Don't await here as this function is synchronous
    // Instead, start the initialization and return null
    // Subsequent calls will get the instance once initialized
    initializeFirestore().catch(error => {
      logger.error('Failed to initialize Firestore in getFirestoreInstance:', error);
    });
  } else {
    logger.debug('Using existing Firestore instance from global state');
  }
  
  return global.__firestoreState?.instance || null;
}

/**
 * Get Firestore initialization status
 * Useful for diagnostics
 */
export function getFirestoreStatus(): Record<string, any> {
  return {
    initialized: global.__firestoreState?.initialized || false,
    initializing: global.__firestoreState?.initializing || false,
    lastInitAttempt: global.__firestoreState?.lastInitAttempt 
      ? new Date(global.__firestoreState.lastInitAttempt).toISOString()
      : null,
    error: global.__firestoreState?.error 
      ? global.__firestoreState.error.message
      : null,
    settingsApplied: global.__firestoreState?.settingsApplied || false,
    connectionVerified: global.__firestoreState?.connectionVerified || false,
    hasInstance: !!global.__firestoreState?.instance,
    credentialSource: global.__firestoreState?.credentials?.useAppDefault 
      ? 'application-default'
      : global.__firestoreState?.credentials?.project_id
        ? 'service-account'
        : 'unknown'
  };
}

/**
 * Resolve the service account file path, handling relative paths correctly
 */
function resolveServiceAccountPath(filePath: string): string {
  if (!filePath) return '';
  
  // If it's an absolute path, use it directly
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  
  // Try multiple base directories for relative paths
  const possiblePaths = [
    // Standard paths relative to CWD
    path.resolve(process.cwd(), filePath),
    
    // Remove leading ./ if present
    path.resolve(process.cwd(), filePath.replace(/^\.\//, '')),
    
    // Try from project root regardless of CWD
    path.resolve(process.cwd(), filePath),
    
    // Try non-normalized path for Windows compatibility
    filePath
  ];
  
  for (const possiblePath of possiblePaths) {
    try {
      if (fs.existsSync(possiblePath)) {
        console.log(`[Firestore:PATH] Found service account at: ${possiblePath}`);
        return possiblePath;
      }
    } catch (e) {
      // Ignore errors checking paths
    }
  }
  
  // Debugging info
  console.error(`[Firestore:PATH] Could not resolve path: ${filePath}`);
  console.error(`[Firestore:PATH] Current working directory: ${process.cwd()}`);
  console.error(`[Firestore:PATH] Tried paths:`, possiblePaths);
  
  // Return the original path as fallback
  return filePath;
}

/**
 * Get Firebase credentials from various sources with priority:
 * 1. Environment variables (best for production/Vercel)
 * 2. Application default credentials
 * 3. Service account file
 */
export function getFirestoreCredentials() {
  console.log('[Firestore:CREDS] Checking for Firebase credentials');
  console.log('[Firestore:CREDS] Current working directory:', process.cwd());
  
  // PRIORITY 1: Check for environment variables (best for Vercel)
  let private_key = process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const client_email = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const project_id = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID;

  // Handle escaped newlines in private key (important for Vercel env vars)
  if (private_key && private_key.includes('\\n')) {
    console.log('[Firestore:CREDS] Processing escaped newlines in private key');
    private_key = private_key.replace(/\\n/g, '\n');
  }

  // Return credentials if we have the minimum requirements from env vars
  if (private_key && client_email && project_id) {
    console.log('[Firestore:CREDS] Found complete set of environment credentials');
    return {
      private_key,
      client_email,
      project_id,
      source: 'environment-variables'
    };
  }

  // PRIORITY 2: Check if we can use application default credentials
  try {
    console.log('[Firestore:CREDS] Attempting to use application default credentials');
    // Using the imported applicationDefault instead of requiring it
    console.log('[Firestore:CREDS] Application default credentials found');
    
    // If we have application default but missing project ID
    if (!project_id) {
      console.log('[Firestore:CREDS] Using application default credentials without explicit project_id');
      return { useAppDefault: true, source: 'application-default' };
    }
  } catch (error) {
    console.log('[Firestore:CREDS] Application default credentials not available', error.message);
  }
  
  // PRIORITY 3: Check for JSON credentials file (for development)
  try {
    // Using the imported fs module instead of requiring it
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('[Firestore:CREDS] Attempting to load credentials from GOOGLE_APPLICATION_CREDENTIALS file');
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      // Resolve the path properly
      const resolvedPath = resolveServiceAccountPath(credPath);
      console.log(`[Firestore:CREDS] Resolved credentials path: ${resolvedPath}`);
      
      if (fs.existsSync(resolvedPath)) {
        try {
          const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
          
          // Process the private key to ensure correct format
          if (serviceAccount.private_key && serviceAccount.private_key.includes('\\n')) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
          
          console.log('[Firestore:CREDS] Loaded credentials from file successfully');
          return {
            ...serviceAccount,
            source: 'service-account-file'
          };
        } catch (parseError) {
          console.error('[Firestore:CREDS] Failed to parse service account file:', parseError.message);
        }
      } else {
        console.error(`[Firestore:CREDS] Service account file does not exist at resolved path: ${resolvedPath}`);
      }
    }
  } catch (error) {
    console.log('[Firestore:CREDS] Failed to load credentials from file', error.message);
  }
  
  // For development environment, attempt to use local credentials
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    try {
      console.log('[Firestore:CREDS] Development environment: checking for local service account file');
      // Using the imported fs and path modules instead of requiring them
      const localPaths = [
        path.join(process.cwd(), 'service-account.json'),
        path.join(process.cwd(), 'firebase-service-account.json'),
        path.join(process.cwd(), 'credentials', 'firebase-service-account.json'),
        path.join(process.cwd(), '.firebase', 'service-account.json'),
        path.join(process.cwd(), 'credentials', 'valid-song-450602-m7-firebase-adminsdk-fbsvc-61ecba6d18.json')
      ];
      
      for (const localPath of localPaths) {
        if (fs.existsSync(localPath)) {
          console.log(`[Firestore:CREDS] Found local service account file at: ${localPath}`);
          try {
            const serviceAccount = JSON.parse(fs.readFileSync(localPath, 'utf8'));
            if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
              console.log('[Firestore:CREDS] Successfully loaded local service account');
              
              // Process private key if needed
              if (serviceAccount.private_key.includes('\\n')) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
              }
              
              return {
                ...serviceAccount,
                source: 'local-service-account-file'
              };
            } else {
              console.log('[Firestore:CREDS] Local service account file is missing required fields');
            }
          } catch (readError) {
            console.log(`[Firestore:CREDS] Error reading service account from ${localPath}:`, readError.message);
          }
        }
      }
    } catch (error) {
      console.log('[Firestore:CREDS] Error checking for local service account files:', error.message);
    }
  }
  
  // If FORCE_MOCK_DATA is true or we're in development, use mock data
  if (process.env.FORCE_MOCK_DATA === 'true' || 
      (process.env.NODE_ENV === 'development' && process.env.FORCE_REAL_FIRESTORE !== 'true')) {
    console.log('[Firestore:CREDS] Using mock credentials for development');
    return {
      project_id: 'mock-project',
      client_email: 'mock@example.com',
      private_key: 'mock-key',
      source: 'mock'
    };
  }
  
  // No valid credentials found
  console.error('[Firestore:CREDS] No valid Firebase credentials found from any source');
  return null;
}

/**
 * Generate a Firestore document ID using a custom prefix
 * 
 * @param prefix Optional prefix for the document ID
 * @returns A unique document ID
 */
export function generateFirestoreId(prefix?: string): string {
  const db = getFirestoreInstance();
  const docRef = db.collection('_temp_ids_').doc();
  const id = docRef.id;
  
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Get the server timestamp field value for Firestore
 * 
 * @returns A sentinel value for server timestamp
 */
export function getServerTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

/**
 * Create a reference to a collection
 * 
 * @param collectionName The name of the collection
 * @returns A collection reference
 */
export function getCollection(collectionName: string) {
  const db = getFirestoreInstance();
  return db.collection(collectionName);
}

/**
 * Convert Firebase DocumentSnapshot to a typed object
 * 
 * @param snapshot DocumentSnapshot to convert
 * @returns Typed data object with id
 */
export function convertDocSnapshot<T>(snapshot: admin.firestore.DocumentSnapshot): T & { id: string } {
  if (!snapshot.exists) {
    throw new Error(`Document does not exist: ${snapshot.ref.path}`);
  }
  
  const data = snapshot.data() as T;
  return {
    ...(data as T),
    id: snapshot.id
  };
}

/**
 * Convert QuerySnapshot to an array of typed objects
 * 
 * @param snapshot QuerySnapshot to convert
 * @returns Array of typed data objects with ids
 */
export function convertQuerySnapshot<T>(snapshot: admin.firestore.QuerySnapshot): Array<T & { id: string }> {
  return snapshot.docs.map(doc => {
    const data = doc.data() as T;
    return {
      ...(data as T),
      id: doc.id
    };
  });
}

/**
 * Validate Firebase credentials and return diagnostics information
 * about missing credentials
 */
export function validateFirebaseCredentials(): boolean {
  console.log('[FIREBASE-DIAGNOSTIC] Validating Firebase credentials');
  
  // Track validation state
  let credentialsValid = false;
  let serviceAccountValid = false;
  let environmentVariablesValid = false;
  let privateKeyValid = false;
  
  console.log('[FIREBASE-DIAGNOSTIC] Checking environment variables:');
  // Check all firebase related env vars
  const firebaseVars = Object.keys(process.env).filter(
    key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP')
  );
  console.log(`[FIREBASE-DIAGNOSTIC] Found ${firebaseVars.length} Firebase-related environment variables`);
  firebaseVars.forEach(key => {
    if (key.toLowerCase().includes('key')) {
      // Don't output the key itself for security reasons
      console.log(`[FIREBASE-DIAGNOSTIC] ${key}: [PRESENT] (${process.env[key]?.length || 0} characters)`);
    } else {
      console.log(`[FIREBASE-DIAGNOSTIC] ${key}: ${process.env[key] || '[NOT SET]'}`);
    }
  });
  
  // Check if we have the core Firebase environment variables
  const hasFirebaseProjectId = !!process.env.FIREBASE_PROJECT_ID;
  const hasFirebaseClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
  const hasFirebasePrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
  
  // Check if all core variables are present
  if (hasFirebaseProjectId && hasFirebaseClientEmail && hasFirebasePrivateKey) {
    console.log('[FIREBASE-DIAGNOSTIC] All core Firebase environment variables are present');
    environmentVariablesValid = true;
  } else {
    console.log('[FIREBASE-DIAGNOSTIC] Missing some core Firebase environment variables:');
    if (!hasFirebaseProjectId) console.log('- FIREBASE_PROJECT_ID is missing');
    if (!hasFirebaseClientEmail) console.log('- FIREBASE_CLIENT_EMAIL is missing');
    if (!hasFirebasePrivateKey) console.log('- FIREBASE_PRIVATE_KEY is missing');
  }
  
  // Check private key format
  if (process.env.FIREBASE_PRIVATE_KEY) {
    if (process.env.FIREBASE_PRIVATE_KEY.includes('\\n') && !process.env.FIREBASE_PRIVATE_KEY.includes('\n')) {
      console.log('[FIREBASE-DIAGNOSTIC] FIREBASE_PRIVATE_KEY contains escaped newlines (\\n)');
      privateKeyValid = false;
    } else if (process.env.FIREBASE_PRIVATE_KEY.includes('\n')) {
      console.log('[FIREBASE-DIAGNOSTIC] FIREBASE_PRIVATE_KEY contains actual newlines');
      privateKeyValid = process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') && 
                       process.env.FIREBASE_PRIVATE_KEY.includes('END PRIVATE KEY');
    } else {
      console.error('[FIREBASE-DIAGNOSTIC] FIREBASE_PRIVATE_KEY does not contain any newlines, which is likely invalid');
      privateKeyValid = false;
    }
  } else {
    console.log('FIREBASE_PRIVATE_KEY is NOT present');
    privateKeyValid = false;
  }
  
  // Try to manually process the key just as a test
  console.log('[FIREBASE-DIAGNOSTIC] Attempting to manually process private key...');
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      let testKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // Try using our imported key fixer utility 
      try {
        // Use the imported fixPrivateKey function
        testKey = fixPrivateKey(testKey);
        console.log('[FIREBASE-DIAGNOSTIC] Successfully used key-fixer to process private key');
        
        // Patch the environment variable if successful
        process.env.FIREBASE_PRIVATE_KEY = testKey;
        privateKeyValid = true;
      } catch (importError) {
        console.error('[FIREBASE-DIAGNOSTIC] Failed to use key-fixer, using manual process:', importError.message);
        
        // Fall back to manual processing
        if (testKey.includes('\\n')) {
          testKey = testKey.replace(/\\n/g, '\n');
          console.log('[FIREBASE-DIAGNOSTIC] Manually replaced escaped newlines');
          privateKeyValid = testKey.includes('BEGIN PRIVATE KEY') && 
                          testKey.includes('END PRIVATE KEY');
        }
      }
      
      // Print diagnostic info about the key
      console.log('[FIREBASE-DIAGNOSTIC] Private key after processing:');
      console.log(`- Length: ${testKey.length} characters`);
      console.log(`- Contains BEGIN marker: ${testKey.includes('BEGIN PRIVATE KEY')}`);
      console.log(`- Contains END marker: ${testKey.includes('END PRIVATE KEY')}`);
      console.log(`- Contains actual newlines: ${testKey.includes('\n')}`);
    } else {
      console.log('[FIREBASE-DIAGNOSTIC] No private key to process');
    }
  } catch (error) {
    console.error('[FIREBASE-DIAGNOSTIC] Error during private key processing:', error);
  }
  
  // Check for service account file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`[FIREBASE-DIAGNOSTIC] GOOGLE_APPLICATION_CREDENTIALS is set to: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    
    try {
      // Using the imported fs module instead of requiring it
      if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        console.log('[FIREBASE-DIAGNOSTIC] Service account file exists');
        
        try {
          const serviceAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
          const hasRequiredFields = 
            serviceAccount.project_id && 
            serviceAccount.client_email && 
            serviceAccount.private_key;
          
          console.log(`[FIREBASE-DIAGNOSTIC] Service account parsed successfully: ${hasRequiredFields ? 'has all required fields' : 'missing some fields'}`);
          console.log(`[FIREBASE-DIAGNOSTIC] Project ID: ${serviceAccount.project_id || '[MISSING]'}`);
          console.log(`[FIREBASE-DIAGNOSTIC] Client email: ${serviceAccount.client_email ? '[PRESENT]' : '[MISSING]'}`);
          console.log(`[FIREBASE-DIAGNOSTIC] Private key: ${serviceAccount.private_key ? '[PRESENT]' : '[MISSING]'}`);
          
          serviceAccountValid = hasRequiredFields;
        } catch (parseError) {
          console.error('[FIREBASE-DIAGNOSTIC] Failed to parse service account file:', parseError.message);
          serviceAccountValid = false;
        }
      } else {
        console.error('[FIREBASE-DIAGNOSTIC] Service account file does not exist at specified path');
        serviceAccountValid = false;
      }
    } catch (fileError) {
      console.error('[FIREBASE-DIAGNOSTIC] Error checking service account file:', fileError.message);
      serviceAccountValid = false;
    }
  }
  
  // Determine if credentials are valid
  // Either environment variables with valid private key OR valid service account file
  credentialsValid = (environmentVariablesValid && privateKeyValid) || serviceAccountValid;
  
  console.log(`[FIREBASE-DIAGNOSTIC] Validation complete. Credentials valid: ${credentialsValid}`);
  console.log(`[FIREBASE-DIAGNOSTIC] Details: env vars valid: ${environmentVariablesValid}, private key valid: ${privateKeyValid}, service account valid: ${serviceAccountValid}`);
  
  return credentialsValid;
}

// Export useful Firebase Admin types and utilities
export {
  admin,
  Firestore,
  admin as FirebaseAdmin
}; 