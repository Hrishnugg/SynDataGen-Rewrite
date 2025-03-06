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
// Import dotenv using require syntax instead of ES modules
const dotenv = require('dotenv');

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
  // Check for existing apps
  const apps = getApps();
  logger.debug(`${apps.length} Firebase apps currently initialized`);
  
  // If we have an existing app, return it
  if (apps.length > 0) {
    logger.debug(`Using existing Firebase app: ${apps[0].name}`);
    return apps[0];
  }
  
  // Initialize a new app
  try {
    const initOptions: AppOptions = {};
    
    // Configure credentials based on what we have
    if (credentials.useAppDefault) {
      logger.info('Initializing Firebase app with application default credentials');
      initOptions.credential = applicationDefault();
    } else if (credentials.private_key && credentials.client_email) {
      logger.info('Initializing Firebase app with service account credentials');
      
      // Process the private key to ensure it's properly formatted
      let privateKey = credentials.private_key;
      
      try {
        // Instead of trying to import the module, implement key fixing inline
        const fixPrivateKey = (key) => {
          if (!key) {
            console.error('[KeyFixer] Key is undefined or empty');
            throw new Error('Cannot fix an undefined or empty private key');
          }
          
          // Start with the original key
          let processedKey = key;
          
          // Remove surrounding quotes if present
          if (processedKey.startsWith('"') && processedKey.endsWith('"')) {
            logger.debug('Removing surrounding quotes from private key');
            processedKey = processedKey.slice(1, -1);
          }
          
          // Replace escaped newlines with actual newlines
          if (processedKey.includes('\\n')) {
            logger.debug('Replacing escaped newlines in private key');
            processedKey = processedKey.replace(/\\n/g, '\n');
          }
          
          // Check if key is properly formatted
          const isFormatted = processedKey.startsWith('-----BEGIN PRIVATE KEY-----') && 
                            processedKey.endsWith('-----END PRIVATE KEY-----') &&
                            processedKey.includes('\n');
                            
          // Return if already properly formatted
          if (isFormatted) {
            return processedKey;
          }
          
          // Try to reformat the key
          logger.debug('Key not properly formatted, attempting to reformat');
          // Extract base64 content
          const base64Content = processedKey.replace(/[^A-Za-z0-9+/=]/g, '');
          // Create properly formatted key
          return `-----BEGIN PRIVATE KEY-----\n${base64Content}\n-----END PRIVATE KEY-----`;
        };
        privateKey = fixPrivateKey(privateKey);
        logger.debug('Private key processed successfully with key-fixer');
      } catch (keyFixError) {
        logger.error('Error processing private key with key-fixer:', keyFixError);
        
        // Fallback to manual processing if key-fixer fails
        logger.debug('Falling back to manual key processing');
        
        // Remove surrounding quotes if present
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          logger.debug('Removing surrounding quotes from private key');
          privateKey = privateKey.slice(1, -1);
        }
        
        // Replace escaped newlines with actual newlines
        if (privateKey.includes('\\n')) {
          logger.debug('Replacing escaped newlines in private key');
          privateKey = privateKey.replace(/\\n/g, '\n');
        }
        
        // Check if key is properly formatted
        const isFormatted = privateKey.startsWith('-----BEGIN PRIVATE KEY-----') && 
                           privateKey.endsWith('-----END PRIVATE KEY-----') &&
                           privateKey.includes('\n');
                           
        // Try to reformat the key if it's not properly formatted
        if (!isFormatted) {
          logger.warn('Private key is not properly formatted, attempting to reformat');
          
          // Check if we just have the base64 part without the markers and newlines
          const base64Content = privateKey.replace(/[^A-Za-z0-9+/=]/g, '');
          privateKey = `-----BEGIN PRIVATE KEY-----\n${base64Content}\n-----END PRIVATE KEY-----`;
          
          // Log reformatting result
          logger.debug('Key reformatted. Now starts with:', privateKey.substring(0, 30));
          logger.debug('Key ends with:', privateKey.substring(privateKey.length - 30));
        }
      }
      
      // Use the processed private key
      initOptions.credential = cert({
        projectId: credentials.project_id,
        clientEmail: credentials.client_email,
        privateKey: privateKey
      });
    } else {
      throw new Error('Invalid credentials: missing required fields');
    }
    
    // Set project ID if available
    if (credentials.project_id) {
      initOptions.projectId = credentials.project_id;
      logger.debug(`Setting project ID: ${credentials.project_id}`);
    }
    
    // Initialize the app
    const app = initializeApp(initOptions);
    logger.info('Firebase app initialized successfully:', app.name);
    return app;
  } catch (error) {
    // Provide detailed error diagnostics
    logger.error('Firebase app initialization error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Enhanced error diagnostics for common issues
    if (error instanceof Error) {
      if (error.message.includes('credential')) {
        throw new Error(`Firebase credential error: ${error.message}. Check your service account key format and permissions.`);
      } else if (error.message.includes('project')) {
        throw new Error(`Firebase project configuration error: ${error.message}. Check your project ID and make sure the project exists.`);
      } else if (error.message.includes('already exists')) {
        // This is not really an error, we can recover
        logger.warn('Firebase app already initialized in another context');
        const existingApps = getApps();
        if (existingApps.length > 0) {
          return existingApps[0];
        }
      }
    }
    
    throw error;
  }
}

/**
 * Apply Firestore settings
 */
async function applyFirestoreSettings(db: Firestore): Promise<void> {
  try {
    // Use the default settings
    const settings = DEFAULT_FIRESTORE_SETTINGS;
    logger.debug('Applying Firestore settings:', JSON.stringify(settings));
    
    // Correctly access the settings method
    if (typeof db.settings === 'function') {
      db.settings(settings);
      logger.info('Firestore settings applied successfully');
    } else {
      logger.warn('Firestore settings method not available, using default settings');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error applying Firestore settings:', errorMessage);
    
    // If settings are already applied (which can happen in certain Firebase SDK versions),
    // we'll just mark it as applied and continue
    if (errorMessage.includes('settings is not defined')) {
      logger.warn('Using default Firestore settings (settings method not available)');
    } else if (errorMessage.includes('settings() can only be called once')) {
      logger.info('Firestore settings already applied in this instance');
    } else {
      // For other errors, we'll still mark settings as applied to allow the app to continue
      // This prevents the initialization from failing completely due to settings issues
      logger.warn(`Unable to apply Firestore settings: ${errorMessage}. Continuing with defaults.`);
    }
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
 * Get Firestore credentials from environment
 */
function getFirestoreCredentials() {
  console.log('Checking environment variables for Firebase credentials');
  console.log('Environment variables available:', Object.keys(process.env).filter(key => 
    key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP')
  ));
  
  // Check for environment variables
  let private_key = process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const client_email = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const project_id = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID;

  // Handle escaped newlines in private key
  if (private_key && private_key.includes('\\n')) {
    console.log('Processing escaped newlines in private key');
    private_key = private_key.replace(/\\n/g, '\n');
  }

  // Return credentials if we have the minimum requirements
  if (private_key && client_email && project_id) {
    console.log('Found complete set of environment credentials');
    return {
      private_key,
      client_email,
      project_id
    };
  }

  // Look for alternative credential sources
  if (!private_key || !client_email || !project_id) {
    // Check if we can use application default credentials
    try {
      console.log('Attempting to use application default credentials');
      const { applicationDefault } = require('firebase-admin/app');
      const appDefaultCred = applicationDefault();
      console.log('Application default credentials found');
      
      // If we have application default but missing project ID
      if (!project_id && appDefaultCred) {
        console.log('Using application default credentials without explicit project_id');
        return { useAppDefault: true };
      }
    } catch (error) {
      console.log('Application default credentials not available', error.message);
    }
    
    // Check for JSON credentials file
    try {
      const fs = require('fs');
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('Attempting to load credentials from GOOGLE_APPLICATION_CREDENTIALS file');
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (fs.existsSync(credPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
          console.log('Loaded credentials from file successfully');
          return serviceAccount;
        }
      }
    } catch (error) {
      console.log('Failed to load credentials from file', error.message);
    }
    
    // For development environment, attempt to use local credentials
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('Development environment: checking for local service account file');
        const fs = require('fs');
        const localPaths = [
          './firebase-service-account.json',
          './service-account.json',
          './.firebase/service-account.json'
        ];
        
        for (const path of localPaths) {
          if (fs.existsSync(path)) {
            console.log(`Found local service account at ${path}`);
            const serviceAccount = JSON.parse(fs.readFileSync(path, 'utf8'));
            return serviceAccount;
          }
        }
      } catch (error) {
        console.log('Failed to load local service account', error.message);
      }
    }
  
    // Log detailed information about missing credentials
    const missingVars = [];
    if (!private_key) missingVars.push('FIREBASE_PRIVATE_KEY/GOOGLE_PRIVATE_KEY');
    if (!client_email) missingVars.push('FIREBASE_CLIENT_EMAIL/GOOGLE_CLIENT_EMAIL');
    if (!project_id) missingVars.push('FIREBASE_PROJECT_ID/GOOGLE_PROJECT_ID/GCP_PROJECT_ID');
    
    throw new Error(`Missing Firestore credentials in environment variables: ${missingVars.join(', ')}`);
  }

  // Parse private key - it might be stored with escaped newlines
  let parsedKey = private_key;
  if (parsedKey.includes('\\n')) {
    console.log('Found escaped newlines in private key, parsing...');
    parsedKey = parsedKey.replace(/\\n/g, '\n');
  }

  console.log(`Successfully loaded Firebase credentials for project: ${project_id}`);
  
  return {
    private_key: parsedKey,
    client_email,
    project_id
  };
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
 * Validate Firebase credentials on startup
 * This function should be called during app initialization to provide immediate feedback
 * about missing credentials
 */
export function validateFirebaseCredentials() {
  console.log('Validating Firebase credentials on startup...');
  
  // Try to load dotenv again to make sure it's loaded
  dotenv.config();
  
  console.log('[FIREBASE-DIAGNOSTIC] Starting credential validation');
  console.log('[FIREBASE-DIAGNOSTIC] Environment:', process.env.NODE_ENV);
  console.log('[FIREBASE-DIAGNOSTIC] MOCK_FIREBASE:', process.env.MOCK_FIREBASE);
  
  // Log available environment variables (filtered for security)
  const envKeys = Object.keys(process.env);
  const firebaseKeys = envKeys.filter(
    key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP')
  );
  
  console.log(`Found ${firebaseKeys.length} potential Firebase-related environment variables:`, 
    firebaseKeys.map(k => `${k}: ${k.includes('KEY') ? '[REDACTED]' : (process.env[k] ? 'present' : 'empty')}`));
  
  // Enhanced logging for critical variables with value lengths
  const critical_keys = [
    'FIREBASE_PROJECT_ID', 
    'GCP_PROJECT_ID', 
    'GOOGLE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'GOOGLE_CLIENT_EMAIL'
  ];
  
  critical_keys.forEach(key => {
    if (process.env[key]) {
      console.log(`${key} is present with length: ${process.env[key].length}`);
    } else {
      console.log(`${key} is NOT present`);
    }
  });
  
  // Check for private key specifically
  if (process.env.FIREBASE_PRIVATE_KEY) {
    console.log('FIREBASE_PRIVATE_KEY is present with length:', process.env.FIREBASE_PRIVATE_KEY.length);
    console.log('FIREBASE_PRIVATE_KEY starts with:', process.env.FIREBASE_PRIVATE_KEY.substring(0, 30) + '...');
    
    // Check if private key is properly formatted
    if (!process.env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') || 
        !process.env.FIREBASE_PRIVATE_KEY.includes('END PRIVATE KEY')) {
      console.error('[FIREBASE-DIAGNOSTIC] FIREBASE_PRIVATE_KEY appears to be malformed - missing BEGIN/END markers');
      
      // If the key might be surrounded by quotes, log that
      if (process.env.FIREBASE_PRIVATE_KEY.startsWith('"') && process.env.FIREBASE_PRIVATE_KEY.endsWith('"')) {
        console.error('[FIREBASE-DIAGNOSTIC] FIREBASE_PRIVATE_KEY appears to be surrounded by quotes, which can cause issues');
      }
    }
    
    // Check if private key has escaped newlines
    if (process.env.FIREBASE_PRIVATE_KEY.includes('\\n')) {
      console.log('[FIREBASE-DIAGNOSTIC] FIREBASE_PRIVATE_KEY contains escaped newlines (\\n)');
    } else if (process.env.FIREBASE_PRIVATE_KEY.includes('\n')) {
      console.log('[FIREBASE-DIAGNOSTIC] FIREBASE_PRIVATE_KEY contains actual newlines');
    } else {
      console.error('[FIREBASE-DIAGNOSTIC] FIREBASE_PRIVATE_KEY does not contain any newlines, which is likely invalid');
    }
  } else {
    console.log('FIREBASE_PRIVATE_KEY is NOT present');
  }
  
  // Try to manually process the key just as a test
  console.log('[FIREBASE-DIAGNOSTIC] Attempting to manually process private key...');
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      let testKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // Try using our key fixer utility first
      try {
        // We need to require the module in a way that doesn't rely on '@/' paths
        // since those are Next.js specific and might not be available in all contexts
        const path = require('path');
        const keyFixerPath = path.join(process.cwd(), 'src', 'lib', 'key-fixer.ts');
        
        // Try to dynamically load the module
        // This is a bit tricky because we're in a TypeScript context
        console.log('[FIREBASE-DIAGNOSTIC] Attempting to load key-fixer module');
        
        let keyFixer;
        try {
          // Try TypeScript path first
          keyFixer = require(keyFixerPath);
        } catch (tsImportError) {
          // Try JavaScript path as fallback
          try {
            keyFixer = require(keyFixerPath.replace('.ts', '.js'));
          } catch (jsImportError) {
            // Both attempts failed, rethrow first error
            throw tsImportError;
          }
        }
        
        if (keyFixer && typeof keyFixer.fixPrivateKey === 'function') {
          testKey = keyFixer.fixPrivateKey(testKey);
          console.log('[FIREBASE-DIAGNOSTIC] Successfully used key-fixer to process private key');
          
          // Patch the environment variable if successful
          process.env.FIREBASE_PRIVATE_KEY = testKey;
        } else {
          throw new Error('key-fixer module loaded but fixPrivateKey function not found');
        }
      } catch (importError) {
        console.log('[FIREBASE-DIAGNOSTIC] Unable to use key-fixer module, falling back to manual processing:', importError.message);
        
        // Fallback to manual processing since key-fixer couldn't be loaded
        // Remove quotes if present
        if (testKey.startsWith('"') && testKey.endsWith('"')) {
          testKey = testKey.slice(1, -1);
          console.log('[FIREBASE-DIAGNOSTIC] Removed surrounding quotes from key test');
        }
        
        // Replace escaped newlines
        if (testKey.includes('\\n')) {
          testKey = testKey.replace(/\\n/g, '\n');
          console.log('[FIREBASE-DIAGNOSTIC] Replaced escaped newlines in key test');
        }
      }
      
      // Check key validity
      const isValid = testKey.startsWith('-----BEGIN PRIVATE KEY-----') && 
                     testKey.endsWith('-----END PRIVATE KEY-----') &&
                     testKey.includes('\n');
                     
      console.log('[FIREBASE-DIAGNOSTIC] Processed key validity check:', isValid);
      
      // Log the key structure
      if (!isValid) {
        console.log('[FIREBASE-DIAGNOSTIC] Key structural analysis:');
        console.log('- Starts with BEGIN marker:', testKey.startsWith('-----BEGIN PRIVATE KEY-----'));
        console.log('- Ends with END marker:', testKey.endsWith('-----END PRIVATE KEY-----'));
        console.log('- Contains newlines:', testKey.includes('\n'));
        console.log('- First 5 chars:', testKey.substring(0, 5));
        console.log('- Last 5 chars:', testKey.substring(testKey.length - 5));
      }
      
      // Try a last-resort fix
      if (!isValid) {
        // Sometimes keys are very badly formatted - try a complete reformat
        // This fixes keys missing proper BEGIN/END markers or newlines
        console.log('[FIREBASE-DIAGNOSTIC] Attempting last-resort key format fix...');
        
        // Strip all non-base64 characters
        const base64Content = testKey.replace(/[^A-Za-z0-9+/=]/g, '');
        // Reformat with proper BEGIN/END markers and newlines
        const reformattedKey = `-----BEGIN PRIVATE KEY-----\n${base64Content}\n-----END PRIVATE KEY-----`;
        
        // Check validity of reformatted key
        const reformattedValid = reformattedKey.startsWith('-----BEGIN PRIVATE KEY-----') && 
                                reformattedKey.endsWith('-----END PRIVATE KEY-----') &&
                                reformattedKey.includes('\n');
                                
        console.log('[FIREBASE-DIAGNOSTIC] Last-resort reformatted key validity:', reformattedValid);
        
        // If this approach succeeded, patch the environment variable directly
        if (reformattedValid) {
          console.log('[FIREBASE-DIAGNOSTIC] Patching environment variable with correctly formatted key');
          process.env.FIREBASE_PRIVATE_KEY = reformattedKey;
        }
      }
    }
  } catch (error) {
    console.error('[FIREBASE-DIAGNOSTIC] Error processing test key:', error);
  }
  
  // Check required variables
  const requiredVarSets = [
    // Set 1: Firebase service account
    ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'],
    // Set 2: Google service account
    ['GOOGLE_PROJECT_ID', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CLIENT_EMAIL'],
    // Set 3: Application default credentials
    ['GOOGLE_APPLICATION_CREDENTIALS']
  ];
  
  // Check if we have at least one complete set
  const missingVarSets = requiredVarSets.map(varSet => {
    const missingVars = varSet.filter(v => !process.env[v]);
    return { 
      set: varSet, 
      missing: missingVars,
      complete: missingVars.length === 0
    };
  });
  
  const hasCompleteSet = missingVarSets.some(set => set.complete);
  
  console.log('Credential validation result:', { 
    hasCompleteSet,
    missingVarSets: missingVarSets.map(set => ({
      set: set.set,
      missing: set.missing,
      complete: set.complete
    }))
  });
  
  if (hasCompleteSet) {
    console.log('[FIREBASE-DIAGNOSTIC] Found a complete set of Firebase credentials');
    return true;
  } else {
    console.error('[FIREBASE-DIAGNOSTIC] No complete set of Firebase credentials found');
    return false;
  }
  
  // If we don't have a complete set, but have service account file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Checking service account file at:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    try {
      const fs = require('fs');
      const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (fs.existsSync(filePath)) {
        console.log(`Service account file exists at ${filePath}`);
        try {
          const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
            console.log('Service account file contains valid credentials');
            return true;
          } else {
            console.warn('Service account file is missing required fields');
          }
        } catch (parseError) {
          console.error('Failed to parse service account file:', parseError.message);
        }
      } else {
        console.error(`Service account file does not exist at ${filePath}`);
      }
    } catch (fileError) {
      console.error('Error checking service account file:', fileError.message);
    }
  }
  
  // Look for local service account files in development mode
  if (process.env.NODE_ENV === 'development') {
    try {
      const fs = require('fs');
      const possiblePaths = [
        './firebase-service-account.json',
        './service-account.json',
        './.firebase/service-account.json',
        './secrets/firebase-service-account.json'
      ];
      
      for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
          console.log(`Found local service account file at ${path}`);
          console.log(`To use this file, set GOOGLE_APPLICATION_CREDENTIALS=${path}`);
        }
      }
    } catch (localFileError) {
      console.error('Error checking for local service account files:', localFileError.message);
    }
  }
  
  // Log what's missing for each set
  console.warn('Missing Firebase credentials:');
  missingVarSets.forEach((set, i) => {
    if (set.missing.length > 0) {
      console.warn(`Option ${i+1}: Missing: ${set.missing.join(', ')}`);
    }
  });
  
  return false;
}

// Export useful Firebase Admin types and utilities
export {
  admin,
  Firestore,
  admin as FirebaseAdmin
}; 