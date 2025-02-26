/**
 * Migration Example Script
 * 
 * This script demonstrates how to use the migration utilities to
 * migrate data from MongoDB to Firestore.
 * 
 * Required environment variables:
 * - MONGODB_URI: MongoDB connection string
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to GCP service account key JSON file
 * 
 * Optional environment variables:
 * - SOURCE_COLLECTION: MongoDB collection to migrate (default: "users")
 * - DEST_COLLECTION: Firestore collection to write to (default: same as SOURCE_COLLECTION)
 * - BATCH_SIZE: Number of documents to process in a batch (default: 100)
 */

import { MongoClient } from 'mongodb';
import { 
  MigrationStats,
  MigrationError, 
  ValidationResult,
  FirestoreLoadResult
} from '../lib/migration/types';

// Import migration utilities
import { 
  initializeFirestore,
  loadToFirestore,
  isFirestoreReady,
  processMigration
} from '../lib/migration';

// Setup environment variables
try {
  // Try to load environment variables from dotenv
  require('dotenv').config();
} catch (error) {
  console.warn('dotenv not installed. Using environment variables directly.');
}

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

// Firestore requires authentication
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.warn('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
  console.warn('Firestore operations will likely fail unless you are already authenticated via gcloud CLI.');
  console.warn('Set this variable to the path of your service account key file for proper authentication.');
}

/**
 * Setup MongoDB and Firestore connections
 */
async function setupConnections() {
  try {
    // Check for required MongoDB environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error(
        'MONGODB_URI environment variable is not set. ' +
        'This is required for MongoDB connection.'
      );
    }
    
    // Firestore initialization
    await initializeFirestore(); 
    console.log('Firestore connection initialized');
    
    return true;
  } catch (error: any) {
    console.error('Failed to set up connections:', error.message);
    return false;
  }
}

/**
 * Print MongoDB collection statistics
 */
async function printCollectionStats(db: any) {
  try {
    const collections = await db.collections();
    console.log('\nCollection Statistics:');
    
    for (const collection of collections) {
      try {
        const name = collection.collectionName;
        const count = await collection.countDocuments();
        console.log(`- ${name}: ${count} documents`);
      } catch (error: any) {
        console.error(`Error getting stats for collection: ${collection.collectionName}`, error.message);
      }
    }
  } catch (error: any) {
    console.error('Error retrieving collections:', error.message);
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  let client = null;
  try {
    // Initialize connections
    const initialized = await setupConnections();
    if (!initialized) {
      throw new Error('Failed to initialize connections');
    }
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Print collection statistics
    await printCollectionStats(db);
    
    // Get collection for migration
    const sourceColl = process.env.SOURCE_COLLECTION || 'users';
    const collection = db.collection(sourceColl);
    console.log(`\nSelected collection for migration: ${sourceColl}`);
    
    // Count documents
    const count = await collection.countDocuments();
    console.log(`Total documents in ${sourceColl}: ${count}`);
    
    // Get batch size from env or default to 100
    const batchSize = parseInt(process.env.BATCH_SIZE || '100', 10);
    
    // Limit documents for testing
    const limit = Math.min(count, batchSize);
    console.log(`Migrating first ${limit} documents as a test batch`);
    
    // Get documents
    const docs = await collection.find({}).limit(limit).toArray();
    
    // Add MongoDB to Firestore transformer
    const transformer = (doc: any) => {
      // Create a clean version of the document for Firestore
      const transformed = { ...doc };
      
      // Convert MongoDB _id to Firestore id
      if (transformed._id) {
        transformed.id = transformed._id.toString();
        delete transformed._id;
      }
      
      // Add migration metadata
      transformed.migratedAt = new Date();
      transformed.migrationSource = 'mongodb';
      
      return transformed;
    };
    
    // Validate data and transform
    console.log('Transforming and validating documents...');
    const migrationResults = await processMigration(docs, transformer, {
      validateData: true,
      collectionName: sourceColl
    });
    
    // Check if Firestore is ready
    console.log('Checking Firestore status...');
    const firestoreReady = await isFirestoreReady();
    
    if (!firestoreReady) {
      throw new Error('Firestore is not ready. Check your credentials and connection.');
    }
    
    // Load data to Firestore
    console.log('Loading data to Firestore...');
    const destCollection = process.env.DEST_COLLECTION || sourceColl;
    
    const firestoreResults = await loadToFirestore(
      migrationResults.transformedDocuments,
      destCollection,
      {
        useBatch: true,
        batchSize: 500,
        generateIds: false,
        merge: true
      }
    );
    
    // Add Firestore results to migration results
    const results = {
      ...migrationResults,
      firestoreResults
    };
    
    // Print results
    printMigrationResults(results);
    
    console.log('\nMigration completed successfully!');
    return true;
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    
    if (error.details) {
      console.error('Error details:', JSON.stringify(error.details, null, 2));
    }
    
    return false;
  } finally {
    // Clean up connections
    if (client) {
      console.log('Closing MongoDB connection...');
      await client.close();
    }
  }
}

/**
 * Extended migration stats
 */
interface MigrationResults {
  total: number;
  transformed: number;
  failed: number;
  transformedDocuments: Record<string, any>[];
  validationResults?: {
    valid: Record<string, any>[];
    invalid: Record<string, any>[];
    errors: { document: string; error: string }[];
  };
  errors: MigrationError[];
  firestoreResults?: FirestoreLoadResult;
}

/**
 * Print migration results
 */
function printMigrationResults(results: MigrationResults) {
  if (!results) {
    console.log('No migration results to display');
    return;
  }
  
  console.log('\nMigration Results:');
  console.log(`- Documents Processed: ${results.total || 0}`);
  console.log(`- Successfully Transformed: ${results.transformed || 0}`);
  console.log(`- Failed Transformations: ${results.failed || 0}`);
  
  if (results.validationResults) {
    console.log(`- Valid Documents: ${results.validationResults.valid.length}`);
    console.log(`- Invalid Documents: ${results.validationResults.invalid.length}`);
    
    if (results.validationResults.invalid.length > 0) {
      console.log('\nValidation Errors (sample):');
      const sampleErrors = results.validationResults.errors.slice(0, 3);
      
      for (const error of sampleErrors) {
        console.log(`- Document ${error.document}: ${error.error}`);
      }
      
      if (results.validationResults.errors.length > 3) {
        console.log(`... and ${results.validationResults.errors.length - 3} more errors`);
      }
    }
  }
  
  if (results.firestoreResults) {
    console.log('\nFirestore Load Results:');
    console.log(`- Successfully Loaded: ${results.firestoreResults.success}`);
    console.log(`- Failed to Load: ${results.firestoreResults.failed}`);
    
    if (results.firestoreResults.failed > 0) {
      console.log('\nFirestore Load Errors (sample):');
      const errors = results.firestoreResults.errors;
      const errorKeys = Object.keys(errors).slice(0, 3);
      
      for (const key of errorKeys) {
        console.log(`- Document ${key}: ${errors[key]}`);
      }
      
      if (Object.keys(errors).length > 3) {
        console.log(`... and ${Object.keys(errors).length - 3} more errors`);
      }
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('=== MongoDB to Firestore Migration Example ===');
  
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
  }
  
  try {
    // Run migration
    await runMigration();
    
    console.log('\n=== Migration Example Completed ===');
  } catch (error: any) {
    console.error('Migration example failed:', error.message || error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
