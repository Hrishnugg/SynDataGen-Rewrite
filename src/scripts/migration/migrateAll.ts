/**
 * Main Migration Script
 * 
 * This script orchestrates the migration of all data from MongoDB to Firestore.
 * It coordinates the execution of individual migration scripts for different data types.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { migrateWaitlist } from './migrateWaitlist';
import { migrateCustomers } from './migrateCustomers';

// Load environment variables
dotenv.config();

// Configure logging
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `full_migration_${new Date().toISOString().replace(/:/g, '-')}.log`);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Setup logging
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
function log(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

/**
 * Migration sequence options
 */
interface MigrationOptions {
  runCustomers: boolean;
  runWaitlist: boolean;
  runProjects: boolean;
  runJobs: boolean;
  dryRun: boolean;
}

/**
 * Migration result
 */
interface MigrationResult {
  success: boolean;
  component: string;
  details?: any;
  error?: string;
}

/**
 * Main migration function
 */
async function migrateAll(options: MigrationOptions = {
  runCustomers: true,
  runWaitlist: true,
  runProjects: false,
  runJobs: false,
  dryRun: false
}): Promise<MigrationResult[]> {
  log('Starting full data migration from MongoDB to Firestore');
  log(`Options: ${JSON.stringify(options, null, 2)}`);
  
  const results: MigrationResult[] = [];
  
  // If this is a dry run, just log what would happen
  if (options.dryRun) {
    log('DRY RUN MODE: No actual changes will be made');
    
    if (options.runCustomers) {
      log('DRY RUN: Would migrate customers collection from MongoDB to Firestore');
      results.push({ 
        success: true, 
        component: 'customers', 
        details: { dryRun: true, message: 'Would migrate customers' } 
      });
    }
    
    if (options.runWaitlist) {
      log('DRY RUN: Would migrate waitlist collection from MongoDB to Firestore');
      results.push({ 
        success: true, 
        component: 'waitlist', 
        details: { dryRun: true, message: 'Would migrate waitlist submissions' } 
      });
    }
    
    if (options.runProjects) {
      log('DRY RUN: Would migrate projects collection from MongoDB to Firestore');
      results.push({ 
        success: true, 
        component: 'projects', 
        details: { dryRun: true, message: 'Would migrate projects' } 
      });
    }
    
    if (options.runJobs) {
      log('DRY RUN: Would migrate jobs collection from MongoDB to Firestore');
      results.push({ 
        success: true, 
        component: 'jobs', 
        details: { dryRun: true, message: 'Would migrate data generation jobs' } 
      });
    }
    
    // Generate summary
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    log('==== DRY RUN MIGRATION SUMMARY ====');
    log(`Total migrations that would be performed: ${total}`);
    log(`All migrations would be attempted in real execution mode.`);
    
    return results;
  }
  
  try {
    // Migration for Customers (should be first as other data depends on customer service accounts)
    if (options.runCustomers) {
      log('==== STARTING CUSTOMER MIGRATION ====');
      if (!options.dryRun) {
        try {
          await migrateCustomers();
          results.push({ success: true, component: 'customers' });
          log('==== COMPLETED CUSTOMER MIGRATION ====');
        } catch (error: any) {
          const result: MigrationResult = {
            success: false,
            component: 'customers',
            error: error.message
          };
          results.push(result);
          log(`==== FAILED CUSTOMER MIGRATION: ${error.message} ====`);
          
          // Exit early if customer migration fails, as other migrations depend on it
          if (options.runProjects || options.runJobs) {
            log('Skipping project and job migrations due to customer migration failure');
            return results;
          }
        }
      } else {
        log('DRY RUN: Would have migrated customers');
        results.push({ success: true, component: 'customers', details: { dryRun: true } });
      }
    }
    
    // Migration for Waitlist
    if (options.runWaitlist) {
      log('==== STARTING WAITLIST MIGRATION ====');
      if (!options.dryRun) {
        try {
          await migrateWaitlist();
          results.push({ success: true, component: 'waitlist' });
          log('==== COMPLETED WAITLIST MIGRATION ====');
        } catch (error: any) {
          results.push({
            success: false,
            component: 'waitlist',
            error: error.message
          });
          log(`==== FAILED WAITLIST MIGRATION: ${error.message} ====`);
        }
      } else {
        log('DRY RUN: Would have migrated waitlist submissions');
        results.push({ success: true, component: 'waitlist', details: { dryRun: true } });
      }
    }
    
    // Note: Project and Job migrations would be implemented and added here
    // when those migration scripts are created
    if (options.runProjects) {
      log('==== PROJECTS MIGRATION NOT YET IMPLEMENTED ====');
      results.push({
        success: false,
        component: 'projects',
        error: 'Not implemented yet'
      });
    }
    
    if (options.runJobs) {
      log('==== JOBS MIGRATION NOT YET IMPLEMENTED ====');
      results.push({
        success: false,
        component: 'jobs',
        error: 'Not implemented yet'
      });
    }
    
    // Generate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;
    
    log('==== MIGRATION SUMMARY ====');
    log(`Total migrations: ${total}`);
    log(`Successful: ${successful}`);
    log(`Failed: ${failed}`);
    
    if (failed > 0) {
      log('Failed migrations:');
      results.filter(r => !r.success).forEach(r => {
        log(`- ${r.component}: ${r.error}`);
      });
    }
    
    return results;
  } catch (error: any) {
    log(`Migration orchestration failed: ${error.message}`);
    log(error.stack || 'No stack trace available');
    throw error;
  } finally {
    logStream.end();
  }
}

// Parse command line arguments
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    runCustomers: false,
    runWaitlist: false,
    runProjects: false,
    runJobs: false,
    dryRun: false
  };
  
  // If no specific data type is specified, run all
  if (!args.includes('--customers') && 
      !args.includes('--waitlist') && 
      !args.includes('--projects') && 
      !args.includes('--jobs')) {
    options.runCustomers = true;
    options.runWaitlist = true;
  } else {
    options.runCustomers = args.includes('--customers');
    options.runWaitlist = args.includes('--waitlist');
    options.runProjects = args.includes('--projects');
    options.runJobs = args.includes('--jobs');
  }
  
  options.dryRun = args.includes('--dry-run');
  
  return options;
}

// Run the migration if this script is executed directly
if (require.main === module) {
  const options = parseArgs();
  
  migrateAll(options)
    .then((results) => {
      const anyFailed = results.some(r => !r.success);
      process.exit(anyFailed ? 1 : 0);
    })
    .catch((error) => {
      log(`Migration orchestration failed: ${error.message}`);
      process.exit(1);
    });
}

export { migrateAll }; 