#!/usr/bin/env node
/**
 * Migration Control CLI
 * 
 * This command-line tool helps manage the migration from MongoDB to Firestore
 * by allowing control over which database is used for which collections.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Command } from 'commander';
import { setCollectionBackend, setGlobalBackend } from '../../lib/services/db-service';

// Load environment variables
dotenv.config();

// Define available collections
const COLLECTIONS = [
  'customers',
  'waitlist',
  'projects',
  'dataGenerationJobs'
];

// Create a new command-line program
const program = new Command();

program
  .name('migration-control')
  .description('Control database backend selection for migration')
  .version('1.0.0');

// Command to switch a collection to use a specific backend
program
  .command('use')
  .description('Set database backend for a collection')
  .argument('<collection>', 'Collection name (or "all" for all collections)')
  .argument('<backend>', 'Backend to use: mongodb, firestore, or both')
  .option('-p, --persist', 'Save setting to .env file')
  .action((collection, backend, options) => {
    // Validate backend
    if (!['mongodb', 'firestore', 'both'].includes(backend)) {
      console.error('Error: Backend must be one of: mongodb, firestore, both');
      process.exit(1);
    }
    
    // Apply to all collections or a specific one
    if (collection === 'all') {
      console.log(`Setting all collections to use ${backend}...`);
      setGlobalBackend(backend as 'mongodb' | 'firestore' | 'both');
      
      // Update each collection in .env if specified
      if (options.persist) {
        updateEnvFile('all', backend);
      }
    } else {
      // Validate collection
      if (!COLLECTIONS.includes(collection)) {
        console.error(`Error: Unknown collection "${collection}". Available collections: ${COLLECTIONS.join(', ')}, or "all"`);
        process.exit(1);
      }
      
      console.log(`Setting collection "${collection}" to use ${backend}...`);
      setCollectionBackend(collection, backend as 'mongodb' | 'firestore' | 'both');
      
      // Update .env if specified
      if (options.persist) {
        updateEnvFile(collection, backend);
      }
    }
    
    console.log('Done!');
  });

// Command to show the current backend configuration
program
  .command('status')
  .description('Show current backend selection for all collections')
  .action(() => {
    console.log('Current Database Backend Configuration:');
    console.log('=====================================');
    console.log(`GCP Features Enabled: ${process.env.NEXT_PUBLIC_ENABLE_GCP_FEATURES === 'true' ? 'Yes' : 'No'}`);
    console.log();
    
    // Read .env file to get current persistent settings
    const envPath = path.resolve(process.cwd(), '.env');
    let envSettings: Record<string, string> = {};
    
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
    
    // Show current settings for each collection
    COLLECTIONS.forEach(collection => {
      const envKey = `COLLECTION_${collection.toUpperCase()}_BACKEND`;
      const persistedSetting = envSettings[envKey] || (process.env.NEXT_PUBLIC_ENABLE_GCP_FEATURES === 'true' ? 'firestore' : 'mongodb');
      
      console.log(`${collection.padEnd(20)} ${persistedSetting}`);
    });
  });

// Command to enable/disable GCP features globally
program
  .command('gcp')
  .description('Enable or disable GCP features (including Firestore)')
  .argument('<state>', 'Either "enable" or "disable"')
  .option('-p, --persist', 'Save setting to .env file')
  .action((state, options) => {
    if (state !== 'enable' && state !== 'disable') {
      console.error('Error: State must be either "enable" or "disable"');
      process.exit(1);
    }
    
    const enabled = state === 'enable';
    console.log(`${enabled ? 'Enabling' : 'Disabling'} GCP features...`);
    
    // Set environment variable
    process.env.NEXT_PUBLIC_ENABLE_GCP_FEATURES = enabled ? 'true' : 'false';
    
    // Update backend for all collections based on GCP state
    setGlobalBackend(enabled ? 'firestore' : 'mongodb');
    
    // Update .env if specified
    if (options.persist) {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        let envFile = fs.readFileSync(envPath, 'utf8');
        
        // Check if the variable already exists
        const regex = /^NEXT_PUBLIC_ENABLE_GCP_FEATURES=.*/m;
        if (regex.test(envFile)) {
          // Replace existing variable
          envFile = envFile.replace(regex, `NEXT_PUBLIC_ENABLE_GCP_FEATURES=${enabled ? 'true' : 'false'}`);
        } else {
          // Add new variable
          envFile += `\nNEXT_PUBLIC_ENABLE_GCP_FEATURES=${enabled ? 'true' : 'false'}`;
        }
        
        fs.writeFileSync(envPath, envFile);
        console.log(`Updated .env file with NEXT_PUBLIC_ENABLE_GCP_FEATURES=${enabled ? 'true' : 'false'}`);
      } else {
        console.warn('Warning: .env file not found, could not persist setting');
      }
    }
    
    console.log('Done!');
  });

// Command to set up dual-write mode (writing to both databases)
program
  .command('dual-write')
  .description('Enable dual-write mode (writing to both MongoDB and Firestore)')
  .option('-c, --collections <collections>', 'Comma-separated list of collections to enable dual-write for', 'all')
  .option('-p, --persist', 'Save setting to .env file')
  .action((options) => {
    console.log('Setting up dual-write mode...');
    
    const collections = options.collections === 'all' ? COLLECTIONS : options.collections.split(',');
    
    collections.forEach((collection: string) => {
      if (COLLECTIONS.includes(collection)) {
        console.log(`Enabling dual-write for ${collection}...`);
        setCollectionBackend(collection, 'both');
        
        // Update .env if specified
        if (options.persist) {
          updateEnvFile(collection, 'both');
        }
      } else {
        console.warn(`Warning: Unknown collection "${collection}", skipping`);
      }
    });
    
    console.log('Done!');
  });

// Helper function to update the .env file
function updateEnvFile(collection: string, backend: string): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('Warning: .env file not found, could not persist setting');
    return;
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
        // Add new variable
        envFile += `\n${envKey}=${backend}`;
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
      // Add new variable
      envFile += `\n${envKey}=${backend}`;
    }
  }
  
  fs.writeFileSync(envPath, envFile);
  console.log(`Updated .env file with backend settings`);
}

// Parse command-line arguments
program.parse(); 