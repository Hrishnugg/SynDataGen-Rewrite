/**
 * GCP Cloud Storage Service
 * 
 * Utilities for working with Google Cloud Storage buckets.
 */

import * as admin from 'firebase-admin';
import { Storage, Bucket } from '@google-cloud/storage';

// Initialize storage client
let storageInstance: Storage | null = null;
let isInitialized = false;

/**
 * Bucket lifecycle rule
 */
export interface BucketLifecycleRule {
  action: {
    type: 'Delete' | 'SetStorageClass';
    storageClass?: string;
  };
  condition: {
    age?: number;
    createdBefore?: string;
    customTimeBefore?: string;
    daysSinceCustomTime?: number;
    daysSinceNoncurrentTime?: number;
    isLive?: boolean;
    matchesStorageClass?: string[];
    noncurrentTimeBefore?: string;
    numNewerVersions?: number;
  };
}

/**
 * Bucket creation parameters
 */
export interface BucketCreationParams {
  projectId: string;
  customerId: string;
  region?: string;
  storageClass?: string;
}

/**
 * Bucket result
 */
export interface BucketResult {
  name: string;
  uri: string;
  region: string;
}

/**
 * Bucket usage result
 */
export interface BucketUsageResult {
  totalSizeBytes: number;
  objectCount: number;
  lastUpdated: Date;
}

/**
 * Initialize the Storage client
 */
export async function initializeStorage(): Promise<void> {
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

    // Initialize Cloud Storage client
    storageInstance = new Storage();
    isInitialized = true;
    console.log('Cloud Storage initialized successfully');
  } catch (error: any) {
    console.error('Cloud Storage initialization failed:', error);
    throw error;
  }
}

/**
 * Get the Storage instance
 */
export function getStorageInstance(): Storage {
  if (!isInitialized || !storageInstance) {
    throw new Error('Storage not initialized. Call initializeStorage first.');
  }
  return storageInstance;
}

/**
 * Create a new storage bucket for a project
 * 
 * @param params Bucket creation parameters
 * @returns Bucket result
 */
export async function createProjectBucket(
  params: BucketCreationParams
): Promise<BucketResult> {
  await ensureInitialized();
  
  const { projectId, customerId, region = 'us-central1', storageClass = 'STANDARD' } = params;
  
  // Generate a unique bucket name using project ID and customer ID
  // Bucket names must be globally unique across all of Google Cloud
  const bucketName = `syndatagen-${customerId.substring(0, 8)}-${projectId.substring(0, 8)}-${Date.now().toString(36)}`;
  
  try {
    const [bucket] = await storageInstance!.createBucket(bucketName, {
      location: region,
      storageClass,
      labels: {
        projectId,
        customerId,
        managed: 'true'
      }
    });
    
    console.log(`Bucket ${bucketName} created successfully in ${region}`);
    
    return {
      name: bucketName,
      uri: `gs://${bucketName}`,
      region
    };
  } catch (error: any) {
    console.error(`Error creating bucket for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Configure bucket IAM permissions
 * 
 * @param bucketName Bucket name
 * @param serviceAccountEmail Service account email to grant access
 * @param role IAM role to grant
 */
export async function configureBucketIAM(
  bucketName: string,
  serviceAccountEmail: string,
  role: string
): Promise<void> {
  await ensureInitialized();
  
  try {
    const bucket = storageInstance!.bucket(bucketName);
    
    // Get current IAM policy
    const [policy] = await bucket.iam.getPolicy({ requestedPolicyVersion: 3 });
    
    // Add the service account to the role
    const roleBindings = policy.bindings || [];
    const roleBinding = roleBindings.find((binding) => binding.role === role);
    
    if (roleBinding) {
      // Add member to existing role if not already present
      if (!roleBinding.members.includes(`serviceAccount:${serviceAccountEmail}`)) {
        roleBinding.members.push(`serviceAccount:${serviceAccountEmail}`);
      }
    } else {
      // Create new role binding
      roleBindings.push({
        role,
        members: [`serviceAccount:${serviceAccountEmail}`]
      });
    }
    
    // Set the updated policy
    policy.bindings = roleBindings;
    await bucket.iam.setPolicy(policy);
    
    console.log(`IAM policy updated for bucket ${bucketName}, granting ${role} to ${serviceAccountEmail}`);
  } catch (error: any) {
    console.error(`Error configuring IAM for bucket ${bucketName}:`, error);
    throw error;
  }
}

/**
 * Delete a bucket
 * 
 * @param bucketName Bucket name
 * @param force Whether to force deletion of non-empty buckets
 * @returns True if successful
 */
export async function deleteBucket(
  bucketName: string,
  force: boolean = false
): Promise<boolean> {
  await ensureInitialized();
  
  try {
    const bucket = storageInstance!.bucket(bucketName);
    
    if (force) {
      // Delete all objects in the bucket first
      await bucket.deleteFiles();
    }
    
    await bucket.delete();
    console.log(`Bucket ${bucketName} deleted successfully`);
    return true;
  } catch (error: any) {
    console.error(`Error deleting bucket ${bucketName}:`, error);
    throw error;
  }
}

/**
 * Set up bucket lifecycle rules
 * 
 * @param bucketName Bucket name
 * @param rules Lifecycle rules to apply
 */
export async function setupBucketLifecycle(
  bucketName: string,
  rules: BucketLifecycleRule[]
): Promise<void> {
  await ensureInitialized();
  
  try {
    const bucket = storageInstance!.bucket(bucketName);
    
    await bucket.setMetadata({
      lifecycle: {
        rule: rules
      }
    });
    
    console.log(`Lifecycle rules set for bucket ${bucketName}`);
  } catch (error: any) {
    console.error(`Error setting lifecycle rules for bucket ${bucketName}:`, error);
    throw error;
  }
}

/**
 * Get bucket usage metrics
 * 
 * @param bucketName Bucket name
 * @returns Bucket usage statistics
 */
export async function getBucketUsage(
  bucketName: string
): Promise<BucketUsageResult> {
  await ensureInitialized();
  
  try {
    const bucket = storageInstance!.bucket(bucketName);
    const [files] = await bucket.getFiles();
    
    let totalSizeBytes = 0;
    const objectCount = files.length;
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      totalSizeBytes += metadata.size ? parseInt(metadata.size.toString(), 10) : 0;
    }
    
    return {
      totalSizeBytes,
      objectCount,
      lastUpdated: new Date()
    };
  } catch (error: any) {
    console.error(`Error getting usage for bucket ${bucketName}:`, error);
    throw error;
  }
}

/**
 * Backup bucket metadata
 * 
 * @param bucketName Bucket name
 * @returns Backup URI
 */
export async function backupBucketMetadata(
  bucketName: string
): Promise<{
  backupUri: string;
}> {
  await ensureInitialized();
  
  try {
    const bucket = storageInstance!.bucket(bucketName);
    const [metadata] = await bucket.getMetadata();
    
    // Store metadata in a backup file within the bucket
    const backupFilename = `_backup/metadata_${Date.now()}.json`;
    const file = bucket.file(backupFilename);
    
    await file.save(JSON.stringify(metadata, null, 2), {
      contentType: 'application/json',
      metadata: {
        backupTime: new Date().toISOString()
      }
    });
    
    return {
      backupUri: `gs://${bucketName}/${backupFilename}`
    };
  } catch (error: any) {
    console.error(`Error backing up metadata for bucket ${bucketName}:`, error);
    throw error;
  }
}

/**
 * Ensure Storage is initialized
 */
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await initializeStorage();
  }
} 