/**
 * Data Generation Webhooks API
 * 
 * API endpoints for managing webhooks for data generation events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { webhookService } from '@/features/data-generation/services/webhook-service';
import { logger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/firebase/auth';

// Schema for webhook registration
const webhookConfigSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(16).max(128),
  events: z.array(
    z.enum(['job.created', 'job.updated', 'job.completed', 'job.failed'])
  ).min(1),
});

/**
 * POST /api/data-generation/webhooks
 * Register a new webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = webhookConfigSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Register webhook
    const webhookId = await webhookService.registerWebhook(validationResult.data);
    
    return NextResponse.json({ webhookId }, { status: 201 });
  } catch (error) {
    logger.error('Error registering webhook', error);
    
    // Check if there's a validation error in the message
    if (error instanceof Error) {
      if (error.message.includes('Invalid webhook URL') || 
          error.message.includes('Invalid event types') ||
          error.message.includes('At least one event type')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/data-generation/webhooks
 * Get registered webhooks
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const event = searchParams.get('event');
    
    // Get webhooks with optional filtering
    const webhooks = await webhookService.getWebhooks({ 
      event: event || undefined 
    });
    
    return NextResponse.json({ webhooks });
  } catch (error) {
    logger.error('Error getting webhooks', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 