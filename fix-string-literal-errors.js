const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'src/lib/api/services/firestore-service.ts',
  'src/features/data-generation/services/job-management-service.ts',
  'src/lib/gcp/firestore/initFirestore.ts',
  'src/lib/gcp/serviceAccount.ts'
];

// Fix unterminated string literals
function fixUnterminatedStrings(content) {
  // Fix common patterns of unterminated strings
  let fixed = content;
  
  // Fix error strings with message formatting
  fixed = fixed.replace(/throw new Error\("([^"]+)" \+ error instanceof Error \? error\.message : String\(error\) \+ "'\)/g, 
                        'throw new Error("$1" + (error instanceof Error ? error.message : String(error)))');
  
  // Fix throw new Error with template literals
  fixed = fixed.replace(/throw new Error\('([^']+)' \+ (\w+) \+ ''\)/g, 
                        'throw new Error(\'$1\' + $2)');

  // Fix unterminated console.log statements
  fixed = fixed.replace(/console\.log\('Applying orderBy with array format: field=\${field}, direction=\${direction \|\| 'asc'}/g,
                        'console.log(\'Applying orderBy with array format: field=\' + field + \', direction=\' + (direction || \'asc\'))');
                        
  fixed = fixed.replace(/console\.log\('Applying orderBy with object format: field=\${orderByClause.field}, direction=\${orderByClause.direction \|\| 'asc'}/g,
                        'console.log(\'Applying orderBy with object format: field=\' + orderByClause.field + \', direction=\' + (orderByClause.direction || \'asc\'))');
                      
  // Fix console.log with key in message
  fixed = fixed.replace(/console\.log\(' Removing undefined property '(\${key})' from query object'\)/g,
                        'console.log(\' Removing undefined property \' + $1 + \' from query object\')');
                        
  // Fix adaptError logs
  fixed = fixed.replace(/console\.error\(' Error adapting query: ', adaptError\)/g,
                        'console.error(\' Error adapting query: \', adaptError)');
                        
  // Fix where clause error logs
  fixed = fixed.replace(/console\.error\(' Error in where clause: ', whereClause, error\)/g,
                        'console.error(\' Error in where clause: \', whereClause, error)');
                        
  // Fix other template strings
  fixed = fixed.replace(/console\.log\(' Adapting array-contains query for teamMembers with userId: \${userId}'\)/g,
                        'console.log(\' Adapting array-contains query for teamMembers with userId: \' + userId)');
                        
  fixed = fixed.replace(/console\.log\(' Successfully adapted query to \${field}\.userId == \${userId}'\);/g,
                        'console.log(\' Successfully adapted query to \' + field + \'.userId == \' + userId);');
                        
  // Fix quotes inside string literals
  fixed = fixed.replace(/(['"])([^'"]*)([\w\s]*['"])(['"])/g, '$1$2$3');
  
  // Fix specific instance of throw Error in update method
  fixed = fixed.replace(/throw new Error\("Failed to update document: " \+ error instanceof Error \? error\.message : String\(error\) \+ "'\)/g,
                        'throw new Error("Failed to update document: " + (error instanceof Error ? error.message : String(error)))');
  
  return fixed;
}

// Fix function declarations
function fixFunctionDeclarations(content) {
  let fixed = content;
  
  // Fix async delete
  fixed = fixed.replace(/async delete\(,/g, 'async delete(');
  
  // Fix async runTransaction
  fixed = fixed.replace(/updateFunction: \(transactio,n: Transaction\)\s*=\s*>\s*Promise<T>/g,
                        'updateFunction: (transaction: Transaction) => Promise<T>');
  
  // Fix multiple fixes for db ? db; pattern
  fixed = fixed.replace(/const\s+(\w+)\s*=\s*db\s*\?\s*db;/g, 'const $1 = db ? db.collection(this.$1Collection) : null;');
  
  // Fix if statement with string checks
  fixed = fixed.replace(/if \(!customer \|\| !customer/g, 'if (!customer || !customer.exists || !customer.data()');
  
  // Fix arrow function spacing
  fixed = fixed.replace(/=\s*>/g, '=>');
  
  // Fix return statements
  fixed = fixed.replace(/return\s+true(?=\s+\})/g, 'return true;');
  
  // Fix multiple line parameters
  fixed = fixed.replace(/options: \{ useBatch\?\: boolean \}\s*=\s*\{\}/g, 'options: { useBatch?: boolean } = {}');
  
  // Fix merge parameter
  fixed = fixed.replace(/options: \{ merge\?\: boolean useBatch\?\: boolean \}\s*=\s*\{\}/g, 'options: { merge?: boolean, useBatch?: boolean } = {}');
  
  return fixed;
}

// Process each file
filesToFix.forEach(filePath => {
  const fullPath = path.resolve(process.cwd(), filePath);
  console.log(`Processing ${filePath}...`);
  
  try {
    // Read the file
    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    
    // Apply fixes
    content = fixUnterminatedStrings(content);
    content = fixFunctionDeclarations(content);
    
    // Write the file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed string literal errors in ${filePath}`);
    } else {
      console.log(`No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('String literal fixing completed.'); 