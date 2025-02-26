/**
 * Set Database Backend
 * 
 * This script sets the database backend for a collection by updating the .env file.
 * It supports setting a single collection or all collections to use mongodb, firestore, or both.
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

// Define valid backends
const VALID_BACKENDS = ['mongodb', 'firestore', 'both'];

/**
 * Update the .env file with backend settings
 * @param {string} collection - Collection name or "all"
 * @param {string} backend - Backend to use: "mongodb", "firestore", or "both"
 */
function updateEnvFile(collection, backend) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found');
    process.exit(1);
  }
  
  let envFile = fs.readFileSync(envPath, 'utf8');
  
  if (collection === 'all') {
    // Update all collections
    COLLECTIONS.forEach(coll => {
      const envKey = `COLLECTION_${coll.toUpperCase()}_BACKEND`;
      const regex = new RegExp(`^${envKey}=.*`, 'm');
      
      if (regex.test(envFile)) {
        // Replace existing variable
        envFile = envFile.replace(regex, `${envKey}=${backend}`);
      } else {
        // Find collection backend section
        const sectionRegex = /# Collection Backend Settings/;
        if (sectionRegex.test(envFile)) {
          // Add under this section
          const parts = envFile.split(sectionRegex);
          envFile = `${parts[0]}# Collection Backend Settings\n${envKey}=${backend}${parts[1]}`;
        } else {
          // Add anywhere
          envFile += `\n${envKey}=${backend}`;
        }
      }
    });
  } else {
    // Update a specific collection
    const envKey = `COLLECTION_${collection.toUpperCase()}_BACKEND`;
    const regex = new RegExp(`^${envKey}=.*`, 'm');
    
    if (regex.test(envFile)) {
      // Replace existing variable
      envFile = envFile.replace(regex, `${envKey}=${backend}`);
    } else {
      // Find collection backend section
      const sectionRegex = /# Collection Backend Settings/;
      if (sectionRegex.test(envFile)) {
        // Add under this section
        const parts = envFile.split(sectionRegex);
        envFile = `${parts[0]}# Collection Backend Settings\n${envKey}=${backend}${parts[1]}`;
      } else {
        // Add anywhere
        envFile += `\n${envKey}=${backend}`;
      }
    }
  }
  
  fs.writeFileSync(envPath, envFile);
  console.log(`Updated .env file with backend settings`);
}

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Error: Missing required arguments');
    showUsage();
    process.exit(1);
  }
  
  const collection = args[0];
  const backend = args[1];
  
  // Validate collection
  if (collection !== 'all' && !COLLECTIONS.includes(collection)) {
    console.error(`Error: Unknown collection "${collection}". Available collections: ${COLLECTIONS.join(', ')}, or "all"`);
    process.exit(1);
  }
  
  // Validate backend
  if (!VALID_BACKENDS.includes(backend)) {
    console.error(`Error: Invalid backend "${backend}". Must be one of: ${VALID_BACKENDS.join(', ')}`);
    process.exit(1);
  }
  
  return { collection, backend };
}

// Show usage information
function showUsage() {
  console.log(`
Usage: node set-backend.js <collection> <backend>

Arguments:
  collection   Collection name or "all" for all collections
               Available collections: ${COLLECTIONS.join(', ')}
  backend      Backend to use: mongodb, firestore, or both

Examples:
  node set-backend.js waitlist both        # Enable dual-write for waitlist collection
  node set-backend.js all firestore        # Set all collections to use Firestore
  node set-backend.js customers mongodb    # Set customers collection to use MongoDB
`);
}

// Main script
function main() {
  try {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      showUsage();
      process.exit(0);
    }
    
    const { collection, backend } = parseArgs();
    console.log(`Setting ${collection === 'all' ? 'all collections' : `collection "${collection}"`} to use ${backend}...`);
    
    updateEnvFile(collection, backend);
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main(); 