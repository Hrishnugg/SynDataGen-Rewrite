/**
 * Fix Service Account File Utility
 * 
 * This script reads the service account JSON file, properly formats the private key,
 * and writes it back to ensure it will work with Firebase Admin SDK.
 */

const fs = require('fs');
const path = require('path');

// Function to fix a private key
function fixPrivateKey(privateKey) {
  if (!privateKey) {
    throw new Error('Private key is empty or undefined');
  }

  // Step 1: Clean the key of any potential formatting issues
  let fixedKey = privateKey.trim();
  
  // Step 2: Remove surrounding quotes if present
  if (fixedKey.startsWith('"') && fixedKey.endsWith('"')) {
    fixedKey = fixedKey.slice(1, -1).trim();
  }
  
  // Step 3: Handle escaped newlines
  if (fixedKey.includes('\\n')) {
    fixedKey = fixedKey.replace(/\\n/g, '\n');
  }
  
  // Step 4: Extract just the base64 content for proper reformatting
  let base64Content = fixedKey;
  
  // Remove any headers/footers and other non-base64 characters
  base64Content = base64Content
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');
  
  // Step 5: Format the key in the exact PEM format with correct line breaks
  const formattedLines = base64Content.match(/.{1,64}/g) || [];
  const formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedLines.join('\n')}\n-----END PRIVATE KEY-----`;
  
  return formattedKey;
}

// Main function
async function fixServiceAccount() {
  console.log('=== Fix Service Account File Utility ===');
  
  // Look for service account files
  const possiblePaths = [
    path.join(process.cwd(), 'credentials', 'firebase-service-account.json'),
    path.join(process.cwd(), 'firebase-service-account.json'),
    path.join(process.cwd(), 'service-account.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ].filter(Boolean); // Remove null/undefined entries
  
  console.log('Looking for service account files...');
  
  let serviceAccountPath = null;
  let serviceAccountData = null;
  
  // Find the first valid service account file
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        console.log(`Found file at: ${filePath}`);
        
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(fileContent);
          
          if (data.type === 'service_account' && data.project_id && data.private_key && data.client_email) {
            console.log(`Valid service account found at: ${filePath}`);
            serviceAccountPath = filePath;
            serviceAccountData = data;
            break;
          } else {
            console.log(`File at ${filePath} is not a valid service account (missing required fields)`);
          }
        } catch (parseError) {
          console.error(`Error parsing file at ${filePath}:`, parseError.message);
        }
      }
    } catch (fileError) {
      console.error(`Error accessing file at ${filePath}:`, fileError.message);
    }
  }
  
  if (!serviceAccountPath || !serviceAccountData) {
    console.error('No valid service account file found!');
    return;
  }
  
  console.log('\nFixing private key format...');
  
  // Make a backup of the original file
  const backupPath = `${serviceAccountPath}.backup`;
  fs.copyFileSync(serviceAccountPath, backupPath);
  console.log(`Backup created at: ${backupPath}`);
  
  // Fix the private key
  const originalKey = serviceAccountData.private_key;
  const fixedKey = fixPrivateKey(originalKey);
  
  // Check if the key was modified
  if (originalKey !== fixedKey) {
    console.log('Private key format was fixed');
    
    // Update the service account data
    serviceAccountData.private_key = fixedKey;
    
    // Write the updated file
    fs.writeFileSync(serviceAccountPath, JSON.stringify(serviceAccountData, null, 2));
    console.log(`Updated service account file written to: ${serviceAccountPath}`);
    
    // Print diagnostic info
    console.log('\nPrivate key diagnostic info:');
    console.log(`- Original length: ${originalKey.length} characters`);
    console.log(`- Fixed length: ${fixedKey.length} characters`);
    console.log(`- Has actual newlines: ${fixedKey.includes('\n')}`);
    console.log(`- Has header marker: ${fixedKey.includes('BEGIN PRIVATE KEY')}`);
    console.log(`- Has footer marker: ${fixedKey.includes('END PRIVATE KEY')}`);
    console.log(`- Line count: ${fixedKey.split('\n').length}`);
  } else {
    console.log('Private key format appears to be already correct, no changes made');
  }
  
  console.log('\n✅ Service account processing complete');
}

// Run the function
fixServiceAccount().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 