#!/usr/bin/env ts-node
/**
 * Firestore Backup CLI
 * 
 * A command-line interface for Firestore backup and restore operations.
 * 
 * Usage:
 *   ts-node backup-cli.ts backup [options]
 *   ts-node backup-cli.ts restore [options]
 *   ts-node backup-cli.ts list [options]
 */

// Import dotenv using require syntax instead of ES modules
const dotenv = require('dotenv');
dotenv.config();

import * as backup from './backup';
import * as fs from 'fs';
import * as path from 'path';
import readline from 'readline';

// Command-line arguments
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

// Initialize readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default options
const defaultOptions = {
  bucketName: process.env.GCP_BACKUP_BUCKET || `${process.env.GCP_PROJECT}-firestore-backups`,
  backupPrefix: `backup-${new Date().toISOString().split('T')[0]}`,
  collections: ['customers', 'waitlist', 'projects', 'dataGenerationJobs']
};

/**
 * Display help text
 */
function displayHelp() {
  console.log(`
Firestore Backup CLI

Usage:
  ts-node backup-cli.ts <command> [options]

Commands:
  backup    Create a Firestore backup
  restore   Restore a Firestore backup
  list      List available backups
  help      Display this help information

Options:
  --bucket=<bucket-name>     Cloud Storage bucket name
  --prefix=<prefix>          Backup prefix
  --collections=<coll1,coll2> Comma-separated collection IDs
  --uri=<backup-uri>         Backup URI (for restore)
  --file=<file-path>         Local JSON file path for export/import

Examples:
  ts-node backup-cli.ts backup --bucket=my-bucket --collections=users,posts
  ts-node backup-cli.ts restore --uri=gs://my-bucket/backups/2023-04-01/
  ts-node backup-cli.ts list --bucket=my-bucket
  `);
}

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const options: any = { ...defaultOptions };
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key === 'collections') {
        options.collections = value.split(',');
      } else {
        options[key] = value;
      }
    }
  }
  
  return options;
}

/**
 * Run backup command
 */
async function runBackup() {
  const options = parseArgs();
  
  console.log(`Starting Firestore backup with options:
  - Bucket: ${options.bucketName}
  - Prefix: ${options.backupPrefix}
  - Collections: ${options.collections.join(', ')}
  `);
  
  try {
    const backupUri = await backup.createFirestoreBackup({
      bucketName: options.bucketName,
      collectionIds: options.collections,
      backupPrefix: options.backupPrefix
    });
    
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`Backup URI: ${backupUri}`);
  } catch (error: any) {
    console.error(`\n❌ Backup failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Run restore command
 */
async function runRestore() {
  const options = parseArgs();
  
  if (!options.uri) {
    console.log('Please specify a backup URI to restore from using --uri=<backup-uri>');
    const backups = await backup.listFirestoreBackups(options.bucketName);
    
    if (backups.length === 0) {
      console.log('No backups found.');
      process.exit(1);
    }
    
    console.log('\nAvailable backups:');
    backups.forEach((backup: string, index: number) => {
      console.log(`${index + 1}. ${backup}`);
    });
    
    rl.question('\nEnter the number of the backup to restore: ', async (answer) => {
      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= backups.length) {
        console.log('Invalid selection.');
        rl.close();
        process.exit(1);
      }
      
      options.uri = backups[index];
      rl.close();
      await confirmAndRestore(options);
    });
  } else {
    await confirmAndRestore(options);
  }
}

/**
 * Confirm restore operation and execute if confirmed
 */
async function confirmAndRestore(options: any) {
  console.log(`\n⚠️ WARNING: This will overwrite existing data in Firestore!`);
  console.log(`You are about to restore from: ${options.uri}`);
  
  rl.question('\nAre you sure you want to proceed? (y/N): ', async (answer) => {
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('Restore cancelled.');
      process.exit(0);
    }
    
    console.log('\nStarting restore...');
    
    try {
      await backup.restoreFirestoreBackup(options.uri);
      console.log(`\n✅ Restore completed successfully!`);
    } catch (error: any) {
      console.error(`\n❌ Restore failed: ${error.message}`);
      process.exit(1);
    }
  });
}

/**
 * Run list command
 */
async function runList() {
  const options = parseArgs();
  
  console.log(`Listing Firestore backups in bucket: ${options.bucketName}`);
  
  try {
    const backups = await backup.listFirestoreBackups(options.bucketName);
    
    if (backups.length === 0) {
      console.log('No backups found.');
    } else {
      console.log('\nAvailable backups:');
      backups.forEach((backupUri: string, index: number) => {
        console.log(`${index + 1}. ${backupUri}`);
      });
    }
  } catch (error: any) {
    console.error(`\n❌ List operation failed: ${error.message}`);
    process.exit(1);
  }
  
  rl.close();
}

/**
 * Run export command
 */
async function runExport() {
  const options = parseArgs();
  
  if (!options.file) {
    console.log('Please specify an output file path using --file=<file-path>');
    process.exit(1);
  }
  
  console.log(`Starting Firestore export to JSON with options:
  - Collections: ${options.collections.join(', ')}
  - Output file: ${options.file}
  `);
  
  try {
    await Promise.all(options.collections.map(async (collection: string) => {
      const outputPath = options.file.replace('.json', `-${collection}.json`);
      await backup.exportCollectionToJson({
        collectionId: collection,
        outputPath: outputPath
      });
      console.log(`Exported ${collection} to ${outputPath}`);
    }));
    
    console.log(`\n✅ Export completed successfully!`);
  } catch (error: any) {
    console.error(`\n❌ Export failed: ${error.message}`);
    process.exit(1);
  }
  
  rl.close();
}

/**
 * Run import command
 */
async function runImport() {
  const options = parseArgs();
  
  if (!options.file) {
    console.log('Please specify an input file path using --file=<file-path>');
    process.exit(1);
  }
  
  console.log(`\n⚠️ WARNING: This may overwrite existing data in Firestore!`);
  
  rl.question('\nAre you sure you want to proceed? (y/N): ', async (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Import cancelled.');
      rl.close();
      process.exit(0);
    }
    
    console.log(`Starting Firestore import from JSON with options:
    - Input file: ${options.file}
    - Target collection: ${options.collections[0]}
    `);
    
    try {
      await backup.importJsonToCollection({
        collectionId: options.collections[0],
        inputPath: options.file,
        merge: false
      });
      console.log(`\n✅ Import completed successfully!`);
    } catch (error: any) {
      console.error(`\n❌ Import failed: ${error.message}`);
      process.exit(1);
    }
    
    rl.close();
  });
}

// Main execution
(async () => {
  try {
    switch (command) {
      case 'backup':
        await runBackup();
        rl.close();
        break;
      case 'restore':
        await runRestore();
        // Note: rl.close() is called inside the restore function
        break;
      case 'list':
        await runList();
        break;
      case 'export':
        await runExport();
        break;
      case 'import':
        await runImport();
        break;
      case 'help':
      case '--help':
      case '-h':
        displayHelp();
        rl.close();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        displayHelp();
        rl.close();
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    rl.close();
    process.exit(1);
  }
})(); 