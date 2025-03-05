/**
 * Job Management Service
 * 
 * Service for managing data generation jobs, including creation, monitoring, and control.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  JobConfiguration, 
  JobStatus, 
  JobError, 
  RateLimitStatus,
  RetentionPolicy,
  JobCreationResponse
} from '../../models/data-generation/types';
import {
  calculateProgress,
  createDefaultStages,
  isValidTransition,
  StateTransitionErrors,
  createJobError,
  areAllStagesCompleted
} from '../../models/data-generation/job-state-machine';
import { getFirebaseFirestore } from '../../firebase';
import { logger } from '../../logger';
import { FieldValue } from 'firebase-admin/firestore';

// Default values
const DEFAULT_MAX_JOBS = 5;
const DEFAULT_COOLDOWN_PERIOD = 45; // seconds
const DEFAULT_RETENTION_DAYS = 180; // 6 months

/**
 * Job Management Service Interface
 */
export interface JobManagementService {
  // Core Job Operations
  createJob(customerId: string, projectId: string, config: JobConfiguration): Promise<JobCreationResponse>;
  getJobStatus(jobId: string): Promise<JobStatus>;
  updateJobStatus(jobId: string, newStatus: JobStatus['status'], error?: JobError): Promise<JobStatus>;
  cancelJob(jobId: string, userId: string): Promise<boolean>;
  resumeJob(jobId: string, userId: string): Promise<boolean>;
  
  // Job Monitoring
  subscribeToJobUpdates(jobId: string, callback: (status: JobStatus) => void): () => void;
  getJobHistory(customerId: string, options?: {
    limit?: number;
    offset?: number;
    status?: JobStatus['status'];
    startDate?: Date;
    endDate?: Date;
  }): Promise<JobStatus[]>;
  
  // Rate Limiting
  checkRateLimit(customerId: string): Promise<boolean>;
  getRateLimitStatus(customerId: string): Promise<RateLimitStatus>;
  updateCooldownStatus(jobId: string, customerId: string): Promise<void>;
  
  // Data Retention
  cleanupExpiredJobs(): Promise<number>;
  setJobRetentionPolicy(customerId: string, retentionDays: number): Promise<boolean>;
  getJobRetentionPolicy(customerId: string): Promise<number>;
}

/**
 * Firestore-based Job Management Service implementation
 */
export class FirestoreJobManagementService implements JobManagementService {
  private readonly jobsCollection = 'data_generation_jobs';
  private readonly rateLimitsCollection = 'data_generation_rate_limits';
  private readonly retentionPoliciesCollection = 'data_generation_retention_policies';
  private readonly subscriptions: Map<string, any> = new Map();
  
  /**
   * Create a new data generation job
   */
  async createJob(customerId: string, projectId: string, config: JobConfiguration): Promise<JobCreationResponse> {
    try {
      // Check rate limits first
      const canCreateJob = await this.checkRateLimit(customerId);
      if (!canCreateJob) {
        return {
          jobId: '',
          status: 'rejected',
          message: 'Rate limit exceeded. Please try again later or wait for existing jobs to complete.'
        };
      }
      
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Generate a unique job ID
      const jobId = uuidv4();
      
      // Create default job stages based on job type
      const stages = createDefaultStages(config.dataType);
      
      // Calculate expiration date (default: 6 months from now)
      const retentionDays = await this.getJobRetentionPolicy(customerId);
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + retentionDays);
      
      // Create the initial job status
      const now = new Date();
      const jobStatus: JobStatus = {
        jobId,
        customerId,
        projectId,
        status: 'queued',
        progress: 0,
        startTime: now,
        lastUpdated: now,
        stages,
        metadata: {
          inputSize: 0, // Will be updated later
          retryCount: 0,
          expirationDate
        },
        configuration: config
      };
      
      // Store in Firestore
      await db.collection(this.jobsCollection).doc(jobId).set(this.convertDatesToTimestamps(jobStatus));
      
      // Update rate limit status
      const rateLimitRef = db.collection(this.rateLimitsCollection).doc(customerId);
      const rateLimitDoc = await rateLimitRef.get();
      
      if (rateLimitDoc.exists) {
        await rateLimitRef.update({
          currentJobs: FieldValue.increment(1),
          lastUpdated: new Date()
        });
      } else {
        // Create initial rate limit document
        await rateLimitRef.set({
          customerId,
          currentJobs: 1,
          maxJobs: DEFAULT_MAX_JOBS,
          cooldownPeriod: DEFAULT_COOLDOWN_PERIOD,
          cooldownJobs: [],
          lastUpdated: new Date()
        });
      }
      
      logger.info(`Created data generation job ${jobId} for customer ${customerId}`, {
        jobId,
        customerId,
        projectId,
        dataType: config.dataType
      });
      
      return {
        jobId,
        status: 'accepted',
        message: 'Job created successfully and added to the queue'
      };
    } catch (error) {
      logger.error('Error creating data generation job', error);
      
      return {
        jobId: '',
        status: 'rejected',
        message: `Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Get the current status of a job
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      const jobDoc = await db.collection(this.jobsCollection).doc(jobId).get();
      
      if (!jobDoc.exists) {
        throw createJobError(
          StateTransitionErrors.JOB_NOT_FOUND,
          `Job with ID ${jobId} not found`
        );
      }
      
      return this.convertTimestampsToDates(jobDoc.data() as JobStatus);
    } catch (error) {
      logger.error(`Error getting job status for job ${jobId}`, error);
      throw error;
    }
  }
  
  /**
   * Update the status of a job
   */
  async updateJobStatus(jobId: string, newStatus: JobStatus['status'], error?: JobError): Promise<JobStatus> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Get current job status
      const currentJob = await this.getJobStatus(jobId);
      
      // Check if the state transition is valid
      if (!isValidTransition(currentJob.status, newStatus)) {
        throw createJobError(
          StateTransitionErrors.INVALID_TRANSITION,
          `Invalid state transition from ${currentJob.status} to ${newStatus}`
        );
      }
      
      // Update job status with the new state
      const now = new Date();
      const updatedJob: JobStatus = {
        ...currentJob,
        status: newStatus,
        lastUpdated: now,
        error: error || currentJob.error,
      };
      
      // Update specific fields based on the new status
      if (newStatus === 'completed') {
        updatedJob.endTime = now;
        updatedJob.progress = 100;
      } else if (newStatus === 'failed') {
        updatedJob.endTime = now;
      } else if (newStatus === 'running' && !currentJob.startTime) {
        updatedJob.startTime = now;
      }
      
      // If all stages are completed but the job status isn't 'completed', update it
      if (areAllStagesCompleted(currentJob.stages) && newStatus !== 'completed') {
        updatedJob.status = 'completed';
        updatedJob.endTime = now;
        updatedJob.progress = 100;
      }
      
      // Recalculate progress based on stages
      if (newStatus !== 'completed') {
        updatedJob.progress = calculateProgress(updatedJob.stages);
      }
      
      // Update in Firestore
      await db.collection(this.jobsCollection).doc(jobId).update(this.convertDatesToTimestamps(updatedJob));
      
      // If job status is terminal (completed, failed, cancelled), update rate limit
      if (['completed', 'failed', 'cancelled'].includes(newStatus)) {
        await this.updateRateLimitOnJobCompletion(currentJob.customerId);
        
        // If cancelled, add to cooldown
        if (newStatus === 'cancelled') {
          await this.updateCooldownStatus(jobId, currentJob.customerId);
        }
      }
      
      logger.info(`Updated job ${jobId} status to ${newStatus}`, {
        jobId,
        previousStatus: currentJob.status,
        newStatus,
        customerId: currentJob.customerId
      });
      
      return updatedJob;
    } catch (error) {
      logger.error(`Error updating job status for job ${jobId}`, error);
      throw error;
    }
  }
  
  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    try {
      const job = await this.getJobStatus(jobId);
      
      // Can only cancel jobs that are queued, running, or paused
      if (!['queued', 'running', 'paused'].includes(job.status)) {
        throw createJobError(
          StateTransitionErrors.INVALID_TRANSITION,
          `Cannot cancel job in ${job.status} state`
        );
      }
      
      // Update job status to cancelled
      await this.updateJobStatus(jobId, 'cancelled');
      
      logger.info(`Job ${jobId} cancelled by user ${userId}`, {
        jobId,
        userId,
        customerId: job.customerId
      });
      
      return true;
    } catch (error) {
      logger.error(`Error cancelling job ${jobId}`, error);
      return false;
    }
  }
  
  /**
   * Resume a job
   */
  async resumeJob(jobId: string, userId: string): Promise<boolean> {
    try {
      const job = await this.getJobStatus(jobId);
      
      // Can only resume jobs that are paused, failed, or cancelled
      if (!['paused', 'failed', 'cancelled'].includes(job.status)) {
        throw createJobError(
          StateTransitionErrors.INVALID_TRANSITION,
          `Cannot resume job in ${job.status} state`
        );
      }
      
      // Check if the job is in cooldown period
      if (job.status === 'cancelled') {
        const rateLimitStatus = await this.getRateLimitStatus(job.customerId);
        const cooldownJob = rateLimitStatus.cooldownJobs?.find(cj => cj.jobId === jobId);
        
        if (cooldownJob && cooldownJob.cooldownUntil > new Date()) {
          throw createJobError(
            StateTransitionErrors.COOLDOWN_PERIOD,
            `Job is in cooldown period until ${cooldownJob.cooldownUntil.toISOString()}`
          );
        }
      }
      
      // Check rate limit before resuming
      const canCreateJob = await this.checkRateLimit(job.customerId);
      if (!canCreateJob) {
        throw createJobError(
          StateTransitionErrors.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded. Please try again later or wait for existing jobs to complete.'
        );
      }
      
      // Update job status to queued (to restart the job)
      await this.updateJobStatus(jobId, 'queued');
      
      // Update metadata to track retry
      const db = getFirebaseFirestore();
      await db.collection(this.jobsCollection).doc(jobId).update({
        'metadata.retryCount': FieldValue.increment(1)
      });
      
      logger.info(`Job ${jobId} resumed by user ${userId}`, {
        jobId,
        userId,
        customerId: job.customerId
      });
      
      return true;
    } catch (error) {
      logger.error(`Error resuming job ${jobId}`, error);
      return false;
    }
  }
  
  /**
   * Subscribe to job status updates
   */
  subscribeToJobUpdates(jobId: string, callback: (status: JobStatus) => void): () => void {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Create a subscription to the job document
      const unsubscribe = db.collection(this.jobsCollection).doc(jobId)
        .onSnapshot(snapshot => {
          if (snapshot.exists) {
            const jobStatus = this.convertTimestampsToDates(snapshot.data() as JobStatus);
            callback(jobStatus);
          }
        }, error => {
          logger.error(`Error in job status subscription for job ${jobId}`, error);
        });
      
      // Store the unsubscribe function
      this.subscriptions.set(jobId, unsubscribe);
      
      // Return a function to cancel the subscription
      return () => {
        const unsub = this.subscriptions.get(jobId);
        if (unsub) {
          unsub();
          this.subscriptions.delete(jobId);
        }
      };
    } catch (error) {
      logger.error(`Error setting up job status subscription for job ${jobId}`, error);
      return () => {}; // Return no-op function in case of error
    }
  }
  
  /**
   * Get job history for a customer
   */
  async getJobHistory(customerId: string, options: {
    limit?: number;
    offset?: number;
    status?: JobStatus['status'];
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<JobStatus[]> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      const {
        limit = 10,
        offset = 0,
        status,
        startDate,
        endDate
      } = options;
      
      // Build query
      let query = db.collection(this.jobsCollection)
        .where('customerId', '==', customerId)
        .orderBy('lastUpdated', 'desc');
      
      // Add filters if specified
      if (status) {
        query = query.where('status', '==', status);
      }
      
      if (startDate) {
        query = query.where('startTime', '>=', startDate);
      }
      
      if (endDate) {
        query = query.where('startTime', '<=', endDate);
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
      
      // Execute query
      const querySnapshot = await query.get();
      
      // Convert results
      const jobs: JobStatus[] = [];
      querySnapshot.forEach(doc => {
        jobs.push(this.convertTimestampsToDates(doc.data() as JobStatus));
      });
      
      return jobs;
    } catch (error) {
      logger.error(`Error getting job history for customer ${customerId}`, error);
      throw error;
    }
  }
  
  /**
   * Check if a customer has reached their rate limit
   */
  async checkRateLimit(customerId: string): Promise<boolean> {
    try {
      const rateLimitStatus = await this.getRateLimitStatus(customerId);
      return rateLimitStatus.currentJobs < rateLimitStatus.maxJobs;
    } catch (error) {
      logger.error(`Error checking rate limit for customer ${customerId}`, error);
      // In case of error, default to allowing the job
      return true;
    }
  }
  
  /**
   * Get rate limit status for a customer
   */
  async getRateLimitStatus(customerId: string): Promise<RateLimitStatus> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      const rateLimitDoc = await db.collection(this.rateLimitsCollection).doc(customerId).get();
      
      if (!rateLimitDoc.exists) {
        // If no document exists, create default rate limit status
        const defaultStatus: RateLimitStatus = {
          customerId,
          currentJobs: 0,
          maxJobs: DEFAULT_MAX_JOBS,
          cooldownPeriod: DEFAULT_COOLDOWN_PERIOD,
          cooldownJobs: []
        };
        
        await db.collection(this.rateLimitsCollection).doc(customerId).set(defaultStatus);
        return defaultStatus;
      }
      
      // Clean up expired cooldown jobs
      const data = rateLimitDoc.data() as RateLimitStatus;
      const now = new Date();
      
      // Filter out expired cooldown jobs
      if (data.cooldownJobs && data.cooldownJobs.length > 0) {
        const validCooldownJobs = data.cooldownJobs.filter(job => 
          new Date(job.cooldownUntil) > now
        );
        
        // If there are expired cooldown jobs, update the document
        if (validCooldownJobs.length !== data.cooldownJobs.length) {
          await db.collection(this.rateLimitsCollection).doc(customerId).update({
            cooldownJobs: validCooldownJobs
          });
          
          data.cooldownJobs = validCooldownJobs;
        }
      }
      
      return this.convertTimestampsToDates(data);
    } catch (error) {
      logger.error(`Error getting rate limit status for customer ${customerId}`, error);
      
      // Return default rate limit status in case of error
      return {
        customerId,
        currentJobs: 0,
        maxJobs: DEFAULT_MAX_JOBS,
        cooldownPeriod: DEFAULT_COOLDOWN_PERIOD,
        cooldownJobs: []
      };
    }
  }
  
  /**
   * Update cooldown status for a cancelled job
   */
  async updateCooldownStatus(jobId: string, customerId: string): Promise<void> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Get current rate limit status
      const rateLimitStatus = await this.getRateLimitStatus(customerId);
      
      // Calculate cooldown end time
      const cooldownUntil = new Date();
      cooldownUntil.setSeconds(cooldownUntil.getSeconds() + rateLimitStatus.cooldownPeriod);
      
      // Add job to cooldown list
      const cooldownJobs = rateLimitStatus.cooldownJobs || [];
      cooldownJobs.push({
        jobId,
        cooldownUntil
      });
      
      // Update in Firestore
      await db.collection(this.rateLimitsCollection).doc(customerId).update({
        cooldownJobs: this.convertDatesToTimestamps(cooldownJobs)
      });
      
      logger.info(`Added job ${jobId} to cooldown until ${cooldownUntil.toISOString()}`, {
        jobId,
        customerId,
        cooldownUntil
      });
    } catch (error) {
      logger.error(`Error updating cooldown status for job ${jobId}`, error);
    }
  }
  
  /**
   * Update rate limit when a job completes
   */
  private async updateRateLimitOnJobCompletion(customerId: string): Promise<void> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Decrement current jobs count
      await db.collection(this.rateLimitsCollection).doc(customerId).update({
        currentJobs: FieldValue.increment(-1),
        lastUpdated: new Date()
      });
    } catch (error) {
      logger.error(`Error updating rate limit on job completion for customer ${customerId}`, error);
    }
  }
  
  /**
   * Clean up expired jobs
   */
  async cleanupExpiredJobs(): Promise<number> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      const now = new Date();
      
      // Query for expired jobs
      const querySnapshot = await db.collection(this.jobsCollection)
        .where('metadata.expirationDate', '<=', now)
        .limit(100) // Process in batches for safety
        .get();
      
      if (querySnapshot.empty) {
        return 0;
      }
      
      // Delete expired jobs
      const batch = db.batch();
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      const count = querySnapshot.size;
      logger.info(`Cleaned up ${count} expired jobs`);
      
      return count;
    } catch (error) {
      logger.error('Error cleaning up expired jobs', error);
      return 0;
    }
  }
  
  /**
   * Set retention policy for a customer
   */
  async setJobRetentionPolicy(customerId: string, retentionDays: number): Promise<boolean> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Ensure retention days is valid
      if (retentionDays < 1) {
        throw new Error('Retention days must be at least 1');
      }
      
      // Update or create retention policy
      await db.collection(this.retentionPoliciesCollection).doc(customerId).set({
        customerId,
        retentionDays,
        lastUpdated: new Date()
      });
      
      logger.info(`Set retention policy for customer ${customerId} to ${retentionDays} days`);
      
      return true;
    } catch (error) {
      logger.error(`Error setting retention policy for customer ${customerId}`, error);
      return false;
    }
  }
  
  /**
   * Get retention policy for a customer
   */
  async getJobRetentionPolicy(customerId: string): Promise<number> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      const policyDoc = await db.collection(this.retentionPoliciesCollection).doc(customerId).get();
      
      if (!policyDoc.exists) {
        // Return default retention period
        return DEFAULT_RETENTION_DAYS;
      }
      
      const policy = policyDoc.data() as RetentionPolicy;
      return policy.retentionDays;
    } catch (error) {
      logger.error(`Error getting retention policy for customer ${customerId}`, error);
      return DEFAULT_RETENTION_DAYS;
    }
  }
  
  /**
   * Helper function to convert Dates to Firestore Timestamps
   */
  private convertDatesToTimestamps(data: any): any {
    if (data === null || data === undefined || typeof data !== 'object') {
      return data;
    }
    
    if (data instanceof Date) {
      // This is a bit of a hack since we're not importing firebase directly
      // In a real implementation, you'd use firebase.firestore.Timestamp.fromDate(data)
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.convertDatesToTimestamps(item));
    }
    
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = this.convertDatesToTimestamps(data[key]);
      }
    }
    
    return result;
  }
  
  /**
   * Helper function to convert Firestore Timestamps to Dates
   */
  private convertTimestampsToDates(data: any): any {
    if (data === null || data === undefined || typeof data !== 'object') {
      return data;
    }
    
    // Check if the object is a Firestore Timestamp
    if (data.toDate && typeof data.toDate === 'function') {
      return data.toDate();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.convertTimestampsToDates(item));
    }
    
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = this.convertTimestampsToDates(data[key]);
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const jobManagementService = new FirestoreJobManagementService(); 