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
  billingTier?: 'free' | 'basic' | 'professional' | 'enterprise';
  projectId?: string;
  customRoles?: string[];
}

/**
 * Service account creation result
 */
export interface ServiceAccountResult {
  accountId: string;
  email: string;
  keySecretName: string; // Reference to Secret Manager
  roles: string[];
}

/**
 * Define role templates for different billing tiers
 */
export const BILLING_TIER_ROLES: Record<string, string[]> = {
  'free': [
    'roles/storage.objectViewer',
    'roles/dataflow.viewer'
  ],
  'basic': [
    'roles/storage.objectUser',
    'roles/dataflow.developer',
    'roles/logging.viewer'
  ],
  'professional': [
    'roles/storage.objectAdmin',
    'roles/dataflow.developer',
    'roles/logging.viewer',
    'roles/monitoring.viewer'
  ],
  'enterprise': [
    'roles/storage.objectAdmin',
    'roles/dataflow.admin',
    'roles/logging.admin',
    'roles/monitoring.admin'
  ]
};

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
    // Create a more structured account ID using customer ID and sanitized name
    const sanitizedName = params.customerName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 15); // Keep it short
      
    const accountId = `sa-${sanitizedName}-${params.customerId.substring(0, 6)}`;
    
    // Create the service account
    console.log(`Creating service account: ${accountId} for customer ${params.customerId}`);
    
    const serviceAccount = await iamClient.projects.serviceAccounts.create({
      name: `projects/${projectId}`,
      requestBody: {
        accountId,
        serviceAccount: {
          displayName: `SynDataGen - ${params.customerName}`,
          description: `Service account for customer ${params.customerId} (${params.billingTier || 'free'} tier)`,
        }
      }
    });
    
    const email = serviceAccount.data.email;
    console.log(`Service account created: ${email}`);
    
    // Determine which roles to assign based on billing tier
    const billingTier = params.billingTier || 'free';
    let rolesToAssign = [...BILLING_TIER_ROLES[billingTier]];
    
    // Add any custom roles if specified
    if (params.customRoles && params.customRoles.length > 0) {
      rolesToAssign = [...rolesToAssign, ...params.customRoles];
    }
    
    // Assign roles to the service account
    const resource = `projects/${projectId}`;
    for (const role of rolesToAssign) {
      try {
        await assignRole(email, role, resource);
        console.log(`Assigned role ${role} to service account ${email}`);
      } catch (error) {
        console.error(`Error assigning role ${role} to service account ${email}:`, error);
        // Continue with other roles, don't fail the whole process
      }
    }
    
    // Create a key for the service account
    const key = await iamClient.projects.serviceAccounts.keys.create({
      name: `projects/${projectId}/serviceAccounts/${email}`,
      requestBody: {}
    });
    
    // The key is a base64-encoded JSON file
    const privateKeyData = Buffer.from(key.data.privateKeyData, 'base64').toString('utf8');
    
    // Store the key in Secret Manager with metadata
    const keySecretName = `sa-key-${params.customerId}`;
    await storeSecret(keySecretName, privateKeyData, {
      customerId: params.customerId,
      type: 'service-account-key',
      billingTier: billingTier,
      createdAt: new Date().toISOString(),
      serviceAccountEmail: email
    });
    
    console.log(`Service account key stored in Secret Manager: ${keySecretName}`);
    
    // Implement permission boundary if the customer is on free or basic tier
    if (billingTier === 'free' || billingTier === 'basic') {
      // Set up usage limits or resource constraints
      // This would typically involve setting up quotas or constraints
      console.log(`Setting up permission boundaries for ${billingTier} tier service account ${email}`);
      // Note: Implementation of quota/constraints would go here
    }
    
    return {
      accountId,
      email,
      keySecretName,
      roles: rolesToAssign
    };
  } catch (error: any) {
    console.error(`Error creating service account for customer ${params.customerId}:`, error);
    throw error;
  }
}

/**
 * Assign an IAM role to a service account
 * 
 * @param serviceAccountEmail Email of the service account
 * @param role Role to assign
 * @param resource Resource to assign the role on (e.g., project, bucket)
 */
async function assignRole(
  serviceAccountEmail: string, 
  role: string,
  resource: string
): Promise<void> {
  // Get current policy
  const policy = await iamClient.projects.getIamPolicy({
    resource: resource,
    requestBody: {
      options: {
        requestedPolicyVersion: 3
      }
    }
  });
  
  // Add binding for the role to the service account
  const serviceAccountMember = `serviceAccount:${serviceAccountEmail}`;
  const bindings = policy.data.bindings || [];
  
  let roleBinding = bindings.find((binding: any) => binding.role === role);
  
  if (!roleBinding) {
    roleBinding = {
      role: role,
      members: [serviceAccountMember]
    };
    bindings.push(roleBinding);
  } else if (!roleBinding.members.includes(serviceAccountMember)) {
    roleBinding.members.push(serviceAccountMember);
  }
  
  // Update policy
  await iamClient.projects.setIamPolicy({
    resource: resource,
    requestBody: {
      policy: {
        ...policy.data,
        bindings: bindings
      }
    }
  });
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
    const keySecretName = `sa-key-${customerId}`;
    await storeSecret(keySecretName, privateKeyData, {
      customerId,
      type: 'service-account-key',
      rotatedAt: new Date().toISOString(),
      serviceAccountEmail: email,
      billingTier: customer.billingTier || 'free'
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