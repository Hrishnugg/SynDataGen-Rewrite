/**
 * Migration Configuration
 * 
 * Central configuration for migration scripts, handling environment variables
 * and providing defaults for various migration settings.
 */

// Import dotenv using require syntax instead of ES modules
const dotenv = require('dotenv');
import { config as configureFirestore } from 'firebase-functions';

// Load environment variables from .env file
dotenv.config();

// MongoDB configuration
export const mongoConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DB_NAME || 'syndatagen',
  batchSize: parseInt(process.env.MONGODB_BATCH_SIZE || '100', 10),
};

// Firestore configuration
export const firestoreConfig = {
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  batchSize: parseInt(process.env.FIRESTORE_BATCH_SIZE || '500', 10),
  environment: process.env.NODE_ENV || 'development',
};

// Migration settings
export const migrationConfig = {
  verbose: process.env.MIGRATION_VERBOSE === 'true',
  validateOnly: process.env.MIGRATION_VALIDATE_ONLY === 'true',
  dryRun: process.env.MIGRATION_DRY_RUN === 'true',
  // Collection names
  mongoCollections: {
    customers: process.env.MONGO_CUSTOMERS_COLLECTION || 'customers',
    waitlist: process.env.MONGO_WAITLIST_COLLECTION || 'waitlist',
    projects: process.env.MONGO_PROJECTS_COLLECTION || 'projects',
    jobs: process.env.MONGO_JOBS_COLLECTION || 'dataJobs',
  },
  firestoreCollections: {
    customers: process.env.FIRESTORE_CUSTOMERS_COLLECTION || 'customers',
    waitlist: process.env.FIRESTORE_WAITLIST_COLLECTION || 'waitlist',
    projects: process.env.FIRESTORE_PROJECTS_COLLECTION || 'projects',
    jobs: process.env.FIRESTORE_JOBS_COLLECTION || 'dataJobs',
  },
};

/**
 * Helper function to validate the configuration
 * @returns true if the configuration is valid, throws an error otherwise
 */
export function validateConfig(): boolean {
  // Essential MongoDB checks
  if (!mongoConfig.uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }
  if (!mongoConfig.dbName) {
    throw new Error('MONGODB_DB_NAME environment variable is required');
  }

  // Essential Firestore checks
  if (!firestoreConfig.projectId) {
    throw new Error('GCP_PROJECT_ID environment variable is required');
  }
  
  // Log full configuration if verbose
  if (migrationConfig.verbose) {
    console.log('Migration configuration:');
    console.log('MongoDB:', { ...mongoConfig, uri: '***REDACTED***' });
    console.log('Firestore:', { ...firestoreConfig, keyFilename: '***REDACTED***' });
    console.log('Migration settings:', migrationConfig);
  }
  
  return true;
} 