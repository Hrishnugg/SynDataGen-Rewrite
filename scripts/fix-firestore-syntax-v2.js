/**
 * Fix Firestore Syntax Errors - Version 2
 * 
 * This script addresses the specific syntax errors in Firestore service files
 * by directly replacing problematic patterns with correct syntax.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  rootDir: process.cwd(),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Files to process
const filesToFix = [
  'src/app/api/projects/[id]/jobs/route.ts',
  'src/app/api/projects/[id]/metrics/route.ts',
  'src/app/api/projects/[id]/route.ts',
  'src/components/ui/badge.tsx',
  'src/features/customers/services/customers.ts',
  'src/features/data-generation/services/job-management-service.ts',
  'src/features/data-generation/services/webhook-service.ts',
  'src/lib/api/services/audit-logs.ts',
  'src/lib/api/services/firestore-service.ts',
  'src/lib/gcp/firestore/backup.ts',
  'src/lib/gcp/firestore/initFirestore.ts',
  'src/lib/gcp/serviceAccount.ts',
  'src/scripts/create-test-data.ts',
  'src/scripts/firestore-test.ts',
];

/**
 * Read a file from the filesystem
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Write content to a file
 */
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

/**
 * Process a file to fix Firestore syntax issues
 */
function processFile(filePath) {
  const absolutePath = path.join(config.rootDir, filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log(`File not found: ${filePath}`);
    return { processed: false, modified: false };
  }

  // Read file content
  let content = readFile(absolutePath);
  if (!content) {
    return { processed: false, modified: false };
  }

  // Track if we made changes
  let modified = false;
  let originalContent = content;

  // Fix badge.tsx comma issue
  if (filePath === 'src/components/ui/badge.tsx') {
    const badgePattern = /outline: "text-foreground",,/g;
    if (badgePattern.test(content)) {
      content = content.replace(badgePattern, 'outline: "text-foreground",');
      modified = true;
    }
  }

  // Fix specific syntax errors
  const replacements = [
    // Fix "if (db) {" -> "db?"
    { pattern: /(\s+)const\s+(\w+)\s*=\s*if\s*\(db\)\s*\{/g, replacement: '$1const $2 = db?' },
    { pattern: /(\s+)let\s+(\w+)\s*=\s*if\s*\(db\)\s*\{/g, replacement: '$1let $2 = db?' },
    
    // Fix trailing ";" and ": null"
    { pattern: /db\?\s*db\??\./g, replacement: 'db?.' },
    { pattern: /\);\s*\n\s*: null/g, replacement: ')' },
    { pattern: /\);\s*: null/g, replacement: ')' },
    
    // Fix catch blocks
    { pattern: /: null\s+catch\s+\(([^)]+)\)\s*\{/g, replacement: '\n    } catch ($1) {' },
    { pattern: /\}\s+catch\s+\(([^)]+)\)\s*\{/g, replacement: '} catch ($1) {' },
    
    // Fix else blocks
    { pattern: /: null\s+else\s*\{/g, replacement: '\n    } else {' },
    
    // Fix template literals
    { pattern: /\$\{([^}]+)\s*:\s*null`\)/g, replacement: '${$1}`)' },
    
    // Fix specific issues in create-test-data.ts
    { pattern: /console\.log\(`Created waitlist submission with ID: \${waitlistId : null`\);/g, 
      replacement: 'console.log(`Created waitlist submission with ID: ${waitlistId}`);' },
  ];

  // Apply replacements
  for (const { pattern, replacement } of replacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }

  // Special case for firestore-service.ts
  if (filePath === 'src/lib/api/services/firestore-service.ts') {
    // Fix specific issues in this file
    const specialReplacements = [
      // Fix console.log line
      { 
        pattern: /console\.log\('\[FirestoreService\] Using existing Firestore instance from getFirestoreInstance'\);/g, 
        replacement: "console.log('[FirestoreService] Using existing Firestore instance from getFirestoreInstance');" 
      },
      // Fix collection references
      { 
        pattern: /db\s*\?\s*db\?\.\s*collection\(([^)]+)\)\.([^;]+);(\s*): null/g, 
        replacement: 'db?.collection($1).$2;$3' 
      },
      // Fix batch references
      { 
        pattern: /const batch = db \? db\?\.\s*batch\(\);(\s*): null/g, 
        replacement: 'const batch = db?.batch();$1' 
      },
      // Fix transaction
      { 
        pattern: /await db\? db\?\.\s*runTransaction\(([^)]+)\);(\s*): null/g, 
        replacement: 'await db?.runTransaction($1);$2' 
      },
    ];

    for (const { pattern, replacement } of specialReplacements) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
  }

  // Write file if modified
  if (modified && !config.dryRun) {
    writeFile(absolutePath, content);
  }

  return { processed: true, modified };
}

/**
 * Main execution function
 */
function main() {
  console.log(`
====================================================
           FIRESTORE SYNTAX FIXER V2
====================================================
  `);
  
  console.log(`Root directory: ${config.rootDir}`);
  console.log(`Dry run: ${config.dryRun ? 'YES (no changes will be made)' : 'NO (files will be modified)'}`);
  console.log(`Verbose: ${config.verbose ? 'YES' : 'NO'}`);
  
  let stats = {
    filesProcessed: 0,
    filesModified: 0,
    errors: []
  };
  
  // Process each file
  for (const filePath of filesToFix) {
    console.log(`Processing: ${filePath}`);
    try {
      const { processed, modified } = processFile(filePath);
      
      if (processed) {
        stats.filesProcessed++;
        if (modified) {
          stats.filesModified++;
          console.log(`Modified: ${filePath}`);
        } else if (config.verbose) {
          console.log(`No changes needed for: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
      stats.errors.push({ file: filePath, error: error.message });
    }
  }
  
  // Print summary
  console.log(`
====================================================
                  SUMMARY
====================================================

Files processed: ${stats.filesProcessed}
Files modified: ${stats.filesModified}
Errors: ${stats.errors.length}
  `);
  
  // Print any errors
  if (stats.errors.length > 0) {
    console.log('Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`- ${file}: ${error}`);
    });
  }
  
  // Print dry run message
  if (config.dryRun) {
    console.log(`
This was a dry run. No files were modified.
Run without --dry-run to apply changes.
    `);
  }
  
  console.log(`
====================================================
  `);
}

// Run the script
main(); 