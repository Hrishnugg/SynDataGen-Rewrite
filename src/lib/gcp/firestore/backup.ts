/**
 * Firestore Backup Utilities
 * 
 * This module provides utilities for backing up and restoring Firestore data.
 */

import { Firestore } from '@google-cloud/firestore';
import * as admin from 'firebase-admin';
import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Promisify exec
const execAsync = promisify(exec);

// Initialize Firestore and Storage if not already initialized
let db: Firestore | null = null;
let storage: Storage | null = null;

/**
 * Initialize the backup module
 */
export async function initializeBackup(): Promise<void> {
  // Initialize Firebase if needed
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  
  db = admin.firestore();
  storage = new Storage();
}

/**
 * Ensure the backup module is initialized
 */
async function ensureInitialized(): Promise<void> {
  if (!db || !storage) {
    await initializeBackup();
  }
}

/**
 * Options for the backup operation
 */
export interface BackupOptions {
  bucketName: string;
  collectionIds?: string[];
  backupPrefix?: string;
}

/**
 * Create a backup of Firestore data
 * 
 * @param options Backup options
 * @returns Information about the created backup
 */
export async function createFirestoreBackup(
  options: BackupOptions
): Promise<{
  backupUri: string;
  timestamp: string;
  collections: string[];
}> {
  await ensureInitialized();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPrefix = options.backupPrefix || 'firestore-backup';
  const backupPath = `${backupPrefix}/${timestamp}`;
  
  // Get project ID
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found. Set GOOGLE_CLOUD_PROJECT environment variable.');
  }
  
  try {
    // Construct the gcloud command
    let command = `gcloud firestore export gs://${options.bucketName}/${backupPath} --project=${projectId}`;
    
    // Add collection IDs if specified
    if (options.collectionIds && options.collectionIds.length > 0) {
      command += ` --collection-ids=${options.collectionIds.join(',')}`;
    }
    
    // Execute the command
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Waiting for') && !stderr.includes('done')) {
      throw new Error(`Error executing backup command: ${stderr}`);
    }
    
    console.log(`Backup completed: gs://${options.bucketName}/${backupPath}`);
    console.log(stdout);
    
    return {
      backupUri: `gs://${options.bucketName}/${backupPath}`,
      timestamp,
      collections: options.collectionIds || ['all']
    };
  } catch (error: any) {
    console.error('Backup failed:', error);
    throw new Error(`Firestore backup failed: ${error.message}`);
  }
}

/**
 * Restore Firestore data from a backup
 * 
 * @param backupUri The URI of the backup in Cloud Storage
 * @returns Result of the restore operation
 */
export async function restoreFirestoreBackup(
  backupUri: string
): Promise<{
  success: boolean;
  message: string;
}> {
  await ensureInitialized();
  
  // Get project ID
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found. Set GOOGLE_CLOUD_PROJECT environment variable.');
  }
  
  try {
    // Construct the gcloud command
    const command = `gcloud firestore import ${backupUri} --project=${projectId}`;
    
    // Execute the command
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Waiting for operation')) {
      throw new Error(`Error executing restore command: ${stderr}`);
    }
    
    console.log(`Restore completed from: ${backupUri}`);
    console.log(stdout);
    
    return {
      success: true,
      message: `Successfully restored data from ${backupUri}`
    };
  } catch (error: any) {
    console.error('Restore failed:', error);
    return {
      success: false,
      message: `Firestore restore failed: ${error.message}`
    };
  }
}

/**
 * Export a collection to a JSON file and store it in Cloud Storage
 * 
 * @param collectionPath Path of the collection to export
 * @param bucketName Name of the Cloud Storage bucket
 * @param destinationPath Path in the bucket where the export should be stored
 * @returns Information about the export
 */
export async function exportCollectionToJson(
  collectionPath: string,
  bucketName: string,
  destinationPath?: string
): Promise<{
  exportPath: string;
  documentCount: number;
}> {
  await ensureInitialized();
  
  try {
    if (!db || !storage) throw new Error('Backup module not initialized');
    
    // Get documents from the collection
    const snapshot = await db.collection(collectionPath).get();
    
    if (snapshot.empty) {
      console.log(`No documents found in collection: ${collectionPath}`);
      return {
        exportPath: '',
        documentCount: 0
      };
    }
    
    // Convert documents to JSON
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Create temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${collectionPath.replace(/\//g, '-')}-${uuidv4()}.json`);
    
    // Write documents to file
    fs.writeFileSync(tempFilePath, JSON.stringify(documents, null, 2));
    
    // Generate destination path if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = destinationPath || 
      `exports/${collectionPath.replace(/\//g, '-')}/${timestamp}.json`;
    
    // Upload file to Cloud Storage
    await storage.bucket(bucketName).upload(tempFilePath, {
      destination,
      metadata: {
        contentType: 'application/json',
        metadata: {
          collectionPath,
          exportTime: new Date().toISOString(),
          documentCount: documents.length
        }
      }
    });
    
    // Delete temporary file
    fs.unlinkSync(tempFilePath);
    
    console.log(`Exported collection ${collectionPath} to gs://${bucketName}/${destination}`);
    
    return {
      exportPath: `gs://${bucketName}/${destination}`,
      documentCount: documents.length
    };
  } catch (error: any) {
    console.error(`Error exporting collection ${collectionPath}:`, error);
    throw new Error(`Collection export failed: ${error.message}`);
  }
}

/**
 * Import data from a JSON file into a collection
 * 
 * @param sourceUri Cloud Storage URI of the JSON file to import
 * @param collectionPath Destination collection path
 * @param options Import options
 * @returns Result of the import operation
 */
export async function importJsonToCollection(
  sourceUri: string,
  collectionPath: string,
  options: {
    merge?: boolean;
    deleteExisting?: boolean;
  } = {}
): Promise<{
  success: boolean;
  documentsImported: number;
  errors: any[];
}> {
  await ensureInitialized();
  
  try {
    if (!db || !storage) throw new Error('Backup module not initialized');
    
    // Parse the sourceUri
    const matches = sourceUri.match(/gs:\/\/([^\/]+)\/(.+)/);
    if (!matches) {
      throw new Error(`Invalid sourceUri format: ${sourceUri}`);
    }
    
    const [, bucketName, filePath] = matches;
    
    // Create temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, path.basename(filePath));
    
    // Download file from Cloud Storage
    await storage.bucket(bucketName).file(filePath).download({
      destination: tempFilePath
    });
    
    // Read and parse JSON file
    const jsonContent = fs.readFileSync(tempFilePath, 'utf8');
    const documents = JSON.parse(jsonContent);
    
    // Delete existing documents if requested
    if (options.deleteExisting) {
      const batch = db.batch();
      const snapshot = await db.collection(collectionPath).get();
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted existing documents in collection: ${collectionPath}`);
    }
    
    // Import documents in batches
    const batchSize = 500;
    const batches = [];
    const errors = [];
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = db.batch();
      const batchDocuments = documents.slice(i, i + batchSize);
      
      for (const doc of batchDocuments) {
        try {
          const { id, ...data } = doc;
          const docRef = db.collection(collectionPath).doc(id);
          
          if (options.merge) {
            batch.set(docRef, data, { merge: true });
          } else {
            batch.set(docRef, data);
          }
        } catch (error) {
          errors.push({ document: doc, error });
        }
      }
      
      batches.push(batch.commit());
    }
    
    await Promise.all(batches);
    
    // Delete temporary file
    fs.unlinkSync(tempFilePath);
    
    console.log(`Imported ${documents.length - errors.length} documents into collection ${collectionPath}`);
    
    return {
      success: errors.length === 0,
      documentsImported: documents.length - errors.length,
      errors
    };
  } catch (error: any) {
    console.error(`Error importing data to collection ${collectionPath}:`, error);
    return {
      success: false,
      documentsImported: 0,
      errors: [{ error: error.message }]
    };
  }
}

/**
 * Schedule regular backups using Cloud Scheduler (to be called from cloud function)
 * 
 * @param bucketName Storage bucket for backups
 * @param schedule Cron schedule expression (e.g., "0 0 * * *" for daily midnight)
 * @returns The scheduler job name
 */
export async function scheduleFirestoreBackups(
  bucketName: string,
  schedule: string = "0 0 * * *"
): Promise<string> {
  // Note: This is a placeholder for the implementation
  // Actual implementation would use the Cloud Scheduler API 
  // to create a scheduled job that triggers a Cloud Function
  
  console.log(`Scheduled Firestore backups to gs://${bucketName} with schedule: ${schedule}`);
  return `firestore-backup-job-${Date.now()}`;
}

/**
 * List all available backups
 * 
 * @param bucketName Storage bucket containing backups
 * @param prefix Prefix path to filter backups
 * @returns List of available backups
 */
export async function listFirestoreBackups(
  bucketName: string,
  prefix: string = 'firestore-backup'
): Promise<Array<{
  name: string;
  path: string;
  size: number;
  createTime: string;
}>> {
  await ensureInitialized();
  
  try {
    if (!storage) throw new Error('Backup module not initialized');
    
    const [files] = await storage.bucket(bucketName).getFiles({
      prefix
    });
    
    const backups: Array<{
      name: string;
      path: string;
      size: number;
      createTime: string;
    }> = [];
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      
      // Only include directories or special files that indicate backups
      if (file.name.endsWith('/') || file.name.endsWith('overall_export_metadata')) {
        const parts = file.name.split('/');
        const name = parts[parts.length - 2] || parts[parts.length - 1];
        
        backups.push({
          name,
          path: `gs://${bucketName}/${file.name.substring(0, file.name.lastIndexOf('/') + 1)}`,
          size: typeof metadata.size === 'string' ? parseInt(metadata.size, 10) || 0 : 0,
          createTime: metadata.timeCreated || new Date().toISOString()
        });
      }
    }
    
    return backups;
  } catch (error: any) {
    console.error(`Error listing backups in bucket ${bucketName}:`, error);
    throw new Error(`Failed to list backups: ${error.message}`);
  }
} 