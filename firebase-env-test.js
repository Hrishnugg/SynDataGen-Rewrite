/**
 * Firebase Credentials Test Script
 * Simple script to test Firebase credential loading
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('=== FIREBASE CREDENTIALS TEST ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('MOCK_FIREBASE:', process.env.MOCK_FIREBASE);

// Check Firebase service account
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log('FIREBASE_SERVICE_ACCOUNT present:', !!serviceAccount);

// Check Firebase project ID
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID;
console.log('Project ID:', projectId);

// Check Firebase client email
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
console.log('Client Email present:', !!clientEmail);
if (clientEmail) console.log('Client Email:', clientEmail);

// Check Firebase private key (safely)
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
console.log('Private Key present:', !!privateKey);
if (privateKey) {
  console.log('Private Key length:', privateKey.length);
  console.log('Private Key starts with:', privateKey.substring(0, 35));
  console.log('Private Key ends with:', privateKey.substring(privateKey.length - 30));
  console.log('Contains BEGIN marker:', privateKey.includes('BEGIN PRIVATE KEY'));
  console.log('Contains END marker:', privateKey.includes('END PRIVATE KEY'));
  console.log('Contains \\n:', privateKey.includes('\\n'));
  console.log('Contains actual newlines:', privateKey.includes('\n'));
  
  // Process the key
  let processedKey = privateKey;
  
  // Remove surrounding quotes if present
  if (processedKey.startsWith('"') && processedKey.endsWith('"')) {
    console.log('Removing surrounding quotes');
    processedKey = processedKey.slice(1, -1);
  }
  
  // Replace escaped newlines
  if (processedKey.includes('\\n')) {
    console.log('Replacing escaped newlines');
    processedKey = processedKey.replace(/\\n/g, '\n');
  }
  
  // Check processed key
  console.log('Processed key length:', processedKey.length);
  console.log('Processed key starts with:', processedKey.substring(0, 35));
  console.log('Processed key ends with:', processedKey.substring(processedKey.length - 30));
  console.log('Processed key has BEGIN marker:', processedKey.includes('-----BEGIN PRIVATE KEY-----'));
  console.log('Processed key has END marker:', processedKey.includes('-----END PRIVATE KEY-----'));
  
  // Test a complete reformat approach
  console.log('\nTrying last-resort reformat:');
  // Extract just the base64 content (remove all non-base64 chars)
  const base64Content = processedKey.replace(/[^A-Za-z0-9+/=]/g, '');
  // Create a properly formatted key
  const reformattedKey = `-----BEGIN PRIVATE KEY-----\n${base64Content}\n-----END PRIVATE KEY-----`;
  console.log('Reformatted key starts with:', reformattedKey.substring(0, 35));
  console.log('Reformatted key ends with:', reformattedKey.substring(reformattedKey.length - 30));
  console.log('Reformatted key format valid:', 
    reformattedKey.startsWith('-----BEGIN PRIVATE KEY-----') && 
    reformattedKey.endsWith('-----END PRIVATE KEY-----') &&
    reformattedKey.includes('\n'));
}

console.log('\n=== TEST COMPLETE ===');