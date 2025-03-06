/**
 * Firebase Environment Variables Check
 * 
 * This script checks for the presence and format of Firebase-related environment variables.
 */

import * as dotenv from 'dotenv';
import { diagnosePrivateKey } from '../src/lib/key-fixer';

// Load environment variables
dotenv.config();

console.log('=== Firebase Environment Variables Check ===');
console.log('Environment:', process.env.NODE_ENV);

// Check Firebase-related environment variables
console.log('\nChecking Firebase-related environment variables:');
const envVars = Object.keys(process.env)
  .filter(key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP'))
  .sort();

if (envVars.length === 0) {
  console.log('❌ No Firebase-related environment variables found');
} else {
  console.log(`✅ Found ${envVars.length} Firebase-related environment variables:`);
  
  envVars.forEach(key => {
    const value = process.env[key];
    if (!value) {
      console.log(`❌ ${key}: MISSING OR EMPTY`);
    } else if (key.toLowerCase().includes('key')) {
      // For private keys, check format but don't log the actual value
      console.log(`✅ ${key}: [PRESENT] (${value.length} characters)`);
      
      if (key === 'FIREBASE_PRIVATE_KEY') {
        // Diagnose private key format
        const diagnosis = diagnosePrivateKey(value);
        console.log('   - Private Key Diagnosis:');
        Object.entries(diagnosis).forEach(([k, v]) => {
          const status = typeof v === 'boolean' ? (v ? '✅' : '❌') : v;
          console.log(`     ${k}: ${status}`);
        });
      }
    } else {
      console.log(`✅ ${key}: ${value}`);
    }
  });
}

// Check for core required variables
console.log('\nChecking core required variables:');
const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

let missingRequired = false;
requiredVars.forEach(key => {
  if (!process.env[key]) {
    console.log(`❌ Missing required variable: ${key}`);
    missingRequired = true;
  } else {
    console.log(`✅ Found required variable: ${key}`);
  }
});

if (missingRequired) {
  console.log('\n⚠️ Some required variables are missing. Firebase authentication will likely fail.');
} else {
  console.log('\n✅ All core required variables are present. Now checking format...');
  
  // Check private key format
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
      console.log('⚠️ FIREBASE_PRIVATE_KEY contains escaped newlines (\\n) but no actual newlines.');
      console.log('   This is a common issue that needs to be fixed.');
    } else if (privateKey.includes('\n')) {
      console.log('✅ FIREBASE_PRIVATE_KEY contains actual newlines.');
    }
    
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.log('❌ FIREBASE_PRIVATE_KEY is missing BEGIN marker. This is invalid.');
    }
    
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      console.log('❌ FIREBASE_PRIVATE_KEY is missing END marker. This is invalid.');
    }
  }
}

console.log('\n=== End of Firebase Environment Check ==='); 