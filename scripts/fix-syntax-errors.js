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
  {
    // Fix ternary operators that are missing the colon part
    pattern: /(\w+)\s*\?\s*([^:;]*?);?\s*(?=\n|\r|$)/g,
    replacement: (match, variable, consequence) => {
      // If the consequence already contains a statement, wrap it in parentheses
      if (consequence.includes('{')) {
        return `if (${variable}) {\n${consequence}\n}`;
      }
      return `if (${variable}) ${consequence}`;
    }
  },
  {
    // Fix ternary operators with db? pattern
    pattern: /(\w+)\s*=\s*(\w+)\?(?!\s*:)/g,
    replacement: (match, left, right) => `${left} = ${right} ? ${right} : null`
  },
  {
    // Fix missing semicolons at the end of statements
    pattern: /(\w+\([^)]*\))\s*(?=\n|\r|$)/g,
    replacement: '$1;'
  },
  {
    // Fix malformed if statements
    pattern: /if\s*\(([^)]+)\)\s*([^{]*?)(?=\s*\n|\r|$)/g,
    replacement: (match, condition, statement) => {
      if (statement.trim()) {
        return `if (${condition}) {\n  ${statement.trim()}\n}`;
      }
      return `if (${condition}) {`;
    }
  },
  {
    // Fix missing braces in if statements
    pattern: /if\s*\(([^)]+)\)\s*([^{;]*?);(?=\s*\n|\r|$)/g,
    replacement: 'if ($1) {\n  $2;\n}'
  },
  {
    // Fix db? patterns
    pattern: /(const\s+\w+\s*=\s*)(\w+)\?/g,
    replacement: '$1$2 ? $2 : null'
  },
  {
    // Fix missing braces in catch blocks
    pattern: /}\s*catch\s*\(([^)]+)\)\s*([^{]*?)(?=\s*\n|\r|$)/g,
    replacement: (match, param, statement) => {
      if (statement.trim()) {
        return `} catch (${param}) {\n  ${statement.trim()}\n}`;
      }
      return `} catch (${param}) {`;
    }
  },
  {
    // Fix missing braces in else blocks
    pattern: /}\s*else\s*([^{]*?)(?=\s*\n|\r|$)/g,
    replacement: (match, statement) => {
      if (statement.trim()) {
        return `} else {\n  ${statement.trim()}\n}`;
      }
      return `} else {`;
    }
  },
  {
    // Fix missing semicolons after return statements
    pattern: /(return\s+[^;{]*?)(?=\s*\n|\r|$)/g,
    replacement: '$1;'
  },
  {
    // Fix missing semicolons after variable declarations
    pattern: /(const|let|var)\s+(\w+)(\s*=\s*[^;{]*?)(?=\s*\n|\r|$)/g,
    replacement: '$1 $2$3;'
  },
  {
    // Fix missing semicolons after function calls
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
  console.log(`Starting syntax error fix script`);
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