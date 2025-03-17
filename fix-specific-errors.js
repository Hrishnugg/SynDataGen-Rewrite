const fs = require('fs');
const path = require('path');

// Define specific errors to fix
const specificFixes = [
  {
    file: 'src/lib/api/services/firestore-service.ts',
    fixes: [
      // Fix incorrect type imports
      { pattern: /import {\s*([^}]+);\s*}/g, replacement: 'import { $1 }' },
      
      // Fix messag,e pattern
      { pattern: /error\.messag,\s*e/g, replacement: 'error.message' },
      { pattern: /messag,e/g, replacement: 'message' },
      
      // Fix the buildQuery method declaration
      { pattern: /private buildQuery\(/g, replacement: '  private buildQuery(' },
      
      // Fix the queryDocuments method
      { pattern: /async queryDocuments<T = DocumentData>\(\s*collectionPath: string,\s*queryFn: \(collectionRe,f:/g, 
        replacement: '  async queryDocuments<T = DocumentData>(\n    collectionPath: string,\n    queryFn: (collectionRef:' },
      
      // Fix getCollection method
      { pattern: /async getCollection<T = DocumentData>\(collectionPath: string\): Promise<CollectionReference<T>>/g, 
        replacement: '  async getCollection<T = DocumentData>(collectionPath: string): Promise<CollectionReference<T>>' },
      
      // Fix if statements with chained conditions
      { pattern: /if \(([^}]*)\) \{\s*\}\s*}/g, replacement: 'if ($1) {\n  }\n}' },
      
      // Fix conditional blocks
      { pattern: /if \(this\.if \(cacheConfig\) \{\s*\.enabled\) \{/g, 
        replacement: 'if (this.cacheConfig && this.cacheConfig.enabled) {' },
      
      // Fix export function
      { pattern: /let firestoreServiceInstance: FirestoreService \| null = null\s*\/\*\*\s*\* Get a FirestoreService instance/g, 
        replacement: 'let firestoreServiceInstance: FirestoreService | null = null;\n\n/**\n * Get a FirestoreService instance' },
      
      // Fix getFirestoreService function
      { pattern: /function getFirestoreService\(/g, 
        replacement: 'export async function getFirestoreService(' }
    ]
  },
  {
    file: 'src/features/data-generation/services/job-management-service.ts',
    fixes: [
      // Fix incorrect interface declarations
      { pattern: /getJobStatus\(jobI,d: string\): Promise<JobStatus>,/g, 
        replacement: 'getJobStatus(jobId: string): Promise<JobStatus>,' },
      
      // Fix parameter names with commas
      { pattern: /\(jobI,d:/g, replacement: '(jobId:' },
      { pattern: /\(customerI,d:/g, replacement: '(customerId:' },
      
      // Fix malformed JSON objects
      { pattern: /cooldownUntil;/g, replacement: 'cooldownUntil' },
      
      // Fix conditional blocks
      { pattern: /if \(job\.status === 'cancelled'\) \{([^}]*)\}/g, 
        replacement: 'if (job.status === \'cancelled\') {\n      $1\n    }' },
      
      // Fix if-else structures
      { pattern: /\} else \{\s*\/\/ In case of error, default to allowing the job/g, 
        replacement: '  } else {\n    // In case of error, default to allowing the job' },
      
      // Fix method declarations
      { pattern: /async checkRateLimit\(/g, replacement: '  async checkRateLimit(' },
      { pattern: /async getRateLimitStatus\(/g, replacement: '  async getRateLimitStatus(' },
      { pattern: /async updateCooldownStatus\(/g, replacement: '  async updateCooldownStatus(' },
      { pattern: /async getJobRetentionPolicy\(/g, replacement: '  async getJobRetentionPolicy(' }
    ]
  },
  {
    file: 'src/lib/gcp/firestore/initFirestore.ts',
    fixes: [
      // Fix incorrect if statement
      { pattern: /if \(global\.__firestoreState\.initialized && global\.__firestoreState\.instance;/g, 
        replacement: 'if (global.__firestoreState.initialized && global.__firestoreState.instance) {' },
      
      // Fix return statements
      { pattern: /return global\.__firestoreState\.instance\)/g, 
        replacement: 'return global.__firestoreState.instance;' },
      
      // Fix array declarations
      { pattern: /const localPaths = \[,;/g, replacement: 'const localPaths = [' },
      
      // Fix filter() calls
      { pattern: /\.filter\(,;/g, replacement: '.filter(' },
      
      // Fix arrow functions
      { pattern: /= > \{/g, replacement: ' => {' },
      
      // Fix incomplete expressions
      { pattern: /const hasRequiredFields = ;/g, 
        replacement: 'const hasRequiredFields = serviceAccount && serviceAccount.type && serviceAccount.project_id;' },
      
      // Fix incomplete boolean expressions
      { pattern: /serviceAccount\.project_id &&;/g, 
        replacement: 'serviceAccount.project_id && serviceAccount.private_key;' },
      
      // Fix try-catch blocks
      { pattern: /\} catch \(parseError: any\) \{/g, 
        replacement: '} catch (parseError: any) {' }
    ]
  },
  {
    file: 'src/lib/gcp/serviceAccount.ts',
    fixes: [
      // Fix if statement with incorrect equals operator
      { pattern: /if \(billingTier\s*=\s*==\s*'free'/g, 
        replacement: 'if (billingTier === \'free\'' },
      
      // Fix catch statement with comma
      { pattern: /\} catch \(erro, r: any\) \{/g, 
        replacement: '} catch (error: any) {' },
      
      // Fix malformed parameter
      { pattern: /,\s*\n\s*,/g, replacement: '' },
      
      // Fix customer checks
      { pattern: /if \(!customer \|\| !customer;/g, 
        replacement: 'if (!customer || !customer' },
      
      // Fix property access
      { pattern: /\.gcpConfig\?\.serviceAccountEmail\)/g, 
        replacement: '.gcpConfig?.serviceAccountEmail) {' },
      
      // Fix closing braces
      { pattern: /}(?:\s*\n)+\s*catch/g, 
        replacement: '}\n  catch' }
    ]
  }
];

// Process each file and apply its specific fixes
specificFixes.forEach(({ file, fixes }) => {
  const fullPath = path.resolve(process.cwd(), file);
  console.log(`Processing ${file}...`);
  
  try {
    // Read the file
    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    
    // Apply each fix
    fixes.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });
    
    // Write the file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Applied specific fixes to ${file}`);
    } else {
      console.log(`No changes made to ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Specific error fixing completed.'); 