/**
 * Global setup file that runs once before all tests
 * This is different from setupFilesAfterEnv which runs before each test file
 */

const { spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const exec = promisify(require('child_process').exec);

// Check if Firebase tools are installed
async function checkFirebaseTools() {
  try {
    await exec('npx firebase --version');
    return true;
  } catch (error) {
    console.log('Firebase tools not found, installing...');
    try {
      await exec('npm install -g firebase-tools');
      return true;
    } catch (installError) {
      console.error('Failed to install Firebase tools:', installError);
      return false;
    }
  }
}

module.exports = async () => {
  console.log('🔧 Setting up test environment...');
  
  // Set environment variables
  process.env.NODE_ENV = 'test';
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  
  // Check if we need to install Firebase tools
  const hasFirebaseTools = await checkFirebaseTools();
  if (!hasFirebaseTools) {
    console.error('Firebase tools are required for tests. Please install manually with: npm install -g firebase-tools');
    process.exit(1);
  }
  
  console.log('✅ Test environment setup complete');
}; 