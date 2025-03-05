import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { getFirebaseFirestore } from './firebase';
import { logger } from './logger';

// Initialize Google APIs and Secret Manager
const iam = google.iam('v1');
const secretManager = new SecretManagerServiceClient();

// Helper function to get Firestore instance
async function getDb() {
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
}

/**
 * Creates a service account for a customer
 * @param customerId The ID of the customer
 * @param customerName The name of the customer
 * @returns Object containing service account email and key reference
 */
export async function createServiceAccount(customerId: string, customerName: string) {
  try {
    // Normalize customer name for use in service account
    const normalizedName = customerName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const serviceAccountId = `customer-${normalizedName}-${uuidv4().slice(0, 8)}`;
    const serviceAccountEmail = `${serviceAccountId}@${process.env.FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`;

    // Create service account in GCP
    const [serviceAccount] = await iam.projects.serviceAccounts.create({
      name: `projects/${process.env.FIREBASE_PROJECT_ID}`,
      requestBody: {
        accountId: serviceAccountId,
        displayName: `Service Account for ${customerName}`,
        description: `Service account for customer ${customerId}`
      }
    });

    // Create initial key
    const keyReference = await createServiceAccountKey(serviceAccountEmail);

    // Store service account info in Firestore
    const db = await getDb();
    await db.collection('service_accounts').doc(customerId).set({
      email: serviceAccountEmail,
      keyReference,
      created: new Date().toISOString(),
      lastRotated: new Date().toISOString()
    });

    logger.info(`Created service account for customer ${customerId}`, {
      serviceAccountEmail,
      keyReference
    });

    return {
      email: serviceAccountEmail,
      keyReference
    };
  } catch (error) {
    logger.error('Error creating service account:', error);
    throw error;
  }
}

/**
 * Creates a key for a service account and stores it in Secret Manager
 * @param serviceAccountEmail The email of the service account
 * @returns The reference to the key in Secret Manager
 */
async function createServiceAccountKey(serviceAccountEmail: string): Promise<string> {
  try {
    // Create the key
    const keyResponse = await iam.projects.serviceAccounts.keys.create({
      name: `projects/-/serviceAccounts/${serviceAccountEmail}`,
    });
    
    if (!keyResponse.data.privateKeyData) {
      throw new Error('Failed to create service account key: privateKeyData not returned');
    }
    
    // Generate a unique ID for the secret
    const secretId = `sa-key-${uuidv4()}`;
    
    // Project ID from environment variable
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set');
    }
    
    // Create the secret in Secret Manager
    const parent = `projects/${projectId}`;
    await secretManager.createSecret({
      parent,
      secretId,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });
    
    // Add the key as a version to the secret
    await secretManager.addSecretVersion({
      parent: `projects/${projectId}/secrets/${secretId}`,
      payload: {
        data: Buffer.from(keyResponse.data.privateKeyData, 'base64'),
      },
    });
    
    logger.info(`Created key for service account ${serviceAccountEmail} and stored in Secret Manager`);
    
    return secretId;
  } catch (error) {
    logger.error('Error creating service account key:', error);
    throw error;
  }
}

/**
 * Rotates the key for a service account
 * @param serviceAccountEmail The email of the service account
 * @returns The reference to the new key in Secret Manager
 */
export async function rotateServiceAccountKey(serviceAccountEmail: string): Promise<string> {
  try {
    // Create a new key for the service account
    const newKeyReference = await createServiceAccountKey(serviceAccountEmail);
    
    // List existing keys
    const listResponse = await iam.projects.serviceAccounts.keys.list({
      name: `projects/-/serviceAccounts/${serviceAccountEmail}`,
    });
    
    // Get keys excluding the newest one (we just created)
    const keysToDelete = listResponse.data.keys?.filter(key => 
      key.keyType === 'USER_MANAGED' && 
      key.name && 
      !key.name.includes('just-created')
    );
    
    // Delete old keys (keeping the newly created one)
    if (keysToDelete && keysToDelete.length > 0) {
      for (const key of keysToDelete) {
        if (key.name) {
          await iam.projects.serviceAccounts.keys.delete({
            name: key.name,
          });
          logger.info(`Deleted old key for service account ${serviceAccountEmail}`);
        }
      }
    }
    
    logger.info(`Rotated key for service account ${serviceAccountEmail}`);
    
    return newKeyReference;
  } catch (error) {
    logger.error('Error rotating service account key:', error);
    throw error;
  }
}

/**
 * Deletes a service account
 * @param serviceAccountEmail The email of the service account
 * @returns True if successful
 */
export async function deleteServiceAccount(serviceAccountEmail: string): Promise<boolean> {
  try {
    // Delete the service account
    await iam.projects.serviceAccounts.delete({
      name: `projects/-/serviceAccounts/${serviceAccountEmail}`,
    });
    
    logger.info(`Deleted service account ${serviceAccountEmail}`);
    
    return true;
  } catch (error) {
    logger.error('Error deleting service account:', error);
    throw error;
  }
}

/**
 * Gets a service account key from Secret Manager
 * @param keyReference The reference to the key in Secret Manager
 * @returns The service account key as a string
 */
export async function getServiceAccountKey(keyReference: string): Promise<string> {
  try {
    // Project ID from environment variable
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set');
    }
    
    // Get the secret
    const [version] = await secretManager.accessSecretVersion({
      name: `projects/${projectId}/secrets/${keyReference}/versions/latest`,
    });
    
    if (!version.payload?.data) {
      throw new Error('Failed to get service account key: secret data not returned');
    }
    
    return version.payload.data.toString();
  } catch (error) {
    logger.error('Error getting service account key:', error);
    throw error;
  }
} 