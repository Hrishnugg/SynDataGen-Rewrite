const fs = require('fs');
const path = require('path');

// Define the files to be fixed
const filesToFix = [
  'src/scripts/firestore-test.ts',
  'src/scripts/migration-example.ts',
  'src/scripts/migration/migrateCustomers.ts',
  'src/scripts/migration/migrateWaitlist.ts'
];

// Process each file
filesToFix.forEach(filePath => {
  const fullPath = path.resolve(process.cwd(), filePath);
  console.log(`Processing ${filePath}...`);
  
  try {
    // Read the file
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Fix firestore-test.ts issues
    if (filePath === 'src/scripts/firestore-test.ts') {
      // Fix missing semicolons
      if (content.includes('console.log(\'Available collections:\')')) {
        content = content.replace(
          'console.log(\'Available collections:\')',
          'console.log(\'Available collections:\');'
        );
        modified = true;
      }
      
      // Fix missing semicolon after collection assignment
      if (content.includes('const testCollection = db ? db?.collection(\'_connection_test\')')) {
        content = content.replace(
          'const testCollection = db ? db?.collection(\'_connection_test\')',
          'const testCollection = db ? db?.collection(\'_connection_test\') : null;'
        );
        modified = true;
      }
    }
    
    // Fix if statements in other files
    if (filePath.includes('migration')) {
      // Fix 'if (db) {' syntax errors
      if (content.includes('const collections = if (db) {')) {
        content = content.replace(
          'const collections = if (db) {',
          'const collections = db ? ('
        );
        
        // Find the closing brace for this if statement and replace it
        const endIfIndex = content.indexOf('} else {', content.indexOf('const collections = if (db) {'));
        if (endIfIndex !== -1) {
          content = content.substring(0, endIfIndex) + 
                   ') : (' + 
                   content.substring(endIfIndex + 8); // 8 is the length of '} else {'
          
          // Find the final closing brace and replace it
          const finalBraceIndex = content.indexOf('}', endIfIndex + 8);
          if (finalBraceIndex !== -1) {
            content = content.substring(0, finalBraceIndex) + 
                     ');' + 
                     content.substring(finalBraceIndex + 1);
          }
        }
        
        modified = true;
      }
      
      // Fix 'const collection = if (db) {' syntax errors
      if (content.includes('const collection = if (db) {')) {
        content = content.replace(
          'const collection = if (db) {',
          'const collection = db ? ('
        );
        
        // Find the closing brace for this if statement and replace it
        const endIfIndex = content.indexOf('} else {', content.indexOf('const collection = if (db) {'));
        if (endIfIndex !== -1) {
          content = content.substring(0, endIfIndex) + 
                   ') : (' + 
                   content.substring(endIfIndex + 8); // 8 is the length of '} else {'
          
          // Find the final closing brace and replace it
          const finalBraceIndex = content.indexOf('}', endIfIndex + 8);
          if (finalBraceIndex !== -1) {
            content = content.substring(0, finalBraceIndex) + 
                     ');' + 
                     content.substring(finalBraceIndex + 1);
          }
        }
        
        modified = true;
      }
    }
    
    // Write the fixed content back to the file
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed syntax errors in ${filePath}`);
    } else {
      console.log(`⚠️ No changes made to ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Script file fixes completed.'); 