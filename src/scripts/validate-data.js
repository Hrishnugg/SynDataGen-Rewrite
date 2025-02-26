/**
 * Data Validation Script
 * 
 * This script compares data between MongoDB and Firestore to ensure consistency
 * before finalizing the migration to Firestore-only mode.
 */

const { MongoClient } = require('mongodb');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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
const mongoDbName = process.env.MONGODB_DB_NAME || 'syndatagen';
let mongoClient;

// Collection mappings
const collections = [
  {
    name: 'waitlist',
    mongo: process.env.MONGO_WAITLIST_COLLECTION || 'waitlist',
    firestore: process.env.FIRESTORE_WAITLIST_COLLECTION || 'waitlist',
    keyField: 'email' // Field to use for matching documents
  },
  {
    name: 'customers',
    mongo: process.env.MONGO_CUSTOMERS_COLLECTION || 'customers',
    firestore: process.env.FIRESTORE_CUSTOMERS_COLLECTION || 'customers',
    keyField: 'email'
  },
  {
    name: 'projects',
    mongo: process.env.MONGO_PROJECTS_COLLECTION || 'projects',
    firestore: process.env.FIRESTORE_PROJECTS_COLLECTION || 'projects',
    keyField: 'name' // Assuming name is unique within a project
  },
  {
    name: 'dataGenerationJobs',
    mongo: process.env.MONGO_JOBS_COLLECTION || 'dataJobs',
    firestore: process.env.FIRESTORE_JOBS_COLLECTION || 'dataGenerationJobs',
    keyField: 'name' // Assuming name is unique for a job
  }
];

// Compare two objects and return differences
function compareObjects(obj1, obj2, ignoreFields = ['_id', 'id', 'createdAt', 'updatedAt']) {
  const differences = {};
  
  // Combine all keys from both objects
  const allKeys = [...new Set([...Object.keys(obj1), ...Object.keys(obj2)])];
  
  // Filter out ignored fields
  const keysToCompare = allKeys.filter(key => !ignoreFields.includes(key));
  
  for (const key of keysToCompare) {
    // Ignore functions and undefined values
    if (typeof obj1[key] === 'function' || typeof obj2[key] === 'function') {
      continue;
    }
    
    // Handle deep objects
    if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' && 
        obj1[key] !== null && obj2[key] !== null &&
        !Array.isArray(obj1[key]) && !Array.isArray(obj2[key])) {
      const nestedDiff = compareObjects(obj1[key], obj2[key], ignoreFields);
      if (Object.keys(nestedDiff).length > 0) {
        differences[key] = nestedDiff;
      }
    } 
    // Compare arrays by stringifying (simple approach)
    else if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
      const array1Str = JSON.stringify(obj1[key].sort());
      const array2Str = JSON.stringify(obj2[key].sort());
      if (array1Str !== array2Str) {
        differences[key] = {
          mongo: obj1[key],
          firestore: obj2[key]
        };
      }
    }
    // Simple value comparison
    else if (obj1[key] !== obj2[key]) {
      // Convert dates to strings for comparison
      if (obj1[key] instanceof Date && obj2[key] instanceof Date) {
        if (obj1[key].toISOString() !== obj2[key].toISOString()) {
          differences[key] = {
            mongo: obj1[key].toISOString(),
            firestore: obj2[key].toISOString()
          };
        }
      } else {
        differences[key] = {
          mongo: obj1[key],
          firestore: obj2[key]
        };
      }
    }
  }
  
  return differences;
}

// Get MongoDB data for a collection
async function getMongoData(collectionName) {
  try {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    
    console.log(`Fetching data from MongoDB collection: ${collectionName} in database: ${mongoDbName}`);
    
    const db = mongoClient.db(mongoDbName);
    const collection = db.collection(collectionName);
    
    const documents = await collection.find({}).toArray();
    
    console.log(`Found ${documents.length} documents in MongoDB collection: ${collectionName}`);
    
    return documents;
  } catch (error) {
    console.error(`Error fetching MongoDB data for ${collectionName}:`, error);
    throw error;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

// Get Firestore data for a collection
async function getFirestoreData(collectionName) {
  try {
    console.log(`Fetching data from Firestore collection: ${collectionName}`);
    
    const collectionRef = firestoreDb.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
      console.log(`No documents found in Firestore collection: ${collectionName}`);
      return [];
    }
    
    const documents = snapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore timestamps to JS Dates
      Object.keys(data).forEach(key => {
        if (data[key] && typeof data[key].toDate === 'function') {
          data[key] = data[key].toDate();
        }
      });
      return { id: doc.id, ...data };
    });
    
    console.log(`Found ${documents.length} documents in Firestore collection: ${collectionName}`);
    
    return documents;
  } catch (error) {
    console.error(`Error fetching Firestore data for ${collectionName}:`, error);
    throw error;
  }
}

// Validate a single collection
async function validateCollection(collectionConfig) {
  console.log(`\nValidating collection: ${collectionConfig.name}...`);
  
  try {
    // Fetch data from both databases
    const mongoData = await getMongoData(collectionConfig.mongo);
    const firestoreData = await getFirestoreData(collectionConfig.firestore);
    
    // Create lookup maps by key field
    const mongoMap = new Map(mongoData.map(doc => [doc[collectionConfig.keyField], doc]));
    const firestoreMap = new Map(firestoreData.map(doc => [doc[collectionConfig.keyField], doc]));
    
    // Track validation results
    const results = {
      totalMongoDocuments: mongoData.length,
      totalFirestoreDocuments: firestoreData.length,
      matchingDocuments: 0,
      missingInFirestore: [],
      missingInMongo: [],
      differences: []
    };
    
    // Check for documents in MongoDB that are missing in Firestore
    for (const [key, mongoDoc] of mongoMap.entries()) {
      if (!firestoreMap.has(key)) {
        results.missingInFirestore.push({
          key,
          keyField: collectionConfig.keyField,
          mongoDoc
        });
      }
    }
    
    // Check for documents in Firestore that are missing in MongoDB
    for (const [key, firestoreDoc] of firestoreMap.entries()) {
      if (!mongoMap.has(key)) {
        results.missingInMongo.push({
          key,
          keyField: collectionConfig.keyField,
          firestoreDoc
        });
      }
    }
    
    // Compare matching documents
    for (const [key, mongoDoc] of mongoMap.entries()) {
      if (firestoreMap.has(key)) {
        results.matchingDocuments++;
        
        const firestoreDoc = firestoreMap.get(key);
        const diff = compareObjects(mongoDoc, firestoreDoc);
        
        if (Object.keys(diff).length > 0) {
          results.differences.push({
            key,
            keyField: collectionConfig.keyField,
            differences: diff
          });
        }
      }
    }
    
    // Print the results
    console.log(`\nValidation Results for ${collectionConfig.name}:`);
    console.log(`MongoDB Documents: ${results.totalMongoDocuments}`);
    console.log(`Firestore Documents: ${results.totalFirestoreDocuments}`);
    console.log(`Matching Documents: ${results.matchingDocuments}`);
    console.log(`Missing in Firestore: ${results.missingInFirestore.length}`);
    console.log(`Missing in MongoDB: ${results.missingInMongo.length}`);
    console.log(`Documents with Differences: ${results.differences.length}`);
    
    // Calculate match percentage
    const matchPercentage = results.totalMongoDocuments > 0 ? 
      (results.matchingDocuments / results.totalMongoDocuments) * 100 : 0;
    
    console.log(`Match Percentage: ${matchPercentage.toFixed(2)}%`);
    
    // Determine overall result
    const isValid = results.missingInFirestore.length === 0 && 
                    results.differences.length === 0;
    
    if (isValid) {
      console.log(`✅ Validation PASSED for ${collectionConfig.name}`);
    } else {
      console.log(`❌ Validation FAILED for ${collectionConfig.name}`);
      
      // Show details of issues
      if (results.missingInFirestore.length > 0) {
        console.log('\nDocuments missing in Firestore:');
        console.log(results.missingInFirestore.map(item => item.key).join(', '));
      }
      
      if (results.missingInMongo.length > 0) {
        console.log('\nDocuments missing in MongoDB (possibly new documents):');
        console.log(results.missingInMongo.map(item => item.key).join(', '));
      }
      
      if (results.differences.length > 0) {
        console.log('\nDocuments with differences:');
        results.differences.forEach(diff => {
          console.log(`- ${diff.key}: ${Object.keys(diff.differences).join(', ')}`);
        });
      }
    }
    
    // Save validation results to a file
    const resultsDir = path.join(process.cwd(), 'validation-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const resultsFile = path.join(resultsDir, `${collectionConfig.name}-validation-${timestamp}.json`);
    
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`Validation results saved to: ${resultsFile}`);
    
    return { isValid, results };
  } catch (error) {
    console.error(`Error validating collection ${collectionConfig.name}:`, error);
    return { isValid: false, error: error.message };
  }
}

// Validate all collections or a specific one
async function validateCollections(specificCollection = null) {
  console.log('Starting data validation between MongoDB and Firestore...');
  
  const collectionsToValidate = specificCollection ? 
    collections.filter(c => c.name === specificCollection) : 
    collections;
  
  if (collectionsToValidate.length === 0) {
    console.error(`Collection "${specificCollection}" not found`);
    process.exit(1);
  }
  
  const validationResults = {};
  
  for (const collection of collectionsToValidate) {
    const result = await validateCollection(collection);
    validationResults[collection.name] = result;
  }
  
  // Print overall summary
  console.log('\n==== VALIDATION SUMMARY ====');
  const allValid = Object.values(validationResults).every(result => result.isValid);
  
  if (allValid) {
    console.log('✅ All validations PASSED! Data is consistent between MongoDB and Firestore.');
    console.log('You can safely proceed with transitioning collections to Firestore-only mode.');
  } else {
    console.log('❌ Some validations FAILED. Please address the issues before proceeding.');
    
    // Show which collections failed
    Object.entries(validationResults).forEach(([name, result]) => {
      if (!result.isValid) {
        console.log(`- ${name}: Failed`);
      }
    });
  }
  
  return validationResults;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let collection = null;
  
  if (args.length > 0) {
    // Check if the argument is a valid collection
    if (collections.some(c => c.name === args[0])) {
      collection = args[0];
    } else {
      console.error(`Error: Unknown collection "${args[0]}"`);
      showUsage();
      process.exit(1);
    }
  }
  
  return { collection };
}

// Show usage information
function showUsage() {
  console.log(`
Usage: node validate-data.js [collection]

Arguments:
  collection   Optional collection name to validate
               Available collections: ${collections.map(c => c.name).join(', ')}

Examples:
  node validate-data.js             # Validate all collections
  node validate-data.js waitlist    # Validate only the waitlist collection
`);
}

// Main script
async function main() {
  try {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      showUsage();
      process.exit(0);
    }
    
    const { collection } = parseArgs();
    
    if (collection) {
      console.log(`Validating collection: ${collection}`);
    } else {
      console.log('Validating all collections');
    }
    
    await validateCollections(collection);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 