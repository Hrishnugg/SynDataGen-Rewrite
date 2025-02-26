/**
 * Migration Utilities
 * 
 * Utility functions for the migration process, including database connections,
 * progress reporting, and error handling.
 */

import { MongoClient, Db } from 'mongodb';
import { Firestore } from '@google-cloud/firestore';
import admin from 'firebase-admin';
import { mongoConfig, firestoreConfig, migrationConfig } from './config';

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let firestoreDb: Firestore | null = null;

/**
 * Initialize MongoDB connection
 * @returns MongoDB database instance
 */
export async function connectToMongoDB(): Promise<Db> {
  if (mongoDb) return mongoDb;
  
  try {
    console.log('Connecting to MongoDB...');
    mongoClient = await MongoClient.connect(mongoConfig.uri);
    mongoDb = mongoClient.db(mongoConfig.dbName);
    console.log('Connected to MongoDB successfully');
    return mongoDb;
  } catch (error: any) {
    console.error('Failed to connect to MongoDB:', error.message);
    throw new Error(`MongoDB connection failed: ${error.message}`);
  }
}

/**
 * Initialize Firestore connection
 * @returns Firestore database instance
 */
export function connectToFirestore(): Firestore {
  if (firestoreDb) return firestoreDb;
  
  try {
    console.log('Initializing Firestore...');
    
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firestoreConfig.projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        projectId: firestoreConfig.projectId,
      });
    }
    
    firestoreDb = admin.firestore();
    console.log('Connected to Firestore successfully');
    return firestoreDb;
  } catch (error: any) {
    console.error('Failed to connect to Firestore:', error.message);
    throw new Error(`Firestore connection failed: ${error.message}`);
  }
}

/**
 * Close database connections
 */
export async function closeConnections(): Promise<void> {
  if (mongoClient) {
    console.log('Closing MongoDB connection...');
    await mongoClient.close();
    mongoClient = null;
    mongoDb = null;
  }
  
  // Firestore connection is managed by Firebase Admin, so we don't need to close it
}

/**
 * Progress tracker for batch operations
 */
export class ProgressTracker {
  private total: number;
  private processed: number;
  private startTime: number;
  private label: string;
  private printInterval: number;
  private lastPrintTime: number;
  
  constructor(total: number, label: string = 'items', printInterval: number = 1000) {
    this.total = total;
    this.processed = 0;
    this.startTime = Date.now();
    this.label = label;
    this.printInterval = printInterval;
    this.lastPrintTime = this.startTime;
    
    console.log(`Starting migration of ${this.total} ${this.label}...`);
  }
  
  /**
   * Update progress counter
   * @param count Number of items processed in this batch
   */
  update(count: number): void {
    this.processed += count;
    const now = Date.now();
    
    // Only print progress at certain intervals to avoid console flooding
    if (now - this.lastPrintTime >= this.printInterval) {
      this.printProgress();
      this.lastPrintTime = now;
    }
  }
  
  /**
   * Print current progress
   */
  printProgress(): void {
    const percent = Math.round((this.processed / this.total) * 100);
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.processed / elapsed;
    const remaining = this.total - this.processed;
    const estimatedTimeRemaining = remaining / rate;
    
    console.log(
      `Progress: ${this.processed}/${this.total} ${this.label} (${percent}%) - ` +
      `Rate: ${rate.toFixed(2)}/sec - ` +
      `Elapsed: ${formatTime(elapsed)} - ` +
      `ETA: ${formatTime(estimatedTimeRemaining)}`
    );
  }
  
  /**
   * Mark the operation as complete
   */
  complete(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const rate = this.processed / elapsed;
    
    console.log(
      `Completed migration of ${this.processed} ${this.label} ` +
      `in ${formatTime(elapsed)} (${rate.toFixed(2)}/sec)`
    );
  }
}

/**
 * Format time in seconds to a human-readable string
 * @param seconds Time in seconds
 * @returns Formatted time string (e.g., "2h 30m 15s")
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${secs}s`;
  
  return result;
}

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a log identifier for an object
 * @param obj Object to identify
 * @returns String identifier
 */
export function getLogIdentifier(obj: any): string {
  if (!obj) return 'null';
  if (obj._id) return obj._id.toString();
  if (obj.id) return obj.id.toString();
  if (obj.email) return obj.email;
  return JSON.stringify(obj).substring(0, 50);
}

/**
 * Create batches from an array
 * @param array Array to split into batches
 * @param size Size of each batch
 * @returns Array of batches
 */
export function createBatches<T>(array: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
} 