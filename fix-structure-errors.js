const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'src/lib/gcp/firestore/initFirestore.ts',
  'src/lib/gcp/serviceAccount.ts',
  'src/lib/api/services/firestore-service.ts',
  'src/features/data-generation/services/job-management-service.ts'
];

// Function to fix structural issues
function fixStructuralIssues(content, filePath) {
  let fixed = content;
  
  // Fix if statements
  fixed = fixed.replace(/if \(global\.__firestoreState\.initialized && global\.__firestoreState\.instance/g,
                      'if (global.__firestoreState?.initialized && global.__firestoreState?.instance)');
  
  // Fix mismatched brackets
  if (filePath.includes('initFirestore.ts')) {
    // Fix specific issues in initFirestore.ts
    fixed = fixed.replace(/\.settings\(settings\)/g, 'db.settings(settings)');
    fixed = fixed.replace(/\|\| settingsError\.message\.includes\('settings\(\) once'\)\)\) \{/g, 
                        '|| settingsError.message.includes(\'settings() once\')) {');
    
    // Fix broken array declarations
    fixed = fixed.replace(/\]\s*\n\s*\]/g, ']');
    
    // Fix permission check
    fixed = fixed.replace(/\(error\.message\.includes\('permission'\) \{/g, 
                        '(error.message.includes(\'permission\')) {');
    
    // Fix global state properties
    fixed = fixed.replace(/global\.__firestoreState \? global\.__firestoreState/g,
                        'global.__firestoreState ? global.__firestoreState');
    
    // Fix statement after catch
    fixed = fixed.replace(/\} catch \(error\) \{\s+\}/g, '} catch (error) {\n    console.error(error);\n  }');
    
    // Fix emulator settings
    fixed = fixed.replace(/\{\s+host: emulatorHost,\s+ssl: false,\s+\}\)/g,
                        '{ host: emulatorHost, ssl: false })');
  }
  
  if (filePath.includes('serviceAccount.ts')) {
    // Fix parameter declarations
    fixed = fixed.replace(/,\s*\n\s*,/g, '');
    
    // Fix customer checks
    fixed = fixed.replace(/if \(!customer \|\| !customer\.exists \|\| !customer\.data\(\)\s*\{/g,
                        'if (!customer || !customer.exists || !customer.data()) {');
    
    // Fix catch statements
    fixed = fixed.replace(/\} catch \(error: any\) \{/g, '} catch (error: any) {');
  }
  
  if (filePath.includes('firestore-service.ts')) {
    // Fix method declarations
    fixed = fixed.replace(/async create<T extends Record<string, any>\>/g,
                        '  async create<T extends Record<string, any>>');
    
    fixed = fixed.replace(/async createWithId<T extends Record<string, any>\>/g,
                        '  async createWithId<T extends Record<string, any>>');
    
    fixed = fixed.replace(/async update<T extends Record<string, any>\>/g,
                        '  async update<T extends Record<string, any>>');
    
    fixed = fixed.replace(/async delete\(/g, '  async delete(');
    
    // Fix parameter lists
    fixed = fixed.replace(/options: \{ useBatch\?: boolean \}\s*=\s*\{\}/g,
                        'options: { useBatch?: boolean } = {}');
    
    fixed = fixed.replace(/options: \{ merge\?: boolean, useBatch\?: boolean \}\s*=\s*\{\}/g,
                        'options: { merge?: boolean, useBatch?: boolean } = {}');
    
    // Fix return statements
    fixed = fixed.replace(/return await timeOperation\(/g, 'return await timeOperation(');
    
    // Fix method chaining
    fixed = fixed.replace(/return this\.db\.collection\(collectionPath\) as CollectionReference<T>;/g,
                        'return this.db.collection(collectionPath) as CollectionReference<T>;');
  }
  
  if (filePath.includes('job-management-service.ts')) {
    // No specific fixes needed here currently
  }
  
  // General fixes
  
  // Fix missing commas
  fixed = fixed.replace(/(\w+\s*:\s*[^,:{}]+)\s*(?=\s*\w+\s*:)/g, '$1,');
  
  // Fix brace issues
  fixed = fixed.replace(/\{\s*\}\s*\}/g, '{\n  }\n}');
  
  // Fix if/else blocks
  fixed = fixed.replace(/\} else \{(?!\s*\/\/)/g, '} else {\n    ');
  
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
    content = fixStructuralIssues(content, filePath);
    
    // Write the file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed structural issues in ${filePath}`);
    } else {
      console.log(`No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Structural error fixing completed.'); 