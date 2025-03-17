/**
 * Fix Firestore Syntax Errors
 * 
 * This script addresses the syntax errors caused by incorrect nullable reference fixes
 * in Firestore service files.
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
  'src/lib/api/services/firestore-service.ts',
  'src/lib/gcp/firestore/backup.ts',
  'src/lib/gcp/firestore/initFirestore.ts',
  'src/lib/gcp/serviceAccount.ts',
  'src/scripts/create-test-data.ts',
  'src/scripts/firestore-test.ts',
];

// Pattern replacements
const replacements = [
  {
    // Fix incorrect syntax: "this.if (db) {" -> "db ? "
    pattern: /this\.if \(db\) \{([^}]*?)}/g,
    replacement: 'db ? $1 : null'
  },
  {
    // Fix incorrect syntax: "if (db) {" -> "db ? "
    pattern: /if \(db\) \{([^}]*?)}/g,
    replacement: 'db ? $1 : null'
  },
  {
    // Fix incorrect syntax with nested db calls
    pattern: /db\s*\?\s*db\./g,
    replacement: 'db ? db.'
  },
  {
    // Fix nullable issues with one-line db access
    pattern: /(\s+)(const\s+\w+\s*=\s*)db\./g,
    replacement: '$1$2db?.'
  },
  {
    // Fix nullable issues with direct db access
    pattern: /(\b)db\.([a-zA-Z]+)/g, 
    replacement: '$1db?.$2'
  },
  {
    // Fix the special case syntax issues
    pattern: /await\s+db\s*\?/g,
    replacement: 'await db?'
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

  // Apply replacements
  for (const { pattern, replacement } of replacements) {
    // Check if the pattern exists before replacing
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
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
           FIRESTORE SYNTAX FIXER
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