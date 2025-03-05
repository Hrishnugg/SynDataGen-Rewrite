/**
 * Webhook Service
 * 
 * Service for managing webhooks for data generation pipeline events.
 * This service handles sending and receiving webhook events.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { 
  WebhookConfig, 
  WebhookPayload,
  JobStatus 
} from '../../models/data-generation/types';
import { getFirebaseFirestore } from '../../firebase';
import { logger } from '../../logger';
import { jobManagementService } from './job-management-service';

/**
 * Webhook Service Interface
 */
export interface WebhookService {
  // Webhook Registration
  registerWebhook(config: WebhookConfig): Promise<string>;
  updateWebhook(webhookId: string, config: Partial<WebhookConfig>): Promise<boolean>;
  deleteWebhook(webhookId: string): Promise<boolean>;
  getWebhooks(filter?: { url?: string, event?: string }): Promise<WebhookConfig[]>;
  
  // Webhook Sending
  sendWebhookEvent(event: string, jobId: string, jobStatus: JobStatus): Promise<boolean>;
  
  // Webhook Verification
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
}

/**
 * Firestore-based Webhook Service implementation
 */
export class FirestoreWebhookService implements WebhookService {
  private readonly webhooksCollection = 'data_generation_webhooks';
  private readonly webhookDeliveryCollection = 'data_generation_webhook_deliveries';
  private readonly maxRetries = 3;
  
  /**
   * Register a new webhook
   */
  async registerWebhook(config: WebhookConfig): Promise<string> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Validate URL
      try {
        new URL(config.url);
      } catch (e) {
        throw new Error('Invalid webhook URL');
      }
      
      // Validate events
      if (!config.events || config.events.length === 0) {
        throw new Error('At least one event type must be specified');
      }
      
      const validEvents = ['job.created', 'job.updated', 'job.completed', 'job.failed'];
      const invalidEvents = config.events.filter(event => !validEvents.includes(event));
      
      if (invalidEvents.length > 0) {
        throw new Error(`Invalid event types: ${invalidEvents.join(', ')}`);
      }
      
      // Create webhook document
      const webhookRef = db.collection(this.webhooksCollection).doc();
      const webhookData = {
        ...config,
        id: webhookRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true
      };
      
      await webhookRef.set(webhookData);
      
      logger.info(`Registered webhook for URL ${config.url}`, {
        webhookId: webhookRef.id,
        events: config.events
      });
      
      return webhookRef.id;
    } catch (error) {
      logger.error('Error registering webhook', error);
      throw error;
    }
  }
  
  /**
   * Update an existing webhook
   */
  async updateWebhook(webhookId: string, config: Partial<WebhookConfig>): Promise<boolean> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Validate URL if provided
      if (config.url) {
        try {
          new URL(config.url);
        } catch (e) {
          throw new Error('Invalid webhook URL');
        }
      }
      
      // Validate events if provided
      if (config.events && config.events.length > 0) {
        const validEvents = ['job.created', 'job.updated', 'job.completed', 'job.failed'];
        const invalidEvents = config.events.filter(event => !validEvents.includes(event));
        
        if (invalidEvents.length > 0) {
          throw new Error(`Invalid event types: ${invalidEvents.join(', ')}`);
        }
      }
      
      // Check if webhook exists
      const webhookRef = db.collection(this.webhooksCollection).doc(webhookId);
      const webhookDoc = await webhookRef.get();
      
      if (!webhookDoc.exists) {
        throw new Error(`Webhook with ID ${webhookId} not found`);
      }
      
      // Update webhook
      const updateData = {
        ...config,
        updatedAt: new Date()
      };
      
      await webhookRef.update(updateData);
      
      logger.info(`Updated webhook ${webhookId}`, {
        webhookId,
        updates: Object.keys(config)
      });
      
      return true;
    } catch (error) {
      logger.error(`Error updating webhook ${webhookId}`, error);
      return false;
    }
  }
  
  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Check if webhook exists
      const webhookRef = db.collection(this.webhooksCollection).doc(webhookId);
      const webhookDoc = await webhookRef.get();
      
      if (!webhookDoc.exists) {
        logger.warn(`Webhook with ID ${webhookId} not found for deletion`);
        return false;
      }
      
      // Delete webhook
      await webhookRef.delete();
      
      logger.info(`Deleted webhook ${webhookId}`);
      
      return true;
    } catch (error) {
      logger.error(`Error deleting webhook ${webhookId}`, error);
      return false;
    }
  }
  
  /**
   * Get webhooks with optional filtering
   */
  async getWebhooks(filter?: { url?: string, event?: string }): Promise<WebhookConfig[]> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Build query
      let query = db.collection(this.webhooksCollection).where('active', '==', true);
      
      // Execute query
      const querySnapshot = await query.get();
      
      // Convert results
      let webhooks: WebhookConfig[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        webhooks.push({
          url: data.url,
          secret: data.secret,
          events: data.events
        });
      });
      
      // Apply filters
      if (filter) {
        if (filter.url) {
          webhooks = webhooks.filter(webhook => webhook.url === filter.url);
        }
        
        if (filter.event) {
          webhooks = webhooks.filter(webhook => webhook.events.includes(filter.event as any));
        }
      }
      
      return webhooks;
    } catch (error) {
      logger.error('Error getting webhooks', error);
      return [];
    }
  }
  
  /**
   * Send a webhook event
   */
  async sendWebhookEvent(event: string, jobId: string, jobStatus: JobStatus): Promise<boolean> {
    try {
      // Get webhooks that are subscribed to this event
      const webhooks = await this.getWebhooks({ event });
      
      if (webhooks.length === 0) {
        logger.debug(`No webhooks registered for event ${event}`);
        return true;
      }
      
      logger.info(`Sending ${event} webhook for job ${jobId} to ${webhooks.length} endpoints`);
      
      // Send event to each webhook
      const results = await Promise.all(
        webhooks.map(webhook => this.deliverWebhook(webhook, event, jobId, jobStatus))
      );
      
      // Check if all deliveries were successful
      const allSuccessful = results.every(result => result);
      
      return allSuccessful;
    } catch (error) {
      logger.error(`Error sending webhook event ${event} for job ${jobId}`, error);
      return false;
    }
  }
  
  /**
   * Deliver a webhook to a specific endpoint
   */
  private async deliverWebhook(
    webhook: WebhookConfig,
    event: string,
    jobId: string,
    jobStatus: JobStatus
  ): Promise<boolean> {
    try {
      const db = getFirebaseFirestore();
      if (!db) {
        throw new Error('Firestore is not initialized');
      }
      
      // Create delivery record
      const deliveryRef = db.collection(this.webhookDeliveryCollection).doc();
      const deliveryId = deliveryRef.id;
      
      // Create payload
      const timestamp = new Date().toISOString();
      const payloadData = {
        event,
        jobId,
        timestamp,
        data: jobStatus
      };
      
      // Stringify payload for signature
      const payloadString = JSON.stringify(payloadData);
      
      // Generate signature
      const signature = this.generateSignature(payloadString, webhook.secret);
      
      // Complete payload with signature
      const payload: WebhookPayload = {
        ...payloadData,
        signature
      };
      
      // Record delivery attempt
      await deliveryRef.set({
        id: deliveryId,
        webhookUrl: webhook.url,
        event,
        jobId,
        payload,
        status: 'pending',
        attempts: 0,
        maxAttempts: this.maxRetries,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Attempt to deliver (would be delivered asynchronously in production)
      // This is a placeholder for actual delivery logic
      
      logger.info(`Webhook delivery recorded with ID ${deliveryId}`, {
        event,
        jobId,
        url: webhook.url
      });
      
      // For now, simulate successful delivery
      await deliveryRef.update({
        status: 'delivered',
        attempts: 1,
        lastAttemptAt: new Date(),
        deliveredAt: new Date(),
        updatedAt: new Date(),
        responseCode: 200,
        responseBody: 'OK'
      });
      
      return true;
    } catch (error) {
      logger.error(`Error delivering webhook for job ${jobId}`, error);
      return false;
    }
  }
  
  /**
   * Generate a signature for a webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }
  
  /**
   * Verify a webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, secret);
      
      // Use timing-safe comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      return signatureBuffer.length === expectedBuffer.length &&
        timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      logger.error('Error verifying webhook signature', error);
      return false;
    }
  }
  
  /**
   * Process incoming webhook
   * This would be called by an API endpoint receiving webhooks
   */
  async processIncomingWebhook(payload: string, signature: string): Promise<boolean> {
    try {
      // Parse payload
      const data = JSON.parse(payload) as WebhookPayload;
      
      // Find webhook config by URL (in a real implementation, this might use a different lookup method)
      const webhooks = await this.getWebhooks();
      
      // Find the webhook with matching URL and events
      const webhook = webhooks.find(w => w.events.includes(data.event as any));
      
      if (!webhook) {
        logger.warn(`No webhook configuration found for event ${data.event}`);
        return false;
      }
      
      // Verify signature
      if (!this.verifyWebhookSignature(payload, signature, webhook.secret)) {
        logger.warn(`Invalid webhook signature for event ${data.event}`);
        return false;
      }
      
      // Process the webhook event
      logger.info(`Processing incoming webhook for event ${data.event}`, {
        jobId: data.jobId,
        timestamp: data.timestamp
      });
      
      // Update job status based on webhook data
      if (data.data) {
        await jobManagementService.updateJobStatus(data.jobId, data.data.status);
      }
      
      return true;
    } catch (error) {
      logger.error('Error processing incoming webhook', error);
      return false;
    }
  }
}

// Export singleton instance
export const webhookService = new FirestoreWebhookService(); 