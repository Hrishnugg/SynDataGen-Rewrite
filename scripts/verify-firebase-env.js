/**
 * Firebase Environment Verification Script
 * 
 * This script verifies that Firebase can be initialized properly using environment variables,
 * without relying on the service account file. This helps ensure the setup will work on Vercel.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

console.log('Verifying Firebase authentication using environment variables...');

// First, check if required environment variables are present
const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Error: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`- ${varName}`));
  console.error('Please run "node scripts/setup-firebase-env.js" first.');
  process.exit(1);
}

console.log('All required environment variables are present.');

// Verify the private key format
if (process.env.FIREBASE_PRIVATE_KEY.includes('\\n')) {
  console.log('Note: FIREBASE_PRIVATE_KEY contains escaped newlines. Converting...');
  process.env.FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
}

// Try to initialize Firebase with environment variables
try {
  console.log('Initializing Firebase using environment variables...');
  
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
    })
  });
  
  // Try to access Firestore
  console.log('Connecting to Firestore...');
  const db = getFirestore(app);
  
  // Simple test query
  console.log('Executing test query...');
  db.collection('test').limit(1).get()
    .then(() => {
      console.log('\n✅ Success! Firebase is properly configured with environment variables.');
      console.log('This setup will work correctly when deployed to Vercel.');
      console.log('\nTo deploy to Vercel, make sure to add these environment variables in your Vercel project settings:');
      console.log('- FIREBASE_PROJECT_ID');
      console.log('- FIREBASE_CLIENT_EMAIL');
      console.log('- FIREBASE_PRIVATE_KEY (make sure to include the quotes and all line breaks)');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error connecting to Firestore:', error.message);
      console.error('The environment variables are present but there may be an issue with their content or permissions.');
      process.exit(1);
    });
} catch (error) {
  console.error('\n❌ Error initializing Firebase:', error.message);
  console.error('There may be an issue with the environment variable content.');
  process.exit(1);
} 