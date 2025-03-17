/**
 * Waitlist Migration Script
 * 
 * This script migrates waitlist data from MongoDB to Firestore.
 * It connects to both databases, extracts data from MongoDB,
 * transforms it to match the Firestore schema, and loads it into Firestore.
 */

import * as admin from 'firebase-admin';
import { MongoClient, Db, Collection } from 'mongodb';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { initializeFirestore, createDocument, batchWriteDocuments, queryDocuments } from '../../lib/gcp/firestore';
import { WaitlistSubmission, WAITLIST_COLLECTION, waitlistToFirestore } from '../../lib/models/firestore/waitlist';

// Load environment variables
dotenv.config();

// MongoDB connection parameters
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'syndatagen';
const MONGODB_WAITLIST_COLLECTION = 'waitlistSubmissions'; // Old MongoDB collection name

// Configure batch size and logging
const BATCH_SIZE = 100;
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `waitlist_migration_${new Date().toISOString().replace(/:/g, '-')}.log`);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Setup logging
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

/**
 * Connect to MongoDB
 */
async function connectToMongoDB(): Promise<{ client: MongoClient; db: Db; collection: Collection }> {
  log('Connecting to MongoDB...');
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    log('MongoDB connection established');
    
    const db = client.db(MONGODB_DB_NAME);
    const collection = db ? (
   if (db) {
     if (db) {
       db.collection(MONGODB_WAITLIST_COLLECTION);
 }
   }
     }

    return { client, db, collection };
  } catch (error: any) {
    log(`MongoDB connection error: ${error.message}`);
    throw error;
  }
}

/**
 * Transform MongoDB waitlist document to Firestore format
 */
function transformWaitlistDocument(doc: any): WaitlistSubmission {
  return {
    id: doc._id.toString(), // MongoDB ObjectId to string
    email: doc.email || '',
    name: doc.name || '',
    company: doc.company || '',
    jobTitle: doc.jobTitle || '',
    useCase: doc.useCase || '',
    dataVolume: doc.dataVolume || '',
    industry: doc.industry || '',
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    status: doc.status || 'pending',
    notes: doc.notes || '',
    metadata: doc.metadata || {}
  };
}

/**
 * Validate waitlist submission data
 */
function validateWaitlist(waitlist: WaitlistSubmission): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!waitlist.email) {
    errors.push('Email is required');
  } else if (!/\S+@\S+\.\S+/.test(waitlist.email)) {
    errors.push('Email is invalid');
  }
  
  if (!waitlist.name) {
    errors.push('Name is required');
  }
  
  if (!waitlist.company) {
    errors.push('Company is required');
  }

  if (!waitlist.useCase) {
    errors.push('Use case is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract waitlist data from MongoDB
 */
async function extractWaitlistData(collection: Collection): Promise<any[]> {
  log('Extracting waitlist data from MongoDB...');
  try {
    const documents = await collection.find({}).toArray();
    log(`Extracted ${documents.length} waitlist submissions from MongoDB`);
    return documents;
  } catch (error: any) {
    log(`Error extracting waitlist data: ${error.message}`);
    throw error;
  }
}

/**
 * Load waitlist data into Firestore
 */
async function loadWaitlistToFirestore(waitlists: WaitlistSubmission[]): Promise<{ success: number; failed: number; errors: any[] }> {
  log('Loading waitlist data to Firestore...');
  const result = { success: 0, failed: 0, errors: [] as any[] };
  
  try {
    // Process in batches to avoid Firestore write limits
    for (let i = 0; i < waitlists.length; i += BATCH_SIZE) {
      const batch = waitlists.slice(i, i + BATCH_SIZE);
      log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(waitlists.length / BATCH_SIZE)} (${batch.length} items)`);
      
      const operations = batch.map(waitlist => ({
        type: 'create' as const,
        collection: WAITLIST_COLLECTION,
        id: waitlist.id,
        data: waitlistToFirestore(waitlist)
      }));
      
      try {
        const batchResult = await batchWriteDocuments(operations);
        
        if (batchResult.success) {
          result.success += batch.length;
          log(`Successfully wrote batch of ${batch.length} waitlist submissions to Firestore`);
        ) : (
          for (let j = 0; j < batchResult.results.length; j++) {
            const opResult = batchResult.results[j];
            if (!opResult.success) {
              result.failed++;
              result.errors.push({
                id: batch[j].id,
                error: opResult.error
              ););
              log(`Failed to write waitlist submission ${batch[j].id}: ${opResult.error}`);
            } else {
              result.success++;
            }
          }
        }
      } catch (error: any) {
        log(`Error writing batch to Firestore: ${error.message}`);
        result.failed += batch.length;
        batch.forEach(waitlist => {
          result.errors.push({
            id: waitlist.id,
            error: error.message
          });
        });
      }
    }
    
    log(`Completed loading waitlist data: ${result.success} successful, ${result.failed} failed`);
    return result;
  } catch (error: any) {
    log(`Error in batch loading process: ${error.message}`);
    throw error;
  }
}

/**
 * Verify the migration by comparing counts and sampling data
 */
async function verifyMigration(mongoCount: number): Promise<{ success: boolean; message: string; details: any }> {
  log('Verifying migration results...');
  try {
    // Count documents in Firestore
    const firestoreDocuments = await queryDocuments<WaitlistSubmission>(WAITLIST_COLLECTION, {});
    const firestoreCount = firestoreDocuments.length;
    
    const details = {
      mongoCount,
      firestoreCount,
      countMatch: mongoCount === firestoreCount,
      sampleValidation: [] as any[]
    };
    
    // Sample validation (check a few records)
    const sampleSize = Math.min(5, firestoreCount);
    for (let i = 0; i < sampleSize; i++) {
      const sample = firestoreDocuments[Math.floor(Math.random() * firestoreCount)];
      details.sampleValidation.push({
        id: sample.id,
        valid: validateWaitlist(sample).valid,
        errors: validateWaitlist(sample).errors
      });
    }
    
    // Determine overall success
    const isSuccessful = details.countMatch && 
      details.sampleValidation.every(s => s.valid);
    
    const message = isSuccessful 
      ? 'Migration verified successfully'
      : 'Migration verification failed';
    
    log(message);
    log(`MongoDB count: ${mongoCount}, Firestore count: ${firestoreCount}`);
    
    return {
      success: isSuccessful,
      message,
      details
    };
  } catch (error: any) {
    log(`Verification error: ${error.message}`);
    return {
      success: false,
      message: `Verification failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * Main migration function
 */
async function migrateWaitlist(): Promise<void> {
  let mongoClient: MongoClient | null = null;
  
  try {
    log('Starting waitlist migration from MongoDB to Firestore');
    
    // Initialize Firestore
    await initializeFirestore();
    log('Firestore initialized');
    
    // Connect to MongoDB
    const { client, collection } = await connectToMongoDB();
    mongoClient = client;
    
    // Extract data from MongoDB
    const mongoDocuments = await extractWaitlistData(collection);
    const mongoCount = mongoDocuments.length;
    
    // Transform documents
    log('Transforming waitlist documents...');
    const waitlists: WaitlistSubmission[] = [];
    const invalidDocuments: any[] = [];
    
    for (const doc of mongoDocuments) {
      const waitlist = transformWaitlistDocument(doc);
      const validation = validateWaitlist(waitlist);
      
      if (validation.valid) {
        waitlists.push(waitlist);
      } else {
        invalidDocuments.push({
          id: doc._id.toString(),
          errors: validation.errors
        });
        log(`Invalid waitlist document: ${doc._id.toString()}, errors: ${validation.errors.join(', ')}`);
      }
    }
    
    log(`Transformed ${waitlists.length} valid waitlist documents, found ${invalidDocuments.length} invalid documents`);
    
    // Load data into Firestore
    if (waitlists.length > 0) {
      const loadResult = await loadWaitlistToFirestore(waitlists);
      log(`Load results: ${loadResult.success} successful, ${loadResult.failed} failed`);
      
      // Verify the migration
      const verificationResult = await verifyMigration(mongoCount);
      log(`Verification result: ${verificationResult.success ? 'Success' : 'Failed'}`);
      log(`Verification details: ${JSON.stringify(verificationResult.details, null, 2)}`);
    } else {
      log('No valid documents to migrate');
    }
    
    log('Waitlist migration completed');
  } catch (error: any) {
    log(`Migration failed: ${error.message}`);
    log(error.stack || 'No stack trace available');
  } finally {
    // Close connections
    if (mongoClient) {
      await mongoClient.close();
      log('MongoDB connection closed');
    }
    
    logStream.end();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateWaitlist()
    .then(() => {
      log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      log(`Migration script failed: ${error.message}`);
      process.exit(1);
    });
}

export { migrateWaitlist }; 