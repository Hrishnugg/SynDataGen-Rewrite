/**
 * GCP Secret Manager Service
 * 
 * Utilities for managing secrets securely in Google Cloud Secret Manager.
 */

import * as admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Initialize Secret Manager client
let secretManagerClient: SecretManagerServiceClient | null = null;
let isInitialized = false;

/**
 * Initialize the Secret Manager client
 */
export async function initializeSecretManager(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    // Initialize Firebase if needed
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    // Create Secret Manager client
    secretManagerClient = new SecretManagerServiceClient();
    isInitialized = true;
    console.log('Secret Manager initialized successfully');
  } catch (error: any) {
    console.error('Secret Manager initialization failed:', error);
    throw error;
  }
}

/**
 * Get the Secret Manager client
 */
export function getSecretManagerClient(): SecretManagerServiceClient {
  if (!isInitialized || !secretManagerClient) {
    throw new Error('Secret Manager not initialized. Call initializeSecretManager first.');
  }
  return secretManagerClient;
}

/**
 * Ensure Secret Manager is initialized
 */
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await initializeSecretManager();
  }
}

/**
 * Store a secret in Secret Manager
 * 
 * @param secretName Name of the secret
 * @param secretValue Value to store
 * @param labels Optional labels to attach to the secret
 * @returns Secret version name
 */
export async function storeSecret(
  secretName: string,
  secretValue: string,
  labels?: Record<string, string>
): Promise<string> {
  await ensureInitialized();
  
  // Get project ID from environment or config
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found in environment variables. Set GOOGLE_CLOUD_PROJECT or GCP_PROJECT.');
  }
  
  const parent = `projects/${projectId}`;
  
  try {
    // Check if the secret already exists
    let secretExists = false;
    try {
      const [secret] = await secretManagerClient!.getSecret({
        name: `${parent}/secrets/${secretName}`
      });
      secretExists = !!secret;
    } catch (error) {
      // Secret doesn't exist, which is fine
      secretExists = false;
    }
    
    // Create the secret if it doesn't exist
    if (!secretExists) {
      await secretManagerClient!.createSecret({
        parent,
        secretId: secretName,
        secret: {
          labels,
          replication: {
            automatic: {}
          }
        }
      });
      
      console.log(`Secret ${secretName} created successfully`);
    }
    
    // Add a new version with the secret value
    const [version] = await secretManagerClient!.addSecretVersion({
      parent: `${parent}/secrets/${secretName}`,
      payload: {
        data: Buffer.from(secretValue, 'utf8')
      }
    });
    
    console.log(`Secret version ${version.name} added successfully`);
    return version.name || '';
  } catch (error: any) {
    console.error(`Error storing secret ${secretName}:`, error);
    throw error;
  }
}

/**
 * Get a secret from Secret Manager
 * 
 * @param secretName Name of the secret
 * @param version Optional version (defaults to latest)
 * @returns Secret value
 */
export async function getSecret(
  secretName: string,
  version?: string
): Promise<string> {
  await ensureInitialized();
  
  // Get project ID from environment or config
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found in environment variables. Set GOOGLE_CLOUD_PROJECT or GCP_PROJECT.');
  }
  
  try {
    // Format the secret version name
    const versionName = version 
      ? `projects/${projectId}/secrets/${secretName}/versions/${version}`
      : `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    // Access the secret version
    const [response] = await secretManagerClient!.accessSecretVersion({
      name: versionName
    });
    
    // Extract the secret payload
    const payload = response.payload!.data!.toString();
    return payload;
  } catch (error: any) {
    console.error(`Error getting secret ${secretName}:`, error);
    throw error;
  }
}

/**
 * Rotate a secret in Secret Manager
 * 
 * @param secretName Name of the secret
 * @param newSecretValue New value for the secret
 * @returns New secret version name
 */
export async function rotateSecret(
  secretName: string,
  newSecretValue: string
): Promise<string> {
  await ensureInitialized();
  
  try {
    // Add a new version with the new secret value
    const newVersionName = await storeSecret(secretName, newSecretValue);
    console.log(`Secret ${secretName} rotated successfully`);
    return newVersionName;
  } catch (error: any) {
    console.error(`Error rotating secret ${secretName}:`, error);
    throw error;
  }
}

/**
 * Delete a secret from Secret Manager
 * 
 * @param secretName Name of the secret
 * @returns True if successful
 */
export async function deleteSecret(
  secretName: string
): Promise<boolean> {
  await ensureInitialized();
  
  // Get project ID from environment or config
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found in environment variables. Set GOOGLE_CLOUD_PROJECT or GCP_PROJECT.');
  }
  
  try {
    await secretManagerClient!.deleteSecret({
      name: `projects/${projectId}/secrets/${secretName}`
    });
    
    console.log(`Secret ${secretName} deleted successfully`);
    return true;
  } catch (error: any) {
    console.error(`Error deleting secret ${secretName}:`, error);
    throw error;
  }
}