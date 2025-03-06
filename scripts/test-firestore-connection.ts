/**
 * Firestore Connection Test
 * 
 * This script tests the Firestore connection by performing basic CRUD operations.
 * It helps diagnose authentication and connection issues before deployment.
 */

import * as dotenv from 'dotenv';
import { getFirestoreService } from '../src/lib/services/firestore-service';
import { fixPrivateKey } from '../src/lib/key-fixer';

// Load environment variables
dotenv.config();

// Define a test collection name
const TEST_COLLECTION = '_connection_test';

// Define a test document
const TEST_DOCUMENT = {
  id: `test-${Date.now()}`,
  timestamp: new Date().toISOString(),
  message: 'Connection test',
  random: Math.random().toString(36).substring(7)
};

/**
 * Test Firestore connection with CRUD operations
 */
async function testFirestoreConnection() {
  console.log('=== Firestore Connection Test ===');
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Test timestamp: ${new Date().toISOString()}`);
  
  // First check for required environment variables
  console.log('\nChecking environment variables:');
  
  // Look for Firebase related variables
  const firebaseVars = Object.keys(process.env)
    .filter(key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP'));
  
  if (firebaseVars.length === 0) {
    console.error('❌ No Firebase environment variables found');
    process.exit(1);
  }
  
  console.log(`✅ Found ${firebaseVars.length} Firebase-related environment variables`);
  
  // Check for private key specifically and try to fix it
  if (process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const originalKey = process.env.FIREBASE_PRIVATE_KEY;
      const fixedKey = fixPrivateKey(originalKey);
      
      // Only replace if something was actually fixed
      if (fixedKey !== originalKey) {
        console.log('✅ Fixed private key format - replacing in environment');
        process.env.FIREBASE_PRIVATE_KEY = fixedKey;
      }
    } catch (keyFixError) {
      console.warn('⚠️ Failed to fix private key format:', keyFixError);
    }
  }
  
  // Initialize Firestore
  console.log('\nInitializing Firestore service...');
  let firestoreService;
  
  try {
    // Get Firestore service with immediate initialization
    firestoreService = await getFirestoreService({ enabled: false }, true);
    console.log('✅ Firestore service initialized successfully');
  } catch (initError) {
    console.error('❌ Failed to initialize Firestore service:');
    console.error(initError);
    process.exit(1);
  }
  
  // Test CRUD operations
  console.log('\nPerforming CRUD operations on test collection:', TEST_COLLECTION);
  
  try {
    // 1. Create document
    console.log(`Creating test document with ID: ${TEST_DOCUMENT.id}`);
    await firestoreService.createWithId(TEST_COLLECTION, TEST_DOCUMENT.id, TEST_DOCUMENT);
    console.log('✅ Document created successfully');
    
    // 2. Read document
    console.log('Reading test document...');
    const retrievedDoc = await firestoreService.getById(TEST_COLLECTION, TEST_DOCUMENT.id);
    
    if (!retrievedDoc) {
      throw new Error('Document not found after creation');
    }
    
    console.log('✅ Document retrieved successfully:', retrievedDoc);
    
    // 3. Update document
    console.log('Updating test document...');
    const updateData = {
      updated: true,
      updateTimestamp: new Date().toISOString()
    };
    
    await firestoreService.update(TEST_COLLECTION, TEST_DOCUMENT.id, updateData);
    
    // Read again to verify update
    const updatedDoc = await firestoreService.getById(TEST_COLLECTION, TEST_DOCUMENT.id);
    
    if (!updatedDoc.updated) {
      throw new Error('Document update failed');
    }
    
    console.log('✅ Document updated successfully:', updatedDoc);
    
    // 4. Query documents
    console.log('Querying test documents...');
    
    const queryResults = await firestoreService.query(TEST_COLLECTION, {
      where: [
        { field: 'updated', operator: '==', value: true }
      ],
      limit: 10
    });
    
    console.log(`✅ Query returned ${queryResults.length} documents`);
    
    // 5. Delete document
    console.log('Deleting test document...');
    await firestoreService.delete(TEST_COLLECTION, TEST_DOCUMENT.id);
    
    // Verify deletion
    const deletedDoc = await firestoreService.getById(TEST_COLLECTION, TEST_DOCUMENT.id);
    
    if (deletedDoc) {
      console.warn('⚠️ Document still exists after deletion attempt');
    } else {
      console.log('✅ Document deleted successfully');
    }
    
    console.log('\n🎉 All Firestore operations completed successfully!');
    console.log('You can now use Firestore in your application.');
    
  } catch (operationError) {
    console.error('❌ Error during Firestore operations:');
    console.error(operationError);
    
    // Try to clean up the test document
    try {
      await firestoreService.delete(TEST_COLLECTION, TEST_DOCUMENT.id);
      console.log('✅ Test document cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to clean up test document:', cleanupError);
    }
    
    process.exit(1);
  }
}

// Run the test
testFirestoreConnection().catch(error => {
  console.error('Unhandled error during Firestore connection test:');
  console.error(error);
  process.exit(1);
}); 