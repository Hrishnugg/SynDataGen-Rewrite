/**
 * Check Credentials File Script
 * 
 * This script checks for the existence of Firebase credentials files
 * in various locations and helps diagnose path resolution issues.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('=== Firebase Credentials File Check ===');
console.log('Current working directory:', process.cwd());

// Check for GOOGLE_APPLICATION_CREDENTIALS environment variable
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
console.log('\nGOOGLE_APPLICATION_CREDENTIALS:', credentialsPath || '[NOT SET]');

if (credentialsPath) {
  // Try multiple ways to resolve the path
  const resolvedPaths = [
    // Original path
    credentialsPath,
    
    // Path resolved from CWD
    path.resolve(process.cwd(), credentialsPath),
    
    // Path with ./ removed if present
    path.resolve(process.cwd(), credentialsPath.replace(/^\.\//, '')),
    
    // Just the filename part, in case directory structure is wrong
    path.join(process.cwd(), path.basename(credentialsPath)),
    
    // Path in credentials directory
    path.join(process.cwd(), 'credentials', path.basename(credentialsPath))
  ];
  
  console.log('\nChecking multiple path resolutions:');
  resolvedPaths.forEach(resolvedPath => {
    try {
      const exists = fs.existsSync(resolvedPath);
      console.log(`- ${resolvedPath}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      
      if (exists) {
        try {
          const stats = fs.statSync(resolvedPath);
          console.log(`  - Size: ${stats.size} bytes`);
          console.log(`  - Type: ${stats.isFile() ? 'File' : 'Not a File'}`);
          
          if (stats.isFile()) {
            try {
              const content = fs.readFileSync(resolvedPath, 'utf8');
              try {
                const json = JSON.parse(content);
                console.log('  - Valid JSON: YES');
                console.log(`  - Has project_id: ${json.project_id ? 'YES' : 'NO'}`);
                console.log(`  - Has client_email: ${json.client_email ? 'YES' : 'NO'}`);
                console.log(`  - Has private_key: ${json.private_key ? 'YES' : 'NO'}`);
              } catch (jsonError) {
                console.log('  - Valid JSON: NO');
                console.log(`  - JSON Error: ${jsonError.message}`);
              }
            } catch (readError) {
              console.log(`  - Error reading file: ${readError.message}`);
            }
          }
        } catch (statError) {
          console.log(`  - Error getting file stats: ${statError.message}`);
        }
      }
    } catch (error) {
      console.log(`- ${resolvedPath}: ERROR: ${error.message}`);
    }
  });
}

// Check for files in the credentials directory
console.log('\nChecking credentials directory:');
const credentialsDir = path.join(process.cwd(), 'credentials');

try {
  if (fs.existsSync(credentialsDir)) {
    console.log(`- Credentials directory exists at: ${credentialsDir}`);
    
    // List files in the directory
    try {
      const files = fs.readdirSync(credentialsDir);
      console.log(`- Found ${files.length} files in credentials directory:`);
      
      files.forEach(file => {
        const filePath = path.join(credentialsDir, file);
        try {
          const stats = fs.statSync(filePath);
          console.log(`  - ${file} (${stats.size} bytes)`);
          
          // Try to identify service account files
          if (file.includes('firebase') || file.includes('service-account') || file.includes('adminsdk')) {
            console.log(`    * Looks like a service account file`);
            
            // Check if it's readable and contains valid JSON
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              try {
                const json = JSON.parse(content);
                console.log(`    * Contains valid JSON: YES`);
                console.log(`    * Has project_id: ${json.project_id ? 'YES' : 'NO'}`);
              } catch (jsonError) {
                console.log(`    * Contains valid JSON: NO - ${jsonError.message}`);
              }
            } catch (readError) {
              console.log(`    * Error reading file: ${readError.message}`);
            }
          }
        } catch (statError) {
          console.log(`  - ${file}: ERROR: ${statError.message}`);
        }
      });
    } catch (readError) {
      console.log(`- Error reading credentials directory: ${readError.message}`);
    }
  } else {
    console.log(`- Credentials directory does not exist at: ${credentialsDir}`);
    console.log(`- Creating credentials directory...`);
    
    try {
      fs.mkdirSync(credentialsDir, { recursive: true });
      console.log(`- Created credentials directory successfully`);
    } catch (mkdirError) {
      console.log(`- Error creating credentials directory: ${mkdirError.message}`);
    }
  }
} catch (error) {
  console.log(`- Error checking credentials directory: ${error.message}`);
}

// Provide advice
console.log('\n=== Recommendations ===');
if (!credentialsPath) {
  console.log('1. Set GOOGLE_APPLICATION_CREDENTIALS in your .env.local file');
  console.log('   Example: GOOGLE_APPLICATION_CREDENTIALS=./credentials/firebase-service-account.json');
}

console.log('2. Make sure your service account file exists at the specified path');
console.log('3. Consider using absolute paths if relative paths are not resolving correctly');
console.log('4. If you have a service account file with a different name, rename it to firebase-service-account.json');
console.log('5. Ensure your service account file contains valid JSON with project_id, client_email, and private_key');
console.log('\n=== End of Report ==='); 