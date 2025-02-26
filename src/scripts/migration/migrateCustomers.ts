/**
 * Customer Migration Script
 * 
 * This script migrates customer data from MongoDB to Firestore.
 * It connects to both databases, extracts data from MongoDB,
 * transforms it to match the Firestore schema, and loads it into Firestore.
 */

import * as admin from 'firebase-admin';
import { MongoClient, Db, Collection } from 'mongodb';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { initializeFirestore, createDocument, batchWriteDocuments, queryDocuments } from '../../lib/gcp/firestore';
import { Customer, CUSTOMER_COLLECTION, customerToFirestore, DEFAULT_CUSTOMER_SETTINGS } from '../../lib/models/firestore/customer';
import { createCustomerServiceAccount } from '../../lib/gcp/serviceAccount';

// Load environment variables
dotenv.config();

// MongoDB connection parameters
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'syndatagen';
const MONGODB_CUSTOMERS_COLLECTION = 'customers'; // Old MongoDB collection name

// Configure batch size and logging
const BATCH_SIZE = 50;
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `customer_migration_${new Date().toISOString().replace(/:/g, '-')}.log`);

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
    const collection = db.collection(MONGODB_CUSTOMERS_COLLECTION);
    
    return { client, db, collection };
  } catch (error: any) {
    log(`MongoDB connection error: ${error.message}`);
    throw error;
  }
}

/**
 * Transform MongoDB customer document to Firestore format
 */
function transformCustomerDocument(doc: any): Customer {
  return {
    id: doc._id.toString(), // MongoDB ObjectId to string
    name: doc.name || '',
    email: doc.email || '',
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    updatedAt: new Date(), // Set to current time during migration
    status: doc.status || 'inactive',
    gcpConfig: {
      serviceAccountId: doc.gcpConfig?.serviceAccountId || '',
      serviceAccountEmail: doc.gcpConfig?.serviceAccountEmail || '',
      serviceAccountKeyRef: doc.gcpConfig?.serviceAccountKeyRef || ''
    },
    settings: {
      storageQuota: doc.settings?.storageQuota || DEFAULT_CUSTOMER_SETTINGS.storageQuota,
      maxProjects: doc.settings?.maxProjects || DEFAULT_CUSTOMER_SETTINGS.maxProjects
    },
    metadata: doc.metadata || {}
  };
}

/**
 * Validate customer data
 */
function validateCustomer(customer: Customer): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!customer.email) {
    errors.push('Email is required');
  } else if (!/\S+@\S+\.\S+/.test(customer.email)) {
    errors.push('Email is invalid');
  }
  
  if (!customer.name) {
    errors.push('Name is required');
  }
  
  // Validate status values
  if (!['active', 'inactive', 'suspended'].includes(customer.status)) {
    errors.push('Status must be active, inactive, or suspended');
  }
  
  // Validate settings
  if (customer.settings.storageQuota <= 0) {
    errors.push('Storage quota must be positive');
  }
  
  if (customer.settings.maxProjects <= 0) {
    errors.push('Max projects must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract customer data from MongoDB
 */
async function extractCustomerData(collection: Collection): Promise<any[]> {
  log('Extracting customer data from MongoDB...');
  try {
    const documents = await collection.find({}).toArray();
    log(`Extracted ${documents.length} customers from MongoDB`);
    return documents;
  } catch (error: any) {
    log(`Error extracting customer data: ${error.message}`);
    throw error;
  }
}

/**
 * Create service accounts for customers if they don't exist
 */
async function createServiceAccountsIfNeeded(customers: Customer[]): Promise<Customer[]> {
  log('Creating service accounts for customers if needed...');
  const updatedCustomers: Customer[] = [];
  
  for (const customer of customers) {
    try {
      // Skip if already has service account info
      if (customer.gcpConfig?.serviceAccountEmail && 
          customer.gcpConfig?.serviceAccountId &&
          customer.gcpConfig?.serviceAccountKeyRef) {
        log(`Customer ${customer.id} already has service account information, skipping creation`);
        updatedCustomers.push(customer);
        continue;
      }
      
      log(`Creating service account for customer ${customer.id}`);
      const serviceAccountResult = await createCustomerServiceAccount({
        customerId: customer.id,
        customerName: customer.name
      });
      
      // Update customer with service account info
      customer.gcpConfig = {
        serviceAccountId: serviceAccountResult.accountId,
        serviceAccountEmail: serviceAccountResult.email,
        serviceAccountKeyRef: serviceAccountResult.keySecretName
      };
      
      log(`Service account created for customer ${customer.id}: ${serviceAccountResult.email}`);
      updatedCustomers.push(customer);
    } catch (error: any) {
      log(`Error creating service account for customer ${customer.id}: ${error.message}`);
      // Add customer without service account info
      updatedCustomers.push(customer);
    }
  }
  
  return updatedCustomers;
}

/**
 * Load customer data into Firestore
 */
async function loadCustomersToFirestore(customers: Customer[]): Promise<{ success: number; failed: number; errors: any[] }> {
  log('Loading customer data to Firestore...');
  const result = { success: 0, failed: 0, errors: [] as any[] };
  
  try {
    // Process in batches to avoid Firestore write limits
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);
      log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(customers.length / BATCH_SIZE)} (${batch.length} items)`);
      
      const operations = batch.map(customer => ({
        type: 'create' as const,
        collection: CUSTOMER_COLLECTION,
        id: customer.id,
        data: customerToFirestore(customer)
      }));
      
      try {
        const batchResult = await batchWriteDocuments(operations);
        
        if (batchResult.success) {
          result.success += batch.length;
          log(`Successfully wrote batch of ${batch.length} customers to Firestore`);
        } else {
          for (let j = 0; j < batchResult.results.length; j++) {
            const opResult = batchResult.results[j];
            if (!opResult.success) {
              result.failed++;
              result.errors.push({
                id: batch[j].id,
                error: opResult.error
              });
              log(`Failed to write customer ${batch[j].id}: ${opResult.error}`);
            } else {
              result.success++;
            }
          }
        }
      } catch (error: any) {
        log(`Error writing batch to Firestore: ${error.message}`);
        result.failed += batch.length;
        batch.forEach(customer => {
          result.errors.push({
            id: customer.id,
            error: error.message
          });
        });
      }
    }
    
    log(`Completed loading customer data: ${result.success} successful, ${result.failed} failed`);
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
    const firestoreDocuments = await queryDocuments<Customer>(CUSTOMER_COLLECTION, {});
    const firestoreCount = firestoreDocuments.length;
    
    const details = {
      mongoCount,
      firestoreCount,
      countMatch: mongoCount === firestoreCount,
      sampleValidation: [] as any[],
      serviceAccountCreation: {
        total: firestoreCount,
        withServiceAccounts: firestoreDocuments.filter(c => !!c.gcpConfig?.serviceAccountEmail).length
      }
    };
    
    // Sample validation (check a few records)
    const sampleSize = Math.min(5, firestoreCount);
    for (let i = 0; i < sampleSize; i++) {
      const sample = firestoreDocuments[Math.floor(Math.random() * firestoreCount)];
      details.sampleValidation.push({
        id: sample.id,
        valid: validateCustomer(sample).valid,
        errors: validateCustomer(sample).errors,
        hasServiceAccount: !!sample.gcpConfig?.serviceAccountEmail
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
    log(`Service account creation: ${details.serviceAccountCreation.withServiceAccounts}/${details.serviceAccountCreation.total}`);
    
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
async function migrateCustomers(): Promise<void> {
  let mongoClient: MongoClient | null = null;
  
  try {
    log('Starting customer migration from MongoDB to Firestore');
    
    // Initialize Firestore
    await initializeFirestore();
    log('Firestore initialized');
    
    // Connect to MongoDB
    const { client, collection } = await connectToMongoDB();
    mongoClient = client;
    
    // Extract data from MongoDB
    const mongoDocuments = await extractCustomerData(collection);
    const mongoCount = mongoDocuments.length;
    
    // Transform documents
    log('Transforming customer documents...');
    const customers: Customer[] = [];
    const invalidDocuments: any[] = [];
    
    for (const doc of mongoDocuments) {
      const customer = transformCustomerDocument(doc);
      const validation = validateCustomer(customer);
      
      if (validation.valid) {
        customers.push(customer);
      } else {
        invalidDocuments.push({
          id: doc._id.toString(),
          errors: validation.errors
        });
        log(`Invalid customer document: ${doc._id.toString()}, errors: ${validation.errors.join(', ')}`);
      }
    }
    
    log(`Transformed ${customers.length} valid customer documents, found ${invalidDocuments.length} invalid documents`);
    
    // Create service accounts for customers if needed
    if (customers.length > 0) {
      const customersWithServiceAccounts = await createServiceAccountsIfNeeded(customers);
      
      // Load data into Firestore
      const loadResult = await loadCustomersToFirestore(customersWithServiceAccounts);
      log(`Load results: ${loadResult.success} successful, ${loadResult.failed} failed`);
      
      // Verify the migration
      const verificationResult = await verifyMigration(mongoCount);
      log(`Verification result: ${verificationResult.success ? 'Success' : 'Failed'}`);
      log(`Verification details: ${JSON.stringify(verificationResult.details, null, 2)}`);
    } else {
      log('No valid documents to migrate');
    }
    
    log('Customer migration completed');
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
  migrateCustomers()
    .then(() => {
      log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      log(`Migration script failed: ${error.message}`);
      process.exit(1);
    });
}

export { migrateCustomers }; 