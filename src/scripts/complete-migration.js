/**
 * Complete Migration Helper
 * 
 * This script guides through the full migration process for a collection:
 * 1. Validates data consistency
 * 2. Transitions to Firestore-only mode if validation passes
 * 3. Runs final checks
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Collection names
const COLLECTIONS = [
  'waitlist',
  'projects',
  'dataGenerationJobs',
  'customers'
];

// Helper to run a command and log the output
function runCommand(command) {
  console.log(`\nRunning: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return { success: true, output };
  } catch (error) {
    console.error('Command failed:');
    console.error(error.stdout || error.message);
    return { success: false, error };
  }
}

// Ask a yes/no question
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Validate data for a collection
async function validateData(collection) {
  console.log(`\n=== Validating data for collection: ${collection} ===`);
  
  const result = runCommand(`npm run validate:data ${collection}`);
  
  return result.success;
}

// Set backend for a collection
async function setBackend(collection, backend) {
  console.log(`\n=== Changing backend for ${collection} to ${backend} ===`);
  
  const result = runCommand(`npm run backend:set -- ${collection} ${backend}`);
  
  return result.success;
}

// Run tests for the collection
async function runTests(collection) {
  console.log(`\n=== Running tests for collection: ${collection} ===`);
  
  // For waitlist, we have a specific test
  if (collection === 'waitlist') {
    return runCommand(`npm run test:waitlist-dual-write`).success;
  }
  
  // For other collections, we'd need to define specific tests
  // This could be expanded in the future with more specific tests
  console.log(`No specific test available for ${collection}. Running general Firestore test...`);
  return runCommand(`npm run firestore:test:js`).success;
}

// Backup Firestore data
async function backupFirestore() {
  console.log(`\n=== Creating Firestore backup ===`);
  
  return runCommand(`npm run backup:firestore`).success;
}

// Complete the migration for a single collection
async function migrateCollection(collection) {
  console.log(`\n================================================`);
  console.log(`   STARTING MIGRATION FOR ${collection.toUpperCase()}`);
  console.log(`================================================\n`);
  
  // Step 1: Verify current backend status
  runCommand(`npm run backend:status`);
  
  // Step L: Make sure we're in dual-write mode first
  const confirmDualWrite = await askQuestion(`Confirm that ${collection} is in dual-write mode?`);
  if (!confirmDualWrite) {
    console.log(`Setting ${collection} to dual-write mode first...`);
    if (!await setBackend(collection, 'both')) {
      console.log(`Failed to set ${collection} to dual-write mode. Aborting.`);
      return false;
    }
  }
  
  // Step 2: Validate data consistency
  console.log(`\nStep 1: Data Validation`);
  const validationPassed = await validateData(collection);
  
  if (!validationPassed) {
    const proceed = await askQuestion(`Validation failed. Do you want to proceed anyway?`);
    if (!proceed) {
      console.log('Migration aborted. Please fix data consistency issues and try again.');
      return false;
    }
  } else {
    console.log('Validation passed!');
  }
  
  // Step 3: Create backup
  console.log(`\nStep 2: Creating Backup`);
  const backupSuccess = await backupFirestore();
  
  if (!backupSuccess) {
    const proceed = await askQuestion('Backup failed. Do you want to proceed without a backup?');
    if (!proceed) {
      console.log('Migration aborted. Please fix backup issues and try again.');
      return false;
    }
  }
  
  // Step 4: Switch to Firestore-only mode
  console.log(`\nStep 3: Transitioning to Firestore-only mode`);
  console.log(`This will set ${collection} to use only Firestore.`);
  
  const confirmTransition = await askQuestion('Are you sure you want to proceed?');
  if (!confirmTransition) {
    console.log('Migration aborted. Collection will remain in dual-write mode.');
    return false;
  }
  
  if (!await setBackend(collection, 'firestore')) {
    console.log(`Failed to set ${collection} to Firestore-only mode. Aborting.`);
    return false;
  }
  
  // Step 5: Run tests
  console.log(`\nStep 4: Running tests with Firestore-only mode`);
  const testsSuccess = await runTests(collection);
  
  if (!testsSuccess) {
    console.log('Tests failed. Rolling back to dual-write mode...');
    await setBackend(collection, 'both');
    console.log('Rolled back to dual-write mode.');
    
    console.log('Migration failed. Please fix issues and try again.');
    return false;
  }
  
  // Step 6: Final confirmation
  console.log(`\nStep 5: Final Confirmation`);
  const finalConfirm = await askQuestion(`Is ${collection} working correctly with Firestore-only mode?`);
  
  if (!finalConfirm) {
    console.log('Rolling back to dual-write mode...');
    await setBackend(collection, 'both');
    console.log('Rolled back to dual-write mode.');
    
    console.log('Migration aborted based on final confirmation.');
    return false;
  }
  
  // Migration completed successfully
  console.log(`\n==============================================`);
  console.log(`   MIGRATION COMPLETED FOR ${collection.toUpperCase()}`);
  console.log(`==============================================`);
  console.log(`${collection} is now using Firestore-only mode.`);
  
  return true;
}

// Complete the migration for all collections in order
async function migrateAllCollections() {
  console.log('Starting migration of all collections to Firestore-only mode...');
  
  for (const collection of COLLECTIONS) {
    console.log(`\nPreparing to migrate collection: ${collection}`);
    const proceed = await askQuestion(`Do you want to proceed with migrating ${collection}?`);
    
    if (proceed) {
      const success = await migrateCollection(collection);
      if (!success) {
        console.log(`Migration of ${collection} failed or was aborted.`);
        const continueNext = await askQuestion('Do you want to continue with the next collection?');
        if (!continueNext) {
          console.log('Migration process stopped. Some collections are still in dual-write or MongoDB mode.');
          break;
        }
      }
    } else {
      console.log(`Skipping migration of ${collection}...`);
    }
  }
  
  // Final status check
  console.log('\nMigration process completed. Current backend status:');
  runCommand(`npm run backend:status`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let collection = null;
  
  if (args.length > 0) {
    // Check if the argument is a valid collection
    if (COLLECTIONS.includes(args[0])) {
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
Usage: node complete-migration.js [collection]

Arguments:
  collection   Optional collection name to migrate
               Available collections: ${COLLECTIONS.join(', ')}

Examples:
  node complete-migration.js             # Migrate all collections in sequence
  node complete-migration.js waitlist    # Migrate only the waitlist collection
`);
}

// Main script
async function main() {
  try {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      showUsage();
      rl.close();
      process.exit(0);
    }
    
    const { collection } = parseArgs();
    
    if (collection) {
      console.log(`Migrating single collection: ${collection}`);
      await migrateCollection(collection);
    } else {
      console.log('Migrating all collections in sequence');
      await migrateAllCollections();
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
  }
}

// Run the script
main(); 