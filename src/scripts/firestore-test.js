/**
 * Firestore Connection Test
 * 
 * This script tests the connection to Firestore and verifies that
 * the service account credentials are working correctly.
 */

require('dotenv').config();
const admin = require('firebase-admin');
const { getFirestoreService } = require('../lib/api/services/firestore-service');

async function testFirestoreConnection() {
  try {
    console.log('Initializing Firestore...');
    
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      const projectId = process.env.GCP_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      
      console.log('Firebase Admin SDK initialized');
    }
    
    const db = admin.firestore();
    
    // Try to access a collection
    console.log('Testing connection by listing collections...');
    const collections = await db.listCollections();
    
    console.log('Available collections:');
    if (collections.length === 0) {
      console.log('  No collections found. This is normal for a new Firestore instance.');
    } else {
      collections.forEach(col => {
        console.log(`  - ${col.id}`);
      });
    }
    
    // Try to write a test document
    console.log('\nTesting write operations...');
    const testCollection = db.collection('_connection_test');
    const testDocRef = testCollection.doc('test_document');
    
    await testDocRef.set({
      timestamp: new Date(),
      message: 'Connection test successful',
      testId: Math.random().toString(36).substring(2, 15)
    });
    
    console.log('Successfully wrote test document');
    
    // Try to read the document back
    console.log('\nTesting read operations...');
    const docSnapshot = await testDocRef.get();
    
    if (docSnapshot.exists) {
      console.log('Successfully read test document:', docSnapshot.data());
    } else {
      console.log('Failed to read test document');
      throw new Error('Document read failed');
    }
    
    // Delete the test document
    console.log('\nCleaning up test document...');
    await testDocRef.delete();
    console.log('Test document deleted');
    
    console.log('\n✅ Firestore connection test PASSED! Your configuration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Firestore connection test FAILED!');
    console.error('Error details:', error);
    console.error('\nPlease check your service account credentials and project configuration.');
    process.exit(1);
  }
}

async function testFirestoreInitialization() {
  console.log('Starting Firestore initialization test');
  
  try {
    // Set environment variables for testing
    process.env.USE_FIREBASE_MOCKS = 'true';
    
    console.log('Using mock mode for testing');
    
    // Get the Firestore service with mock mode enabled
    const firestoreService = getFirestoreService(true);
    console.log('FirestoreService instance created successfully in mock mode');
    
    // Test collection and document path
    const testCollection = 'test_collection';
    const testDocumentData = {
      name: 'Test Document',
      timestamp: new Date().toISOString(),
      testValue: Math.random().toString(36).substring(2, 15)
    };
    
    // Create a test document
    console.log('Creating test document...');
    const docId = await firestoreService.createDocument(testCollection, testDocumentData);
    console.log(`Test document created with ID: ${docId}`);
    
    // Get the test document
    console.log('Retrieving test document...');
    const docPath = `${testCollection}/${docId}`;
    const retrievedDoc = await firestoreService.getDocument(docPath);
    
    if (retrievedDoc) {
      console.log('Test document retrieved successfully');
      console.log('Document data:', JSON.stringify(retrievedDoc, null, 2));
    } else {
      console.error('Failed to retrieve test document');
    }
    
    // Update the test document
    console.log('Updating test document...');
    const updateData = {
      updated: true,
      updateTimestamp: new Date().toISOString()
    };
    await firestoreService.updateDocument(docPath, updateData);
    console.log('Test document updated successfully');
    
    // Get the updated document
    console.log('Retrieving updated document...');
    const updatedDoc = await firestoreService.getDocument(docPath);
    
    if (updatedDoc) {
      console.log('Updated document retrieved successfully');
      console.log('Updated document data:', JSON.stringify(updatedDoc, null, 2));
    } else {
      console.error('Failed to retrieve updated document');
    }
    
    // Query documents
    console.log('Querying documents...');
    const queryResults = await firestoreService.queryDocuments(
      testCollection, 
      'name', 
      '==', 
      'Test Document'
    );
    console.log(`Query returned ${queryResults.length} documents`);
    
    // Delete the test document
    console.log('Deleting test document...');
    await firestoreService.deleteDocument(docPath);
    console.log('Test document deleted successfully');
    
    // Verify deletion
    const deletedDoc = await firestoreService.getDocument(docPath);
    if (!deletedDoc) {
      console.log('Document deletion verified');
    } else {
      console.warn('Document still exists after deletion attempt');
    }
    
    console.log('Firestore initialization test completed successfully');
    return true;
  } catch (error) {
    console.error('Error during Firestore initialization test:', error);
    return false;
  }
}

// Run the test
testFirestoreConnection();
testFirestoreInitialization()
  .then(success => {
    if (success) {
      console.log('✅ Firestore initialization test passed');
      process.exit(0);
    } else {
      console.error('❌ Firestore initialization test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  }); 