/**
 * Firebase Private Key Fix Script
 * 
 * This is a standalone script to fix Firebase private key formatting issues
 * and update the .env.local file.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('=== FIREBASE PRIVATE KEY FIX SCRIPT ===');

// Check if private key exists
if (!process.env.FIREBASE_PRIVATE_KEY) {
  console.error('FIREBASE_PRIVATE_KEY not found in .env.local');
  process.exit(1);
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
console.log('Original private key length:', privateKey.length);
console.log('Private key starts with:', privateKey.substring(0, 30));
console.log('Private key ends with:', privateKey.substring(privateKey.length - 30));

// Process the key
let processedKey = privateKey;

// Remove surrounding quotes if present
if (processedKey.startsWith('"') && processedKey.endsWith('"')) {
  console.log('Removing surrounding quotes');
  processedKey = processedKey.slice(1, -1);
}

// Replace escaped newlines with actual newlines
if (processedKey.includes('\\n')) {
  console.log('Replacing \\n with actual newlines');
  processedKey = processedKey.replace(/\\n/g, '\n');
}

// Check if the key is properly formatted
const isFormatted = processedKey.startsWith('-----BEGIN PRIVATE KEY-----') && 
                    processedKey.endsWith('-----END PRIVATE KEY-----') &&
                    processedKey.includes('\n');

console.log('Key properly formatted:', isFormatted);

// If not properly formatted, try a more aggressive approach
if (!isFormatted) {
  console.log('Attempting last-resort formatting fix...');
  
  // Strip all non-base64 characters to get just the key content
  const base64Pattern = /[A-Za-z0-9+/=]+/g;
  const matches = processedKey.match(base64Pattern);
  
  if (!matches || matches.length === 0) {
    console.error('Could not extract base64 content from key');
    process.exit(1);
  }
  
  // Join all base64 parts
  const base64Content = matches.join('');
  
  // Reformat with proper BEGIN/END markers and newlines
  processedKey = `-----BEGIN PRIVATE KEY-----\n${base64Content}\n-----END PRIVATE KEY-----`;
  
  console.log('Reformatted key length:', processedKey.length);
  console.log('Reformatted key starts with:', processedKey.substring(0, 30));
  console.log('Reformatted key ends with:', processedKey.substring(processedKey.length - 30));
}

// Check the final key
const finalValidation = processedKey.startsWith('-----BEGIN PRIVATE KEY-----') && 
                        processedKey.endsWith('-----END PRIVATE KEY-----') &&
                        processedKey.includes('\n');

console.log('Final key validation:', finalValidation);

if (!finalValidation) {
  console.error('Failed to fix private key format');
  process.exit(1);
}

// Read the current .env.local file
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Replace the private key line with the fixed key
const privateKeyLinePattern = /^FIREBASE_PRIVATE_KEY=.*/m;
const fixedLine = `FIREBASE_PRIVATE_KEY="${processedKey.replace(/\n/g, '\\n')}"`;

// Create updated content
const updatedContent = envContent.replace(privateKeyLinePattern, fixedLine);

// Write the updated content back to .env.local
fs.writeFileSync(envPath, updatedContent, 'utf8');

console.log('Updated .env.local with fixed private key');
console.log('=== DONE ===');