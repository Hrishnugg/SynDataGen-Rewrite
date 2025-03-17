/**
 * Environment Variables Loader
 * 
 * This script ensures that environment variables from the .env file 
 * are properly loaded before other operations.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Environment file not found at: ${filePath}`);
      return false;
    }
    
    const result = dotenv.config({ path: filePath });
    
    if (result.error) {
      console.error(`Error loading environment file: ${result.error.message}`);
      return false;
    }
    
    console.log(`Successfully loaded environment variables from: ${filePath}`);
    console.log('Loaded variables:', Object.keys(result.parsed).join(', '));
    return true;
  } catch (error) {
    console.error(`Unexpected error loading environment file: ${error.message}`);
    return false;
  }
}

// Find and load the appropriate .env file
function loadEnv() {
  const rootDir = process.cwd();
  
  console.log('Current working directory:', rootDir);
  
  // Try to load environment variables from various locations
  const envPaths = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.join(rootDir, '.env.development'),
    path.join(rootDir, '.env.development.local')
  ];
  
  let loaded = false;
  for (const envPath of envPaths) {
    if (loadEnvFile(envPath)) {
      loaded = true;
    }
  }
  
  if (!loaded) {
    console.warn('No environment files were successfully loaded');
  }
  
  // Check if key environment variables are set after loading
  const criticalVars = [
    'GOOGLE_APPLICATION_CREDENTIALS',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ];
  
  console.log('\nEnvironment variable check:');
  criticalVars.forEach(varName => {
    if (process.env[varName]) {
      if (varName.includes('KEY')) {
        console.log(`✅ ${varName} is set (${process.env[varName].length} characters)`);
      } else {
        console.log(`✅ ${varName} is set: ${process.env[varName]}`);
      }
    } else {
      console.log(`❌ ${varName} is NOT set`);
    }
  });
  
  return loaded;
}

// Run immediately if this script is executed directly
if (require.main === module) {
  loadEnv();
}

module.exports = { loadEnv }; 