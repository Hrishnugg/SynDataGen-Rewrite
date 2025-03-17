/**
 * Run All TypeScript Fixes
 * 
 * This script runs all TypeScript fix scripts in sequence.
 * It helps automate the process of fixing TypeScript issues in the codebase.
 */

const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execPromise = util.promisify(exec);

// Configuration
const SCRIPTS_DIR = path.join(__dirname);
const FIX_SCRIPTS = [
  'install-dependencies.js', // Run this first to ensure dependencies are installed
  'fix-api-route-syntax.js', // Run this early to fix syntax errors that might block other fixes
  'fix-api-route-syntax-manual.js', // More robust approach for API route syntax errors
  'fix-import-resolution.js', // Fix module import issues and add type declarations
  'fix-function-types.js', // Fix function parameter and return types
  'fix-null-undefined.js', // Fix null and undefined handling issues
  'fix-any-types.js',
  'fix-missing-return-types.js',
  'fix-type-casting.js',
  'fix-import-issues.js',
  'fix-service-inconsistencies.js',
  'fix-dashboard-components.js',
  'fix-waitlist-types.js',
  'fix-infrastructure-components.js'
];

// Create a backup of the codebase
console.log('Creating backup of the codebase...');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(process.cwd(), `typescript-fixes-backup-${timestamp}`);

try {
  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });
  
  // Copy src directory to backup
  execSync(`xcopy "${path.join(process.cwd(), 'src')}" "${path.join(backupDir, 'src')}" /E /I /H`, { stdio: 'inherit' });
  
  console.log(`Backup created at: ${backupDir}`);
} catch (error) {
  console.error('Error creating backup:', error);
  process.exit(1);
}

// Run each fix script
console.log('\nRunning TypeScript fix scripts...');

FIX_SCRIPTS.forEach(script => {
  const scriptPath = path.join(SCRIPTS_DIR, script);
  
  if (!fs.existsSync(scriptPath)) {
    console.warn(`Script not found: ${scriptPath}`);
    return;
  }
  
  console.log(`\nRunning ${script}...`);
  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    console.log(`${script} completed successfully.`);
  } catch (error) {
    console.error(`Error running ${script}:`, error);
  }
});

// Run TypeScript compiler to check for remaining issues
console.log('\nRunning TypeScript compiler to check for remaining issues...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('\nTypeScript compiler completed successfully. No type errors found!');
} catch (error) {
  console.log('\nTypeScript compiler found some issues. Please review the errors above.');
}

console.log('\nAll TypeScript fix scripts have been run.');
console.log(`A backup of your original codebase is available at: ${backupDir}`);
console.log('Please review the changes and run your tests to ensure everything works correctly.');
console.log('\nIf you need to restore the backup, you can copy the files back manually.');

// Provide instructions for manual fixes
console.log('\n=== Manual Fix Instructions ===');
console.log('Some TypeScript issues may require manual intervention:');
console.log('1. Review any remaining TypeScript errors from the compiler output');
console.log('2. Check for "any" types that were not automatically fixed');
console.log('3. Verify that component props have proper interfaces');
console.log('4. Ensure all API responses have proper type definitions');
console.log('5. Add missing return types to functions where the automatic fix used "unknown"');
console.log('\nRefer to the codebase-audit.md file for a complete list of identified issues.'); 