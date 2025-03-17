/**
 * Manual Fixes for Critical Files
 * 
 * This script applies direct fixes to files with critical syntax errors
 * that couldn't be fixed by the automated scripts.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  rootDir: process.cwd(),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Files to fix with their replacements
const fileFixes = [
  {
    path: 'src/lib/api/services/audit-logs.ts',
    replacements: [
      {
        search: /const docRef = db\?/g,
        replace: 'const docRef = db?.'
      },
      {
        search: /const snapshot = db\?/g,
        replace: 'const snapshot = db?.'
      },
      {
        search: /if \(db\) \{([^}]*?)\}/g,
        replace: '$1'
      }
    ]
  },
  {
    path: 'src/features/data-generation/services/webhook-service.ts',
    replacements: [
      {
        search: /const webhookRef = db\?/g,
        replace: 'const webhookRef = db?.'
      },
      {
        search: /let query = db\?/g,
        replace: 'let query = db?.'
      },
      {
        search: /const deliveryRef = db\?/g,
        replace: 'const deliveryRef = db?.'
      },
      {
        search: /if \(webhooks\.length === 0\) \{([^}]*?)\}/g,
        replace: 'if (webhooks.length === 0) {$1}'
      }
    ]
  },
  {
    path: 'src/lib/api/services/firestore-service.ts',
    replacements: [
      {
        search: /console\.log\('\[FirestoreService\] Using existing Firestore instance from getFirestoreInstance'\);/g,
        replace: 'console.log("[FirestoreService] Using existing Firestore instance from getFirestoreInstance");'
      },
      {
        search: /: null catch \(cacheError\) \{/g,
        replace: '} catch (cacheError) {'
      },
      {
        search: /let docRef = db \? db\?\./g,
        replace: 'let docRef = db?.'
      },
      {
        search: /const batch = db \? db\?\./g,
        replace: 'const batch = db?.'
      },
      {
        search: /: null else \{/g,
        replace: '} else {'
      },
      {
        search: /await batch\.commit\(\) else \{/g,
        replace: 'await batch.commit(); } else {'
      },
      {
        search: /let query: Query<DocumentData> = db \? db\?\./g,
        replace: 'let query: Query<DocumentData> = db?.'
      },
      {
        search: /return db \? db\?\./g,
        replace: 'return db?.'
      }
    ]
  },
  {
    path: 'src/scripts/create-test-data.ts',
    replacements: [
      {
        search: /console\.log\(`Created waitlist submission with ID: \${waitlistId : null`\);/g,
        replace: 'console.log(`Created waitlist submission with ID: ${waitlistId}`);'
      },
      {
        search: /console\.log\('Customer data verification successful'\) else \{/g,
        replace: 'console.log(\'Customer data verification successful\'); } else {'
      },
      {
        search: /console\.log\('Waitlist data verification successful'\) else \{/g,
        replace: 'console.log(\'Waitlist data verification successful\'); } else {'
      }
    ]
  }
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
 * Process a file with manual fixes
 */
function processFile(fileConfig) {
  const { path: filePath, replacements } = fileConfig;
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

  // Apply replacements
  for (const { search, replace } of replacements) {
    if (search.test(content)) {
      content = content.replace(search, replace);
      modified = true;
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
           MANUAL FIXES FOR CRITICAL FILES
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
  for (const fileConfig of fileFixes) {
    console.log(`Processing: ${fileConfig.path}`);
    try {
      const { processed, modified } = processFile(fileConfig);
      
      if (processed) {
        stats.filesProcessed++;
        if (modified) {
          stats.filesModified++;
          console.log(`Modified: ${fileConfig.path}`);
        } else if (config.verbose) {
          console.log(`No changes needed for: ${fileConfig.path}`);
        }
      }
    } catch (error) {
      console.error(`Error processing ${fileConfig.path}:`, error);
      stats.errors.push({ file: fileConfig.path, error: error.message });
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