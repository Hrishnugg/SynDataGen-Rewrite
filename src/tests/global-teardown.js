/**
 * Global teardown file that runs once after all tests
 * This is used to clean up any resources that were created during tests
 */

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fetch = require('node-fetch');

// Clear both emulators
async function clearEmulators() {
  try {
    // Clear Firestore
    await fetch('http://localhost:8080/emulator/v1/projects/syndatagen-test/databases/(default)/documents', {
      method: 'DELETE'
    });
    
    // Clear Auth
    await fetch('http://localhost:9099/emulator/v1/projects/syndatagen-test/accounts', {
      method: 'DELETE'
    });
    
    console.log('✅ Emulators cleared successfully');
  } catch (error) {
    console.error('Error clearing emulators:', error);
  }
}

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clear emulators
    await clearEmulators();
    
    // We don't stop the emulators here as they might be used by other tests or dev
    // If you want to stop them, uncomment the following line:
    // await exec('npx firebase emulators:stop');
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('Error during test environment cleanup:', error);
  }
}; 