/**
 * Firebase Environment Setup Script
 * 
 * This script converts a Firebase service account JSON file to environment variables
 * and writes them to .env.local for local development.
 */

const fs = require('fs');
const path = require('path');

// Paths
const credentialsDir = path.join(process.cwd(), 'credentials');
const envFilePath = path.join(process.cwd(), '.env.local');

// Check if credentials directory exists, create if not
if (!fs.existsSync(credentialsDir)) {
  console.log('Creating credentials directory...');
  fs.mkdirSync(credentialsDir, { recursive: true });
}

// Function to find the service account file
function findServiceAccountFile() {
  if (!fs.existsSync(credentialsDir)) return null;
  
  const files = fs.readdirSync(credentialsDir);
  const serviceAccountFile = files.find(file => 
    file.includes('firebase') || 
    file.includes('service-account') || 
    file.includes('adminsdk')
  );
  
  return serviceAccountFile ? path.join(credentialsDir, serviceAccountFile) : null;
}

// Function to extract credentials from JSON
function extractCredentials(serviceAccountPath) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    // Validate required fields
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      console.error('Service account file is missing required fields.');
      process.exit(1);
    }
    
    return {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key
    };
  } catch (error) {
    console.error('Error reading or parsing service account file:', error.message);
    process.exit(1);
  }
}

// Function to create or update .env.local file
function updateEnvFile(credentials) {
  // Read existing .env.local if it exists
  let envContent = '';
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf8');
  }
  
  // Define the environment variables to add/update
  const envVars = {
    'FIREBASE_PROJECT_ID': credentials.projectId,
    'FIREBASE_CLIENT_EMAIL': credentials.clientEmail,
    'FIREBASE_PRIVATE_KEY': credentials.privateKey,
    'GOOGLE_APPLICATION_CREDENTIALS': './credentials/firebase-service-account.json',
    'FORCE_REAL_FIRESTORE': 'true',
    'MOCK_FIREBASE': 'false',
    'USE_MOCK_DATA': 'false'
  };
  
  // Process each environment variable
  for (const [key, value] of Object.entries(envVars)) {
    // Check if the variable exists in the current file
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const exists = regex.test(envContent);
    
    if (exists) {
      // Update existing variable
      envContent = envContent.replace(regex, `${key}=${key.includes('KEY') ? `"${value}"` : value}`);
    } else {
      // Add new variable
      envContent += `\n${key}=${key.includes('KEY') ? `"${value}"` : value}`;
    }
  }
  
  // Write the updated content back to .env.local
  fs.writeFileSync(envFilePath, envContent.trim());
  console.log('.env.local file updated with Firebase credentials!');
}

// Main execution
console.log('Setting up Firebase environment variables...');

// Check for service account file
const serviceAccountPath = findServiceAccountFile();
if (!serviceAccountPath) {
  console.log('\nNo service account file found in the credentials directory.');
  console.log('Please place your Firebase service account JSON file in the credentials/ directory and try again.');
  console.log('File should be named containing "firebase", "service-account", or "adminsdk".');
  process.exit(1);
}

console.log(`Found service account file: ${path.basename(serviceAccountPath)}`);
const credentials = extractCredentials(serviceAccountPath);
updateEnvFile(credentials);

console.log('\nDone! Your Firebase credentials are now set as environment variables.');
console.log('You can now run the application with: npm run dev');
console.log('\nImportant: .env.local and credentials/ are in .gitignore to keep your credentials secure.');
console.log('For production, add these environment variables to your Vercel project settings.') 