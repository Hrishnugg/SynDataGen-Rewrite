/**
 * Firebase Diagnostics Utility
 * 
 * This script helps diagnose issues with Firebase authentication and mock data usage.
 */

const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./load-env');

/**
 * Run a comprehensive diagnostic on Firebase configuration
 */
function runDiagnostic() {
  // First ensure environment variables are loaded
  loadEnv();
  
  console.log('=== FIREBASE DIAGNOSTICS ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Process CWD:', process.cwd());
  console.log('Node Version:', process.version);
  
  // Check environment variables
  console.log('\n1. Environment Variables:');
  const firebaseEnvVars = Object.keys(process.env).filter(key => 
    key.toLowerCase().includes('firebase') || 
    key.toLowerCase().includes('google') || 
    key.toLowerCase().includes('mock')
  );
  
  if (firebaseEnvVars.length > 0) {
    console.log(`Found ${firebaseEnvVars.length} Firebase/Google related environment variables:`);
    firebaseEnvVars.forEach(key => {
      const value = process.env[key];
      if (key.toLowerCase().includes('key')) {
        console.log(`- ${key}: [PRESENT] (${value ? value.length : 0} characters)`);
      } else {
        console.log(`- ${key}: ${value || '[NOT SET]'}`);
      }
    });
  } else {
    console.log('No Firebase/Google related environment variables found!');
  }
  
  // Check service account path
  console.log('\n2. Service Account Path Resolution:');
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (credentialsPath) {
    console.log(`GOOGLE_APPLICATION_CREDENTIALS is set to: ${credentialsPath}`);
    
    // Try resolving the path
    try {
      // Check if it's a relative path
      if (credentialsPath.startsWith('./') || credentialsPath.startsWith('../')) {
        console.log('Path is relative, attempting to resolve from different base directories:');
        
        const baseDirs = [
          process.cwd(),
          path.join(process.cwd(), 'src'),
          path.resolve('.')
        ];
        
        baseDirs.forEach(baseDir => {
          const resolvedPath = path.resolve(baseDir, credentialsPath);
          const exists = fs.existsSync(resolvedPath);
          console.log(`- From ${baseDir}:`);
          console.log(`  Resolves to: ${resolvedPath}`);
          console.log(`  File exists: ${exists ? 'YES' : 'NO'}`);
        });
      } else {
        // Absolute path
        const exists = fs.existsSync(credentialsPath);
        console.log(`Path is absolute: ${credentialsPath}`);
        console.log(`File exists: ${exists ? 'YES' : 'NO'}`);
      }
    } catch (error) {
      console.error('Error resolving path:', error.message);
    }
  } else {
    console.log('GOOGLE_APPLICATION_CREDENTIALS is not set!');
  }
  
  // Check mock data conditions
  console.log('\n3. Mock Data Conditions:');
  
  const mockConditions = [
    { name: 'MOCK_FIREBASE environment variable', value: process.env.MOCK_FIREBASE === 'true' },
    { name: 'USE_MOCK_DATA environment variable', value: process.env.USE_MOCK_DATA === 'true' },
    { name: 'FORCE_REAL_FIRESTORE environment variable', value: process.env.FORCE_REAL_FIRESTORE !== 'true' },
    { name: 'NODE_ENV is development', value: process.env.NODE_ENV === 'development' },
    { name: 'Credentials path is missing', value: !process.env.GOOGLE_APPLICATION_CREDENTIALS }
  ];
  
  console.log('Conditions that could trigger mock data usage:');
  mockConditions.forEach(condition => {
    console.log(`- ${condition.name}: ${condition.value ? 'TRUE (could cause mock data)' : 'FALSE'}`);
  });
  
  // Check service account file content if it exists
  console.log('\n4. Service Account File Analysis:');
  
  if (credentialsPath) {
    try {
      const resolvedPath = path.resolve(process.cwd(), credentialsPath);
      
      if (fs.existsSync(resolvedPath)) {
        console.log(`Reading service account file from: ${resolvedPath}`);
        
        try {
          const fileContent = fs.readFileSync(resolvedPath, 'utf8');
          const serviceAccount = JSON.parse(fileContent);
          
          console.log('Service account file parsed successfully:');
          console.log(`- type: ${serviceAccount.type || '[MISSING]'}`);
          console.log(`- project_id: ${serviceAccount.project_id || '[MISSING]'}`);
          console.log(`- private_key_id: ${serviceAccount.private_key_id ? '[PRESENT]' : '[MISSING]'}`);
          console.log(`- client_email: ${serviceAccount.client_email || '[MISSING]'}`);
          console.log(`- private_key: ${serviceAccount.private_key ? '[PRESENT]' : '[MISSING]'}`);
          
          if (serviceAccount.private_key) {
            const privateKey = serviceAccount.private_key;
            console.log('Private key analysis:');
            console.log(`- Length: ${privateKey.length} characters`);
            console.log(`- Contains "BEGIN PRIVATE KEY": ${privateKey.includes('BEGIN PRIVATE KEY')}`);
            console.log(`- Contains "END PRIVATE KEY": ${privateKey.includes('END PRIVATE KEY')}`);
            console.log(`- Contains actual newlines: ${privateKey.includes('\n')}`);
            console.log(`- Contains escaped newlines: ${privateKey.includes('\\n')}`);
            console.log(`- Number of lines: ${privateKey.split('\n').length}`);
          }
        } catch (parseError) {
          console.error('Error parsing service account file:', parseError.message);
        }
      } else {
        console.log(`Service account file not found at resolved path: ${resolvedPath}`);
      }
    } catch (error) {
      console.error('Error analyzing service account file:', error.message);
    }
  } else {
    console.log('Cannot analyze service account file: GOOGLE_APPLICATION_CREDENTIALS not set');
  }
  
  // Check relevant source code for mock data conditions
  console.log('\n5. Source Code Check:');
  
  // Common files that contain mock data logic
  const filesToCheck = [
    'src/lib/services/db-service.ts',
    'src/app/api/projects/route.ts'
  ];
  
  filesToCheck.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        console.log(`\nChecking ${filePath}...`);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Look for mock data conditions
        const mockDataConditions = [
          {
            pattern: /NODE_ENV.*development.*mock/i,
            description: 'Using mock data in development environment'
          },
          {
            pattern: /MOCK_FIREBASE.*true/i,
            description: 'Using mock data when MOCK_FIREBASE is true'
          },
          {
            pattern: /!firebaseCredentialsFound/i,
            description: 'Using mock data when Firebase credentials not found'
          },
          {
            pattern: /getMockFirestoreService/i,
            description: 'Function to get mock Firestore service'
          }
        ];
        
        mockDataConditions.forEach(condition => {
          if (condition.pattern.test(content)) {
            console.log(`Found condition: ${condition.description}`);
          }
        });
      } else {
        console.log(`File not found: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error checking file ${filePath}:`, error.message);
    }
  });
  
  console.log('\n=== END DIAGNOSTICS ===');
}

// Run the diagnostic
runDiagnostic();

// Export the function for use in other files
module.exports = { runDiagnostic }; 