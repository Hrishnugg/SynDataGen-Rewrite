/**
 * Backend Status Check
 * 
 * This script checks the current backend status for collections
 * by reading configuration from environment variables.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define available collections
const COLLECTIONS = [
  'customers',
  'waitlist',
  'projects',
  'dataGenerationJobs'
];

// Read environment variables
const isGcpEnabled = process.env.NEXT_PUBLIC_ENABLE_GCP_FEATURES === 'true';

// Read current settings from .env file
function readEnvSettings() {
  const envPath = path.resolve(process.cwd(), '.env');
  let envSettings = {};
  
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/^["'](.*)["']$/, '$1');
          envSettings[key] = value;
        }
      }
    });
  }
  
  return envSettings;
}

// Display the current status of collection backends
function displayStatus() {
  const envSettings = readEnvSettings();
  
  console.log('Current Database Backend Configuration:');
  console.log('=====================================');
  console.log(`GCP Features Enabled: ${isGcpEnabled ? 'Yes' : 'No'}`);
  console.log();
  
  // Show settings for each collection
  console.log(`Collection               Backend`);
  console.log(`---------               -------`);
  COLLECTIONS.forEach(collection => {
    const envKey = `COLLECTION_${collection.toUpperCase()}_BACKEND`;
    const persistedSetting = envSettings[envKey] || (isGcpEnabled ? 'firestore' : 'mongodb');
    
    console.log(`${collection.padEnd(25)} ${persistedSetting}`);
  });
}

// Main script
function main() {
  try {
    displayStatus();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 