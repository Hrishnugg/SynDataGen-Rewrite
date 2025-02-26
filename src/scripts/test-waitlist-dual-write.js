/**
 * Waitlist Dual-Write Test
 *
 * This script tests the waitlist submission with dual-write mode enabled.
 * It submits a new waitlist entry and then verifies that the entry exists
 * in both MongoDB and Firestore.
 */

const { MongoClient } = require('mongodb');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
let firestoreDb;
try {
  if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Firebase credentials not found in environment variables');
  }

  initializeApp({
    credential: cert({
      projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });

  firestoreDb = getFirestore();
  console.log('Firestore initialized successfully');
} catch (error) {
  console.error('Error initializing Firestore:', error);
  process.exit(1);
}

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
let mongoClient;

/**
 * Submit a waitlist entry directly to databases
 */
async function submitDirectToDatabase() {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const testData = {
    name: 'Dual-Write Test User',
    email: uniqueEmail,
    company: 'Test Company',
    jobTitle: 'QA Engineer',
    industry: 'Technology',
    dataVolume: '10-100GB',
    useCase: 'Testing dual-write mode',
    createdAt: new Date(),
    status: 'pending',
    metadata: { source: 'direct-test' }
  };

  console.log(`Creating test entry with email: ${uniqueEmail}`);
  
  // Get the current backend setting directly from the .env file
  let backend = process.env.WAITLIST_BACKEND || 'both';
  
  // Check for GCP_FEATURES_ENABLED if WAITLIST_BACKEND is not set
  if (!process.env.WAITLIST_BACKEND && process.env.GCP_FEATURES_ENABLED) {
    if (process.env.GCP_FEATURES_ENABLED.toLowerCase() === 'true') {
      backend = 'firestore'; // Default when GCP features are enabled
    }
  }
  
  console.log(`Current backend for waitlist: ${backend}`);
  
  // Record the document IDs
  const ids = {
    firestore: null,
    mongodb: null
  };

  // Add to Firestore if enabled
  if (backend === 'firestore' || backend === 'both') {
    try {
      const waitlistCollection = firestoreDb.collection(
        process.env.FIRESTORE_WAITLIST_COLLECTION || 'waitlist'
      );
      
      const docRef = await waitlistCollection.add(testData);
      ids.firestore = docRef.id;
      
      console.log(`Added directly to Firestore with ID: ${docRef.id}`);
    } catch (error) {
      console.error('Error adding directly to Firestore:', error);
    }
  }

  // Add to MongoDB if enabled
  if (backend === 'mongodb' || backend === 'both') {
    try {
      mongoClient = new MongoClient(mongoUri);
      await mongoClient.connect();
      
      const dbName = process.env.MONGODB_DB_NAME || 'syndatagen';
      const waitlistCollection = mongoClient
        .db(dbName)
        .collection(process.env.MONGO_WAITLIST_COLLECTION || 'waitlist');
      
      const result = await waitlistCollection.insertOne(testData);
      ids.mongodb = result.insertedId.toString();
      
      console.log(`Added directly to MongoDB with ID: ${result.insertedId}`);
      await mongoClient.close();
    } catch (error) {
      console.error('Error adding directly to MongoDB:', error);
      if (mongoClient) await mongoClient.close();
    }
  }

  return {
    email: uniqueEmail,
    ids
  };
}

/**
 * Submit a waitlist entry via API
 */
async function submitWaitlistEntry() {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  const testData = {
    name: 'Dual-Write Test User',
    email: uniqueEmail,
    company: 'Test Company',
    jobTitle: 'QA Engineer',
    industry: 'Technology',
    dataVolume: '10-100GB',
    useCase: 'Testing dual-write mode'
  };

  console.log(`Submitting waitlist entry with email: ${uniqueEmail}`);
  
  // Use default API URL if not set in environment
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  try {
    const response = await fetch(`${apiUrl}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Waitlist submission failed: ${response.status} ${response.statusText} - ${text}`);
    }

    const data = await response.json();
    console.log('Waitlist submission response:', data);
    
    return { 
      email: uniqueEmail,
      submissionId: data.id || null
    };
  } catch (error) {
    console.error('Error submitting waitlist entry:', error);
    throw error;
  }
}

/**
 * Check if waitlist entry exists in MongoDB
 */
async function checkMongoDBEntry(email) {
  console.log('Checking MongoDB for waitlist entry...');
  try {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    
    // Use explicit database name from environment variable
    const dbName = process.env.MONGODB_DB_NAME || 'syndatagen';
    console.log(`Using MongoDB database: ${dbName}`);
    
    const waitlistCollection = mongoClient
      .db(dbName)
      .collection(process.env.MONGO_WAITLIST_COLLECTION || 'waitlist');
    
    const entry = await waitlistCollection.findOne({ email });
    
    if (entry) {
      console.log('✅ Found waitlist entry in MongoDB:', {
        id: entry._id.toString(),
        email: entry.email,
        name: entry.name,
        createdAt: entry.createdAt
      });
      return true;
    } else {
      console.log('❌ Waitlist entry not found in MongoDB');
      return false;
    }
  } catch (error) {
    console.error('Error checking MongoDB:', error);
    return false;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

/**
 * Check if waitlist entry exists in Firestore
 */
async function checkFirestoreEntry(email) {
  console.log('Checking Firestore for waitlist entry...');
  try {
    const waitlistCollection = firestoreDb.collection(
      process.env.FIRESTORE_WAITLIST_COLLECTION || 'waitlist'
    );
    
    const snapshot = await waitlistCollection.where('email', '==', email).get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      console.log('✅ Found waitlist entry in Firestore:', {
        id: doc.id,
        email: doc.data().email,
        name: doc.data().name,
        createdAt: doc.data().createdAt?.toDate()
      });
      return true;
    } else {
      console.log('❌ Waitlist entry not found in Firestore');
      return false;
    }
  } catch (error) {
    console.error('Error checking Firestore:', error);
    return false;
  }
}

/**
 * Run the test
 */
async function runTest() {
  console.log('Starting waitlist dual-write test...');
  console.log('=====================================');
  
  try {
    // Get the current backend setting directly from the .env file
    let backend = process.env.WAITLIST_BACKEND || 'both';
    
    // Check for GCP_FEATURES_ENABLED if WAITLIST_BACKEND is not set
    if (!process.env.WAITLIST_BACKEND && process.env.GCP_FEATURES_ENABLED) {
      console.log('Checking GCP_FEATURES_ENABLED for backend detection');
      if (process.env.GCP_FEATURES_ENABLED.toLowerCase() === 'true') {
        backend = 'firestore'; // Default when GCP features are enabled
      }
    }
    
    console.log(`Detected backend setting: ${backend}`);
    
    // Submit directly to database instead of using the API
    const { email } = await submitDirectToDatabase();
    
    // Wait a moment for data propagation
    console.log('Waiting 2 seconds for data propagation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check both databases
    const inMongoDB = await checkMongoDBEntry(email);
    const inFirestore = await checkFirestoreEntry(email);
    
    console.log('\nTest Results:');
    console.log('=====================================');
    
    if (backend === 'both') {
      if (inMongoDB && inFirestore) {
        console.log('✅ SUCCESS: Entry found in both MongoDB and Firestore!');
        console.log('Dual-write mode is working correctly.');
      } else if (inMongoDB) {
        console.log('⚠️ PARTIAL SUCCESS: Entry only found in MongoDB');
        console.log('Firestore write failed or is delayed.');
      } else if (inFirestore) {
        console.log('⚠️ PARTIAL SUCCESS: Entry only found in Firestore');
        console.log('MongoDB write failed or is delayed.');
      } else {
        console.log('❌ FAILURE: Entry not found in either database');
        console.log('Submission may have failed entirely.');
      }
    } else if (backend === 'firestore') {
      if (inFirestore) {
        console.log('✅ SUCCESS: Entry found in Firestore!');
        console.log('Firestore-only mode is working correctly.');
        if (inMongoDB) {
          console.log('ℹ️ Note: Entry also found in MongoDB (unexpected in Firestore-only mode).');
        }
      } else {
        console.log('❌ FAILURE: Entry not found in Firestore');
        console.log('Firestore-only mode is not working correctly.');
      }
    } else if (backend === 'mongodb') {
      if (inMongoDB) {
        console.log('✅ SUCCESS: Entry found in MongoDB!');
        console.log('MongoDB-only mode is working correctly.');
        if (inFirestore) {
          console.log('ℹ️ Note: Entry also found in Firestore (unexpected in MongoDB-only mode).');
        }
      } else {
        console.log('❌ FAILURE: Entry not found in MongoDB');
        console.log('MongoDB-only mode is not working correctly.');
      }
    }
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
  }
}

// Run the test
runTest().finally(() => {
  console.log('\nTest completed.');
  process.exit(0);
}); 