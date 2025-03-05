/**
 * Data Generation Retention Policy API
 * 
 * API endpoints for managing data retention policies for data generation jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jobManagementService } from '@/lib/services/data-generation';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Schema for retention policy update
const retentionPolicySchema = z.object({
  retentionDays: z.number().int().positive().max(365), // Maximum 1 year
});

/**
 * GET /api/data-generation/retention
 * Get data retention policy for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = session.user.id;
    
    // Get retention policy
    const retentionDays = await jobManagementService.getJobRetentionPolicy(customerId);
    
    return NextResponse.json({ retentionDays });
  } catch (error) {
    logger.error('Error getting retention policy', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/data-generation/retention
 * Update data retention policy for the authenticated user
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = session.user.id;
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = retentionPolicySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { retentionDays } = validationResult.data;
    
    // Update retention policy
    const success = await jobManagementService.setJobRetentionPolicy(customerId, retentionDays);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update retention policy' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true, retentionDays });
  } catch (error) {
    logger.error('Error updating retention policy', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 