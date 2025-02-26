/**
 * GCP Service Account Management
 * 
 * Utilities for managing customer service accounts.
 */

import * as admin from 'firebase-admin';
import { IAMCredentialsClient } from '@google-cloud/iam-credentials';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { storeSecret } from './secrets';

// Initialize clients
let iamClient: any = null;
let isInitialized = false;

/**
 * Service account creation parameters
 */
export interface ServiceAccountCreationParams {
  customerId: string;
  customerName: string;
  projectId?: string;
}

/**
 * Service account creation result
 */
export interface ServiceAccountResult {
  accountId: string;
  email: string;
  keySecretName: string; // Reference to Secret Manager
}

/**
 * Initialize the Service Account manager
 */
export async function initializeServiceAccountManager(): Promise<void> {
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

    // Create IAM client
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    iamClient = google.iam({
      version: 'v1',
      auth
    });

    isInitialized = true;
    console.log('Service Account Manager initialized successfully');
  } catch (error: any) {
    console.error('Service Account Manager initialization failed:', error);
    throw error;
  }
}

/**
 * Create a service account for a customer
 * 
 * @param params Service account creation parameters
 * @returns Service account information
 */
export async function createCustomerServiceAccount(
  params: ServiceAccountCreationParams
): Promise<ServiceAccountResult> {
  await ensureInitialized();
  
  // Get project ID from environment or config if not provided
  const projectId = params.projectId || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found. Either provide it in params or set GOOGLE_CLOUD_PROJECT environment variable.');
  }
  
  try {
    // Generate a unique account ID
    const accountId = `customer-${params.customerId.substring(0, 8)}-${Date.now().toString(36)}`;
    
    // Create the service account
    const serviceAccount = await iamClient.projects.serviceAccounts.create({
      name: `projects/${projectId}`,
      requestBody: {
        accountId,
        serviceAccount: {
          displayName: `SynDataGen Customer: ${params.customerName}`,
          description: `Service account for customer ${params.customerId}`,
        }
      }
    });
    
    const email = serviceAccount.data.email;
    console.log(`Service account created: ${email}`);
    
    // Create a key for the service account
    const key = await iamClient.projects.serviceAccounts.keys.create({
      name: `projects/${projectId}/serviceAccounts/${email}`,
      requestBody: {}
    });
    
    // The key is a base64-encoded JSON file
    const privateKeyData = Buffer.from(key.data.privateKeyData, 'base64').toString('utf8');
    
    // Store the key in Secret Manager
    const keySecretName = `customer-sa-key-${params.customerId}`;
    await storeSecret(keySecretName, privateKeyData, {
      customerId: params.customerId,
      type: 'service-account-key'
    });
    
    console.log(`Service account key stored in Secret Manager: ${keySecretName}`);
    
    return {
      accountId,
      email,
      keySecretName
    };
  } catch (error: any) {
    console.error(`Error creating service account for customer ${params.customerId}:`, error);
    throw error;
  }
}

/**
 * Rotate a service account key
 * 
 * @param customerId Customer ID
 * @returns New secret name
 */
export async function rotateServiceAccountKey(
  customerId: string
): Promise<string> {
  await ensureInitialized();
  
  // Get project ID from environment or config
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found. Set GOOGLE_CLOUD_PROJECT environment variable.');
  }
  
  try {
    // Get customer from Firestore to find service account email
    const db = admin.firestore();
    const customerDoc = await db.collection('customers').doc(customerId).get();
    
    if (!customerDoc.exists) {
      throw new Error(`Customer ${customerId} not found`);
    }
    
    const customer = customerDoc.data();
    if (!customer?.gcpConfig?.serviceAccountEmail) {
      throw new Error(`Service account email not found for customer ${customerId}`);
    }
    
    const email = customer.gcpConfig.serviceAccountEmail;
    
    // Create a new key
    const key = await iamClient.projects.serviceAccounts.keys.create({
      name: `projects/${projectId}/serviceAccounts/${email}`,
      requestBody: {}
    });
    
    // The key is a base64-encoded JSON file
    const privateKeyData = Buffer.from(key.data.privateKeyData, 'base64').toString('utf8');
    
    // Store the key in Secret Manager
    const keySecretName = `customer-sa-key-${customerId}`;
    await storeSecret(keySecretName, privateKeyData, {
      customerId,
      type: 'service-account-key',
      rotatedAt: new Date().toISOString()
    });
    
    // Find old keys and delete them
    const keys = await iamClient.projects.serviceAccounts.keys.list({
      name: `projects/${projectId}/serviceAccounts/${email}`,
      keyTypes: ['USER_MANAGED']
    });
    
    // Get the new key ID
    const newKeyId = key.data.name.split('/').pop();
    
    // Delete old keys
    for (const oldKey of keys.data.keys) {
      const oldKeyId = oldKey.name.split('/').pop();
      
      // Don't delete the key we just created
      if (oldKeyId !== newKeyId) {
        await iamClient.projects.serviceAccounts.keys.delete({
          name: `projects/${projectId}/serviceAccounts/${email}/keys/${oldKeyId}`
        });
        console.log(`Deleted old key ${oldKeyId} for service account ${email}`);
      }
    }
    
    console.log(`Service account key rotated for customer ${customerId}`);
    return keySecretName;
  } catch (error: any) {
    console.error(`Error rotating service account key for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Delete a service account
 * 
 * @param customerId Customer ID
 * @returns True if successful
 */
export async function deleteServiceAccount(
  customerId: string
): Promise<boolean> {
  await ensureInitialized();
  
  // Get project ID from environment or config
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found. Set GOOGLE_CLOUD_PROJECT environment variable.');
  }
  
  try {
    // Get customer from Firestore to find service account email
    const db = admin.firestore();
    const customerDoc = await db.collection('customers').doc(customerId).get();
    
    if (!customerDoc.exists) {
      throw new Error(`Customer ${customerId} not found`);
    }
    
    const customer = customerDoc.data();
    if (!customer?.gcpConfig?.serviceAccountEmail) {
      throw new Error(`Service account email not found for customer ${customerId}`);
    }
    
    const email = customer.gcpConfig.serviceAccountEmail;
    
    // Delete the service account
    await iamClient.projects.serviceAccounts.delete({
      name: `projects/${projectId}/serviceAccounts/${email}`
    });
    
    console.log(`Service account ${email} deleted for customer ${customerId}`);
    return true;
  } catch (error: any) {
    console.error(`Error deleting service account for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Audit service account permissions
 * 
 * @param customerId Customer ID
 * @returns Audit results
 */
export async function auditServiceAccountPermissions(
  customerId: string
): Promise<{
  permissions: string[];
  unusedPermissions: string[];
  recommendedChanges: string[];
}> {
  await ensureInitialized();
  
  // Get project ID from environment or config
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found. Set GOOGLE_CLOUD_PROJECT environment variable.');
  }
  
  try {
    // Get customer from Firestore to find service account email
    const db = admin.firestore();
    const customerDoc = await db.collection('customers').doc(customerId).get();
    
    if (!customerDoc.exists) {
      throw new Error(`Customer ${customerId} not found`);
    }
    
    const customer = customerDoc.data();
    if (!customer?.gcpConfig?.serviceAccountEmail) {
      throw new Error(`Service account email not found for customer ${customerId}`);
    }
    
    const email = customer.gcpConfig.serviceAccountEmail;
    
    // This would typically involve calling the IAM API to get permissions,
    // then analyzing them against access patterns. For now, we'll return placeholder data.
    return {
      permissions: [
        'storage.objects.get',
        'storage.objects.list',
        'storage.objects.create',
        'storage.objects.delete',
        'storage.buckets.get'
      ],
      unusedPermissions: [
        'storage.buckets.list'
      ],
      recommendedChanges: [
        'Remove storage.buckets.list permission (unused in last 90 days)'
      ]
    };
  } catch (error: any) {
    console.error(`Error auditing service account permissions for customer ${customerId}:`, error);
    throw error;
  }
}

/**
 * Ensure Service Account Manager is initialized
 */
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await initializeServiceAccountManager();
  }
} 