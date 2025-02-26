#!/usr/bin/env node
/**
 * Migration CLI Entry Point
 * 
 * This file serves as the main entry point for the migration CLI.
 * It parses command-line arguments and executes the appropriate migration script.
 */

import { migrateAll } from './migrateAll';
import { migrateCustomers } from './migrateCustomers';
import { migrateWaitlist } from './migrateWaitlist';

// Help message
const helpMessage = `
SynDataGen MongoDB to Firestore Migration Tool

Usage:
  npx ts-node src/scripts/migration/index.ts [command] [options]

Commands:
  all                 Run all migrations (default)
  customers           Migrate only customer data
  waitlist            Migrate only waitlist submissions
  help                Show this help message

Options:
  --dry-run           Run without writing data (simulation mode)
  --verbose           Enable verbose logging

Examples:
  npx ts-node src/scripts/migration/index.ts all
  npx ts-node src/scripts/migration/index.ts customers --dry-run
  npx ts-node src/scripts/migration/index.ts waitlist --verbose
`;

// Parse command-line arguments
async function run() {
  // Skip first two args (node and script path)
  const args = process.argv.slice(2);
  
  // If no arguments or help flag, show help message
  if (args.length === 0 || args.includes('help') || args.includes('--help')) {
    console.log(helpMessage);
    process.exit(0);
  }
  
  const command = args[0];
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    runCustomers: command === 'all' || command === 'customers',
    runWaitlist: command === 'all' || command === 'waitlist',
    runProjects: command === 'all',
    runJobs: command === 'all'
  };
  
  // Set environment variable for verbose logging
  if (options.verbose) {
    process.env.MIGRATION_VERBOSE = 'true';
  }
  
  console.log(`Running migration with options: ${JSON.stringify(options, null, 2)}`);
  
  try {
    // Execute migration based on command
    switch (command) {
      case 'all':
        await migrateAll({
          runCustomers: true,
          runWaitlist: true,
          runProjects: false, // Not implemented yet
          runJobs: false, // Not implemented yet
          dryRun: options.dryRun
        });
        break;
      case 'customers':
        await migrateCustomers();
        break;
      case 'waitlist':
        await migrateWaitlist();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log(helpMessage);
        process.exit(1);
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the CLI
run(); 