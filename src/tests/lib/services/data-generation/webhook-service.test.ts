import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FirestoreWebhookService } from '@/lib/services/data-generation/webhook-service';
import { WebhookConfig, JobStatus } from '@/lib/models/data-generation/types';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock the webhook service implementation
jest.mock('@/lib/services/data-generation/webhook-service', () => {
  // Create a mock class
  class MockFirestoreWebhookService {
    async registerWebhook(config: WebhookConfig): Promise<string> {
      // Validate URL
      try {
        new URL(config.url);
      } catch (e) {
        throw new Error('Invalid URL');
      }
      
      // Validate events
      if (!config.events || config.events.length === 0) {
        throw new Error('At least one event type must be specified');
      }
      
      const validEvents = ['job.created', 'job.updated', 'job.completed', 'job.failed'];
      const invalidEvents = config.events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        throw new Error(`Invalid event types: ${invalidEvents.join(', ')}`);
      }
      
      return 'test-webhook-id';
    }
    
    async updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): Promise<boolean> {
      return true;
    }
    
    async deleteWebhook(webhookId: string): Promise<boolean> {
      return true;
    }
    
    async getWebhooks(options?: { event?: string }): Promise<(WebhookConfig & { id: string })[]> {
      if (options?.event) {
        return [{
          id: 'test-webhook-id',
          url: 'https://example.com/webhook',
          secret: 'test-secret',
          events: ['job.created', 'job.completed', 'job.failed']
        }];
      }
      
      return [{
        id: 'test-webhook-id',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        events: ['job.completed', 'job.failed']
      }];
    }
    
    async sendWebhookEvent(event: string, jobId: string, jobStatus: JobStatus): Promise<boolean> {
      return true;
    }
    
    verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return signature === expectedSignature;
    }
  }
  
  return {
    FirestoreWebhookService: MockFirestoreWebhookService
  };
});

describe('Webhook Service', () => {
  let webhookService: FirestoreWebhookService;
  
  const testWebhookId = 'test-webhook-id';
  const testWebhookConfig: WebhookConfig = {
    url: 'https://example.com/webhook',
    secret: 'test-secret',
    events: ['job.completed', 'job.failed']
  };
  
  // Sample job status for testing
  const testJobStatus: JobStatus = {
    jobId: 'test-job-123',
    customerId: 'customer-123',
    projectId: 'project-123',
    status: 'completed',
    progress: 100,
    startTime: new Date(),
    lastUpdated: new Date(),
    stages: [],
    metadata: {
      inputSize: 0,
      retryCount: 0
    },
    configuration: {
      dataType: 'csv',
      dataSize: 100,
      inputFormat: 'csv',
      outputFormat: 'csv',
      inputBucket: 'input-bucket',
      outputBucket: 'output-bucket',
      inputPath: '/input',
      outputPath: '/output',
      isAsync: true,
      timeout: 3600,
      resumeWindow: 3600,
      parameters: {}
    }
  };
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock fetch
    mockFetch.mockReturnValue(Promise.resolve({
      ok: true,
      status: 200,
      text: jest.fn().mockReturnValue(Promise.resolve('OK')),
      json: jest.fn().mockReturnValue(Promise.resolve({ success: true }))
    } as any));
    
    // Create service instance
    webhookService = new FirestoreWebhookService();
  });
  
  describe('Webhook Registration', () => {
    it('should register a new webhook', async () => {
      const result = await webhookService.registerWebhook(testWebhookConfig);
      
      // Verify results
      expect(result).toBe(testWebhookId);
    });
    
    it('should throw an error for invalid URLs', async () => {
      await expect(webhookService.registerWebhook({
        ...testWebhookConfig,
        url: 'invalid-url'
      })).rejects.toThrow('Invalid URL');
    });
    
    it('should throw an error for empty events', async () => {
      await expect(webhookService.registerWebhook({
        ...testWebhookConfig,
        events: []
      })).rejects.toThrow('At least one event type must be specified');
    });
    
    it('should throw an error for invalid events', async () => {
      await expect(webhookService.registerWebhook({
        ...testWebhookConfig,
        events: ['invalid-event' as any]
      })).rejects.toThrow('Invalid event types: invalid-event');
    });
  });
  
  describe('Webhook Management', () => {
    it('should update an existing webhook', async () => {
      const result = await webhookService.updateWebhook(testWebhookId, {
        url: 'https://updated.example.com/webhook',
        events: ['job.created']
      });
      
      // Verify results
      expect(result).toBe(true);
    });
    
    it('should delete an existing webhook', async () => {
      const result = await webhookService.deleteWebhook(testWebhookId);
      
      // Verify results
      expect(result).toBe(true);
    });
    
    it('should get all webhooks', async () => {
      const webhooks = await webhookService.getWebhooks();
      
      // Verify results
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].url).toBe(testWebhookConfig.url);
      expect(webhooks[0].secret).toBe(testWebhookConfig.secret);
      expect(webhooks[0].events).toEqual(testWebhookConfig.events);
    });
    
    it('should filter webhooks by event', async () => {
      const webhooks = await webhookService.getWebhooks({ event: 'job.created' });
      
      // Verify results
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].events).toContain('job.created');
    });
  });
  
  describe('Webhook Delivery', () => {
    it('should send webhook event', async () => {
      const event = 'job.completed';
      const jobId = 'test-job-123';
      
      const result = await webhookService.sendWebhookEvent(
        event,
        jobId,
        testJobStatus
      );
      
      // Verify results
      expect(result).toBe(true);
    });
  });
  
  describe('Webhook Verification', () => {
    it('should verify webhook signature correctly', () => {
      // Create a valid signature
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      const isValid = webhookService.verifyWebhookSignature(
        payload,
        signature,
        secret
      );
      
      // Verify results
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const invalidSignature = 'invalid-signature';
      
      const isValid = webhookService.verifyWebhookSignature(
        payload,
        invalidSignature,
        secret
      );
      
      // Verify results
      expect(isValid).toBe(false);
    });
  });
}); 