const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = process.cwd();
const DRY_RUN = false;
const VERBOSE = true;

// Files to process
const FILES_TO_FIX = [
  'src/features/data-generation/services/job-management-service.ts',
  'src/lib/api/services/firestore-service.ts',
  'src/lib/gcp/firestore/initFirestore.ts',
  'src/lib/gcp/serviceAccount.ts',
  'src/features/customers/services/customers.ts'
];

// Common fixes to apply
const FIXES = [
  // Fix missing semicolons at end of statements (but not in comments)
  { 
    pattern: /((?<![\/\/|\*])(?:\w|\)|\}|"|'|`|\d|\]|\+))(\s*)$/,
    replacement: '$1;$2',
    description: 'Add missing semicolon at end of statement'
  },
  
  // Fix missing commas in object literals
  { 
    pattern: /((?:\w|\)|\}|"|'|`|\d|\]|\+))(\s*)\n(\s*)((?:\w|\[|\{|"|'|`))(?!\s*[,;:=])/,
    replacement: '$1,$2\n$3$4',
    description: 'Add missing comma in object/array literal'
  },
  
  // Fix method chaining
  { 
    pattern: /(\.\w+\([^)]*\))(\s*)\n(\s*)(?=\.)/,
    replacement: '$1$2\n$3',
    description: 'Fix method chaining'
  },
  
  // Fix if statements missing closing parenthesis
  { 
    pattern: /(if\s*\([^{;]*?)(\s*\{)/,
    replacement: (match, p1, p2) => {
      // Only add closing parenthesis if there isn't one already
      const openCount = (p1.match(/\(/g) || []).length;
      const closeCount = (p1.match(/\)/g) || []).length;
      return openCount > closeCount ? `${p1})${p2}` : match;
    },
    description: 'Add missing closing parenthesis to if statement'
  },
  
  // Fix try-catch blocks
  {
    pattern: /(\}\s*catch\s*\([^)]*\)\s*\{[^}]*\})(?!\s*(catch|finally))/,
    replacement: '$1\n  }',
    description: 'Fix incomplete try-catch block'
  },
  
  // Fix function declarations
  {
    pattern: /(async\s+\w+\s*\([^)]*\))(?!\s*[:{])/,
    replacement: '$1: Promise<any> {',
    description: 'Fix incomplete async function declaration'
  }
];

// Process a file with the given fixes
function processFile(filePath) {
  try {
    if (VERBOSE) console.log(`Processing ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    const lines = content.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let originalLine = line;
      
      // Skip comment-only lines
      if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
        newLines.push(line);
        continue;
      }
      
      for (const fix of FIXES) {
        if (fix.pattern.test(line)) {
          if (typeof fix.replacement === 'function') {
            line = line.replace(fix.pattern, fix.replacement);
          } else {
            line = line.replace(fix.pattern, fix.replacement);
          }
          
          if (line !== originalLine) {
            modified = true;
            if (VERBOSE) {
              console.log(`  Line ${i + 1} (${fix.description}):`);
              console.log(`    - ${originalLine}`);
              console.log(`    + ${line}`);
            }
            break; // Only apply one fix per line
          }
        }
      }
      
      newLines.push(line);
    }
    
    // Process the content as a whole for multi-line fixes
    let newContent = newLines.join('\n');
    
    // Fix missing closing braces in functions
    const functionPattern = /async\s+\w+\s*\([^{]*\)\s*:\s*Promise<[^>]*>\s*\{(?:[^{}]*|\{[^{}]*\})*$/gm;
    newContent = newContent.replace(functionPattern, (match) => {
      const openBraces = (match.match(/\{/g) || []).length;
      const closeBraces = (match.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        modified = true;
        if (VERBOSE) {
          console.log(`  Fixed incomplete function by adding ${openBraces - closeBraces} closing braces`);
        }
        return match + '\n}'.repeat(openBraces - closeBraces);
      }
      return match;
    });
    
    if (modified && !DRY_RUN) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Fixed ${filePath}`);
    } else if (!modified) {
      console.log(`ℹ️ No changes needed for ${filePath}`);
    } else {
      console.log(`🔍 Would fix ${filePath} (dry run)`);
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

// Main execution
function main() {
  console.log(`🔧 Starting TypeScript error auto-fix`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const file of FILES_TO_FIX) {
    try {
      const filePath = path.isAbsolute(file) ? file : path.join(ROOT_DIR, file);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        continue;
      }
      
      const modified = processFile(filePath);
      if (modified) fixedCount++;
    } catch (error) {
      console.error(`❌ Error with file ${file}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  - Files processed: ${FILES_TO_FIX.length}`);
  console.log(`  - Files modified: ${fixedCount}`);
  console.log(`  - Errors encountered: ${errorCount}`);
}

main();
