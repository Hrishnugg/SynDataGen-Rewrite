const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  rootDir: process.cwd(),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  files: [
    'src/features/data-generation/services/job-management-service.ts',
    'src/lib/api/services/firestore-service.ts',
    'src/lib/gcp/firestore/initFirestore.ts',
    'src/lib/gcp/serviceAccount.ts'
  ]
};

// Common syntax error patterns and their fixes
const syntaxFixes = [
  // Fix "if (db) {" patterns
  {
    pattern: /const\s+(\w+)\s*=\s*if\s*\(db\)\s*\{/g,
    replacement: 'const $1 = db ? db'
  },
  // Fix "if (!global.if (__firestoreState) {" patterns
  {
    pattern: /if\s*\(\!global\.if\s*\(__firestoreState\)\s*\{/g,
    replacement: 'if (!global.__firestoreState || !global.__firestoreState'
  },
  // Fix "global.if (__firestoreState) {" patterns
  {
    pattern: /global\.if\s*\(__firestoreState\)\s*\{/g,
    replacement: 'global.__firestoreState ? global.__firestoreState'
  },
  // Fix ".instance) {" patterns
  {
    pattern: /\.instance\)\s*\{/g,
    replacement: '.instance'
  },
  // Fix "if (!if (customer) {" patterns
  {
    pattern: /if\s*\(\!if\s*\(customer\)\s*\{/g,
    replacement: 'if (!customer || !customer'
  },
  // Fix ".gcpConfig?.serviceAccountEmail) {" patterns
  {
    pattern: /\.gcpConfig\?\.(serviceAccountEmail)\)\s*\{/g,
    replacement: '.gcpConfig?.$1'
  },
  // Fix "const possiblePaths = [;" patterns
  {
    pattern: /const\s+(\w+)\s*=\s*\[\s*;/g,
    replacement: 'const $1 = ['
  },
  // Fix "];" patterns
  {
    pattern: /\s*\]\s*;/g,
    replacement: '\n  ]'
  },
  // Fix "applicationDefault();" patterns
  {
    pattern: /applicationDefault\(\);/g,
    replacement: 'applicationDefault()'
  },
  // Fix ".replace(...).replace(...).replace(...)" patterns
  {
    pattern: /(\.\s*replace\([^)]+\))\s*\n\s*(\.\s*replace)/g,
    replacement: '$1$2'
  },
  // Fix "const formattedKey = '...' +;" patterns
  {
    pattern: /const\s+formattedKey\s*=\s*'[^']+'\s*\+\s*;/g,
    replacement: "const formattedKey = '-----BEGIN PRIVATE KEY-----\\n' + formattedPrivateKey +"
  },
  // Fix ".settings(settings);" patterns
  {
    pattern: /\.\s*settings\(settings\);/g,
    replacement: '.settings(settings)'
  },
  // Fix "if (settingsError.message.includes('already been initialized') {" patterns
  {
    pattern: /if\s*\(settingsError\.message\.includes\('([^']+)'\)\s*\{/g,
    replacement: "if (settingsError.message.includes('$1'))"
  },
  // Fix "|| }" patterns
  {
    pattern: /\|\|\s*\n\s*\}/g,
    replacement: "|| settingsError.message.includes('settings() once')) {"
  },
  // Fix ".settings({" patterns
  {
    pattern: /\.\s*settings\(\{/g,
    replacement: "db.settings({"
  },
  // Fix template literals with emoji
  {
    pattern: /console\.(log|error|warn)\(`[^`]*`/g,
    replacement: (match) => {
      return match.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters
    }
  },
  // Fix template literals with ${...} expressions
  {
    pattern: /`([^`]*)\${([^}]*)}\s*([^`]*)`/g,
    replacement: (match, before, expr, after) => {
      // Clean up the expression
      const cleanExpr = expr.trim();
      return `"${before}" + ${cleanExpr} + "${after}"`;
    }
  },
  // Fix missing semicolons after return statements
  {
    pattern: /(return\s+[^;{]*?)(?=\s*\n|\r|$)/g,
    replacement: '$1;'
  },
  // Fix missing semicolons after variable declarations
  {
    pattern: /(const|let|var)\s+(\w+)(\s*=\s*[^;{]*?)(?=\s*\n|\r|$)/g,
    replacement: '$1 $2$3;'
  },
  // Fix missing semicolons after function calls
  {
    pattern: /(\w+\.\w+\([^)]*\))(?=\s*\n|\r|$)/g,
    replacement: '$1;'
  }
];

// Function to read a file
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

// Function to write a file
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

// Function to process a file
function processFile(filePath) {
  console.log(`Processing file: ${filePath}`);
  
  // Read the file
  const content = readFile(filePath);
  if (!content) {
    return { success: false, error: 'Failed to read file' };
  }
  
  // Apply fixes
  let modifiedContent = content;
  let changesMade = false;
  
  for (const fix of syntaxFixes) {
    const newContent = modifiedContent.replace(fix.pattern, fix.replacement);
    if (newContent !== modifiedContent) {
      changesMade = true;
      modifiedContent = newContent;
    }
  }
  
  // Write the file if changes were made
  if (changesMade) {
    if (!config.dryRun) {
      const writeSuccess = writeFile(filePath, modifiedContent);
      if (!writeSuccess) {
        return { success: false, error: 'Failed to write file' };
      }
      console.log(`  Modified file: ${filePath}`);
    } else {
      console.log(`  Would modify file: ${filePath} (dry run)`);
    }
    return { success: true, modified: true };
  } else {
    console.log(`  No changes needed for file: ${filePath}`);
    return { success: true, modified: false };
  }
}

// Main function
function main() {
  console.log(`Starting syntax error fix script v2`);
  console.log(`Root directory: ${config.rootDir}`);
  console.log(`Dry run: ${config.dryRun}`);
  
  const results = {
    total: 0,
    modified: 0,
    errors: 0
  };
  
  // Process each file
  for (const relativeFilePath of config.files) {
    const filePath = path.join(config.rootDir, relativeFilePath);
    results.total++;
    
    try {
      const result = processFile(filePath);
      if (result.success) {
        if (result.modified) {
          results.modified++;
        }
      } else {
        results.errors++;
        console.error(`  Error processing file ${filePath}: ${result.error}`);
      }
    } catch (error) {
      results.errors++;
      console.error(`  Unexpected error processing file ${filePath}:`, error);
    }
  }
  
  // Print summary
  console.log('\nSummary:');
  console.log(`  Total files processed: ${results.total}`);
  console.log(`  Files modified: ${results.modified}`);
  console.log(`  Errors: ${results.errors}`);
  
  if (config.dryRun) {
    console.log('\nThis was a dry run. No files were actually modified.');
    console.log('Run without --dry-run to apply the changes.');
  }
}

// Run the script
main(); 