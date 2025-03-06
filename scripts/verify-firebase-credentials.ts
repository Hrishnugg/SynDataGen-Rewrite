/**
 * Firebase Credentials Verification Script
 * 
 * This script tests Firebase credentials by attempting to connect
 * to Firestore and perform a simple operation.
 */

import * as admin from 'firebase-admin';
import { getFirebaseCredentials, areFirebaseCredentialsAvailable } from '../src/lib/services/credential-manager';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function verifyFirebaseCredentials() {
  console.log('=== Firebase Credentials Verification ===');
  console.log('Environment: ', process.env.NODE_ENV);
  
  // Check for environment variables
  console.log('\nChecking environment variables...');
  const envVars = Object.keys(process.env)
    .filter(key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP'))
    .map(key => {
      if (key.toLowerCase().includes('key')) {
        return `${key}: [REDACTED]`;
      }
      return `${key}: ${process.env[key]}`;
    });
  
  if (envVars.length > 0) {
    console.log('Found Firebase/Google related environment variables:');
    envVars.forEach(v => console.log(`- ${v}`));
  } else {
    console.log('No Firebase/Google related environment variables found');
  }
  
  // Check if credentials are available
  console.log('\nChecking if Firebase credentials are available...');
  const hasCredentials = areFirebaseCredentialsAvailable();
  console.log(`Credentials available: ${hasCredentials ? 'YES' : 'NO'}`);
  
  if (!hasCredentials) {
    console.error('No Firebase credentials available. Cannot proceed with verification.');
    process.exit(1);
  }
  
  // Try to get credentials
  console.log('\nAttempting to retrieve credentials...');
  try {
    const credentials = await getFirebaseCredentials();
    console.log('Successfully retrieved credentials:');
    console.log(`- Source: ${credentials.source || 'unknown'}`);
    console.log(`- Project ID: ${credentials.project_id || 'N/A'}`);
    console.log(`- Client Email: ${credentials.client_email ? '✓ Present' : '❌ Missing'}`);
    console.log(`- Private Key: ${credentials.private_key ? '✓ Present' : '❌ Missing'}`);
    
    // Test actual Firebase initialization
    console.log('\nAttempting to initialize Firebase...');
    let app;
    
    if (credentials.useAppDefault) {
      console.log('Using application default credentials');
      app = admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    } else if (credentials.private_key && credentials.client_email) {
      console.log('Using service account credentials');
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          privateKey: credentials.private_key,
        }),
      });
    } else {
      throw new Error('Invalid credential format - missing required fields');
    }
    
    // Test Firestore connection
    console.log('\nAttempting to connect to Firestore...');
    const db = admin.firestore();
    
    // Try a simple operation
    console.log('Attempting to perform a simple operation...');
    const testCollection = db.collection('_verification_test');
    const timestamp = new Date().toISOString();
    
    // Write test
    await testCollection.doc('test-doc').set({
      timestamp,
      message: 'Verification successful'
    });
    console.log('✓ Write operation successful');
    
    // Read test
    const docRef = await testCollection.doc('test-doc').get();
    const data = docRef.data();
    console.log('✓ Read operation successful');
    console.log(`Retrieved data: ${JSON.stringify(data)}`);
    
    // Cleanup
    await testCollection.doc('test-doc').delete();
    console.log('✓ Delete operation successful');
    
    console.log('\n✅ VERIFICATION SUCCESSFUL: Firebase credentials are valid and working');
    
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED');
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the verification
verifyFirebaseCredentials().catch(error => {
  console.error('Unhandled error during verification:', error);
  process.exit(1);
}); 