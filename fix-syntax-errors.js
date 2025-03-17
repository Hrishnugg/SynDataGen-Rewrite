const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'src/lib/api/services/firestore-service.ts',
  'src/features/data-generation/services/job-management-service.ts',
  'src/lib/gcp/firestore/initFirestore.ts',
  'src/lib/gcp/serviceAccount.ts'
];

// Common syntax errors to fix
const fixRules = [
  // Fix semicolons at the end of blocks
  { pattern: /}\s*;/g, replacement: '}' },
  
  // Fix semicolons in object properties
  { pattern: /(\w+)\s*:\s*([^,;{}]+)\s*;(?!\s*$)/g, replacement: '$1: $2,' },
  
  // Fix missing commas in object literals
  { pattern: /(\w+)\s*:\s*([^,;{}]+)\s*(?=\s*\w+\s*:)/g, replacement: '$1: $2,' },
  
  // Fix array access with semicolons
  { pattern: /\[\s*`([^`]+)`\s*\]\s*;(?!\s*$)/g, replacement: '[`$1`]' },
  
  // Fix if statements with semicolons
  { pattern: /if\s*\(([^)]+)\)\s*;/g, replacement: 'if ($1)' },
  
  // Fix template literals in console.log
  { pattern: /console\.(log|error|warn|info|debug)\(\s*`([^`]+)`\s*,/g, replacement: 'console.$1(`$2`,'},
  
  // Fix template literals in string concatenation
  { pattern: /\+\s*`([^`]+)`\s*\+\s*""/g, replacement: '+ `$1`'},
  
  // Fix template literals in array access
  { pattern: /\[\s*`([^`]+)`\s*\]/g, replacement: '[`$1`]'},
  
  // Fix template literals in error messages
  { pattern: /new\s+\w+Error\(\s*`([^`]+)`\s*,/g, replacement: 'new Error(`$1`,'},
  
  // Fix array brackets
  { pattern: /\[\s*;/g, replacement: '[' },
  { pattern: /\s*\]\s*;(?!\s*$)/g, replacement: ']' },
  
  // Fix method chaining
  { pattern: /(\.\w+\([^)]*\))\s*;(?=\s*\.)/g, replacement: '$1' },
  
  // Fix object property access with semicolons
  { pattern: /(\.\w+)\s*;(?=\s*\.)/g, replacement: '$1' },
  
  // Fix conditional expressions
  { pattern: /\?\s*([^:;]+)\s*;(?=\s*:)/g, replacement: '? $1' },
  { pattern: /:\s*([^;]+)\s*;(?!\s*$)/g, replacement: ': $1' },
  
  // Fix function calls with semicolons
  { pattern: /(\w+)\(([^)]*)\)\s*;(?=\s*\.)/g, replacement: '$1($2)' },
  
  // Fix template literals with expressions
  { pattern: /`([^`]*)\${([^}]+)}\s*;([^`]*)`/g, replacement: '`$1${$2}$3`' },
  
  // Fix object literals in array
  { pattern: /(\{[^{}]*\})\s*;(?=\s*,|\s*\])/g, replacement: '$1' },
  
  // Fix if conditions with missing closing parenthesis
  { pattern: /if\s*\(([^)]+);\s*$/g, replacement: 'if ($1)' },
  
  // Fix return statements with conditions
  { pattern: /return\s+if\s*\(/g, replacement: 'return ('},
  
  // Fix chained string methods
  { pattern: /(\.\w+\([^)]*\))\s*;(?=\s*\.)/g, replacement: '$1' },
  
  // Fix template literals in property access
  { pattern: /\.\s*`([^`]+)`\s*;/g, replacement: '.`$1`' },
  
  // Fix object property access
  { pattern: /(\.\w+)\s*;\s*(?=\.\w+)/g, replacement: '$1' },
  
  // Fix ternary operators
  { pattern: /\?\s*([^:;]+)\s*;\s*:\s*/g, replacement: '? $1 : ' },
  
  // Fix array-contains queries
  { pattern: /console\.log\(\s*`\s*([^`]+)\s*`\s*,\s*([^)]+)\)/g, replacement: 'console.log(`$1`, $2)' },
  
  // Fix template literals with multiple expressions
  { pattern: /`([^`]*)\${([^}]+)}\s*([^`]*)\${([^}]+)}\s*([^`]*)`/g, replacement: '`$1${$2}$3${$4}$5`' },
  
  // Fix function parameter type declarations
  { pattern: /(\w+)\s*:\s*([^,)]+)\s*;(?=\s*,|\s*\))/g, replacement: '$1: $2' },
  
  // Fix parameter list separators
  { pattern: /(\w+\s*:\s*[^,);]+)\s*(?=\s*\w+\s*:)/g, replacement: '$1, ' },
  
  // Fix improper function return type declarations
  { pattern: /\)\s*:\s*([^{;]+)\s*;(?=\s*\{)/g, replacement: '): $1 ' },
  
  // Fix improper closing of generic type declarations
  { pattern: />\s*;(?=\s*\{|\s*\()/g, replacement: '>' },
  
  // Fix missing commas in function parameter lists
  { pattern: /(\w+\s*:\s*[^,);]+)\s*(?=\s*\w+\s*:)/g, replacement: '$1, ' },
  
  // Fix improper typing of conditional expressions
  { pattern: /if\s*\(([^)]+)\)\s*\?\s*([^:]+)\s*;/g, replacement: 'if ($1) ? $2' },
  
  // Fix improper typing of class properties
  { pattern: /(\w+)\s*:\s*([^;=]+)\s*=\s*([^;]+)\s*;/g, replacement: '$1: $2 = $3;' },
  
  // Fix semicolons in conditional blocks
  { pattern: /if\s*\(\s*([^)]*)\s*\)\s*;\s*{/g, replacement: 'if ($1) {' },
  
  // Fix missing commas in array declarations
  { pattern: /(\[[^\]]*\])\s*;(?=\s*,|\s*\])/g, replacement: '$1' },
  
  // Fix interface property separators
  { pattern: /(\w+\s*:\s*[^,;{}]+)\s*;(?=\s*\w+\s*:)/g, replacement: '$1,\n  ' },
  
  // Fix incorrect closing of statements with parentheses
  { pattern: /\)\s*;(?=\s*{)/g, replacement: ')' },
  
  // Fix improper export declarations
  { pattern: /export\s+(\w+)\s+(\w+)\s*;\s*{/g, replacement: 'export $1 $2 {' },
  
  // Fix field access inside template literals
  { pattern: /\${([^}]+)\.([^}]+);\}/g, replacement: '${$1.$2}' },
  
  // Fix generic type parameter declarations
  { pattern: /<\s*(\w+)\s*=\s*([^>]+)\s*>\s*;/g, replacement: '<$1 = $2>' },
  
  // Fix async function declarations
  { pattern: /async\s+(\w+)\s*<([^>]*)>\s*\(/g, replacement: 'async $1<$2>(' },
  
  // Fix missing semicolons at end of statements
  { pattern: /(\w+)\s*=\s*([^;{}\n]+)(?=\s*\n\s*\w+)/g, replacement: '$1 = $2;' },
  
  // Fix property access in if statements
  { pattern: /if\s*\(\s*([^.]+)\.([^)]+);\s*\)/g, replacement: 'if ($1.$2)' },
  
  // Fix conditional expressions with if
  { pattern: /=\s*if\s*\(/g, replacement: '= ' },
  
  // Fix array and object literals in assignments
  { pattern: /=\s*\[\s*;/g, replacement: '= [' },
  { pattern: /=\s*\{\s*;/g, replacement: '= {' }
];

// Process each file
filesToFix.forEach(filePath => {
  const fullPath = path.resolve(process.cwd(), filePath);
  
  try {
    // Read the file
    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    
    // Apply each fix rule
    fixRules.forEach(rule => {
      content = content.replace(rule.pattern, rule.replacement);
    });
    
    // Additional custom fixes specific to common errors we're seeing
    
    // Fix if (condition); pattern
    content = content.replace(/if\s*\(([^)]+)\);/g, 'if ($1) {');
    
    // Fix missing closing braces after if statements
    let ifStatementCount = (content.match(/if\s*\([^{]*\)\s*{/g) || []).length;
    let closingBraceCount = (content.match(/}\s*(\n|$)/g) || []).length;
    if (ifStatementCount > closingBraceCount) {
      content = content.replace(/if\s*\([^{]*\)\s*{([^}]*?)(\n\s*\w+)/g, 'if ($1) {$2\n}\n$3');
    }
    
    // Fix import statements with semicolons
    content = content.replace(/import\s*{([^}]+)}\s*from\s*['"][^'"]+['"];/g, 'import {$1} from $2;');
    
    // Fix specific issues with FirestoreService methods
    content = content.replace(/private\s+buildQuery\(/g, '  private buildQuery(');
    content = content.replace(/async\s+getCollection</g, '  async getCollection<');
    content = content.replace(/async\s+queryDocuments</g, '  async queryDocuments<');
    
    // Write the file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Fixed syntax errors in ${filePath}`);
    } else {
      console.log(`No changes made to ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Syntax error fixing completed.'); 