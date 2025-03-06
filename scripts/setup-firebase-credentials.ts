/**
 * Firebase Credentials Setup Script
 * 
 * This script helps set up Firebase credentials properly in a .env file
 * by interactively asking for credentials or using a service account JSON file.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { fixPrivateKey } from '../src/lib/key-fixer';

// Load existing environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Helper function to write to .env file
function updateEnvFile(envVars: Record<string, string>) {
  const envPath = path.join(process.cwd(), '.env');
  
  // Read existing .env file if it exists
  let existingEnv = '';
  try {
    if (fs.existsSync(envPath)) {
      existingEnv = fs.readFileSync(envPath, 'utf8');
    }
  } catch (error) {
    console.error('Error reading .env file:', error);
  }
  
  // Update variables in existing env content
  const envLines = existingEnv.split('\n');
  const updatedLines = [];
  const processedKeys = new Set<string>();
  
  // Process existing lines
  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      updatedLines.push(line); // Keep comments and empty lines
      continue;
    }
    
    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      
      if (key in envVars) {
        // Update existing variable
        updatedLines.push(`${key}="${envVars[key]}"`);
        processedKeys.add(key);
      } else {
        // Keep existing variable
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }
  }
  
  // Add new variables
  for (const [key, value] of Object.entries(envVars)) {
    if (!processedKeys.has(key)) {
      updatedLines.push(`${key}="${value}"`);
    }
  }
  
  // Write updated .env file
  fs.writeFileSync(envPath, updatedLines.join('\n'));
  console.log(`\n✅ Updated .env file at ${envPath}`);
}

// Process a service account JSON file
async function processServiceAccountFile(filePath: string) {
  try {
    console.log(`Reading service account file: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const serviceAccount = JSON.parse(fileContent);
    
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      console.error('❌ Invalid service account file. Missing required fields.');
      return false;
    }
    
    // Fix private key format
    const fixedPrivateKey = fixPrivateKey(serviceAccount.private_key);
    
    // Create environment variables
    const envVars = {
      FIREBASE_PROJECT_ID: serviceAccount.project_id,
      FIREBASE_CLIENT_EMAIL: serviceAccount.client_email,
      FIREBASE_PRIVATE_KEY: fixedPrivateKey,
    };
    
    // Update .env file
    updateEnvFile(envVars);
    
    console.log('\n✅ Firebase credentials extracted and configured successfully!');
    console.log(`Project ID: ${serviceAccount.project_id}`);
    console.log(`Client Email: ${serviceAccount.client_email}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error processing service account file:', error);
    return false;
  }
}

// Create a base64 encoded service account string
function createBase64ServiceAccount(serviceAccount: any) {
  try {
    const jsonString = JSON.stringify(serviceAccount);
    const base64String = Buffer.from(jsonString).toString('base64');
    
    // Update .env file with base64 encoded string
    updateEnvFile({
      FIREBASE_SERVICE_ACCOUNT: base64String
    });
    
    console.log('\n✅ Created base64 encoded service account in .env file');
    return true;
  } catch (error) {
    console.error('❌ Error creating base64 service account:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Firebase Credentials Setup ===');
  
  const setupMethod = await prompt(
    '\nSelect setup method:\n1. Use a service account JSON file\n2. Enter credential values manually\n3. Set GOOGLE_APPLICATION_CREDENTIALS path\nEnter choice (1-3): '
  );
  
  if (setupMethod === '1') {
    // Service account JSON file
    const filePath = await prompt('\nEnter the path to your service account JSON file: ');
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File does not exist: ${filePath}`);
      rl.close();
      return;
    }
    
    const result = await processServiceAccountFile(filePath);
    
    if (result) {
      // Ask if they want to save as base64 as well
      const saveBase64 = await prompt('\nDo you also want to save as base64 encoded FIREBASE_SERVICE_ACCOUNT? (y/n): ');
      if (saveBase64.toLowerCase() === 'y') {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);
        createBase64ServiceAccount(serviceAccount);
      }
      
      // Set the GOOGLE_APPLICATION_CREDENTIALS path as well
      const setCredPath = await prompt('\nDo you want to set GOOGLE_APPLICATION_CREDENTIALS to this file path? (y/n): ');
      if (setCredPath.toLowerCase() === 'y') {
        const absolutePath = path.resolve(filePath);
        updateEnvFile({
          GOOGLE_APPLICATION_CREDENTIALS: absolutePath
        });
        console.log(`\n✅ Set GOOGLE_APPLICATION_CREDENTIALS to: ${absolutePath}`);
      }
    }
  } 
  else if (setupMethod === '2') {
    // Manual entry
    console.log('\nEnter the following Firebase credential values:');
    
    const projectId = await prompt('Project ID: ');
    const clientEmail = await prompt('Client Email: ');
    let privateKey = await prompt('Private Key (paste the entire key including BEGIN/END markers): ');
    
    // Fix private key format
    try {
      privateKey = fixPrivateKey(privateKey);
      console.log('✅ Private key format fixed successfully');
    } catch (error) {
      console.warn('⚠️ Could not fix private key format:', error);
    }
    
    // Create environment variables
    const envVars = {
      FIREBASE_PROJECT_ID: projectId,
      FIREBASE_CLIENT_EMAIL: clientEmail,
      FIREBASE_PRIVATE_KEY: privateKey,
    };
    
    // Update .env file
    updateEnvFile(envVars);
    
    // Ask if they want to save as base64 as well
    const saveBase64 = await prompt('\nDo you also want to save as base64 encoded FIREBASE_SERVICE_ACCOUNT? (y/n): ');
    if (saveBase64.toLowerCase() === 'y') {
      const serviceAccount = {
        type: 'service_account',
        project_id: projectId,
        client_email: clientEmail,
        private_key: privateKey
      };
      createBase64ServiceAccount(serviceAccount);
    }
  }
  else if (setupMethod === '3') {
    // Set GOOGLE_APPLICATION_CREDENTIALS path
    const credPath = await prompt('\nEnter the path to your service account JSON file: ');
    
    if (!fs.existsSync(credPath)) {
      console.error(`❌ File does not exist: ${credPath}`);
      rl.close();
      return;
    }
    
    const absolutePath = path.resolve(credPath);
    updateEnvFile({
      GOOGLE_APPLICATION_CREDENTIALS: absolutePath
    });
    
    console.log(`\n✅ Set GOOGLE_APPLICATION_CREDENTIALS to: ${absolutePath}`);
    
    // Offer to also process the file
    const processFile = await prompt('\nDo you also want to extract credentials from this file? (y/n): ');
    if (processFile.toLowerCase() === 'y') {
      await processServiceAccountFile(credPath);
    }
  }
  else {
    console.log('❌ Invalid choice');
  }
  
  console.log('\n=== Setup Complete ===');
  console.log('To verify your credentials, run: npx ts-node scripts/check-firebase-env.ts');
  
  rl.close();
}

// Run the setup
main().catch(error => {
  console.error('Unhandled error:', error);
  rl.close();
  process.exit(1);
}); 