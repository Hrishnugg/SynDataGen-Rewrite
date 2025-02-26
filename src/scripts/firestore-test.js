/**
 * Firestore Connection Test
 * 
 * This script tests the connection to Firestore and verifies that
 * the service account credentials are working correctly.
 */

require('dotenv').config();
const admin = require('firebase-admin');

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

// Run the test
testFirestoreConnection(); 