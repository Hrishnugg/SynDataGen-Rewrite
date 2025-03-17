/**
 * Data Generation Retention Policy API
 * 
 * API endpoints for managing data retention policies for data generation jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobManagementService } from '@/features/data-generation/services/job-management-service';
import { logger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/firebase/auth';
import { MockJobManagementService } from '@/features/data-generation/services/mock-service';

// Use mock service in development environment instead of returning mock data
const useService = process.env.NODE_ENV === 'development' 
  ? new MockJobManagementService() 
  : getJobManagementService();

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
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = session.user.id;
    
    // Get retention policy using the mock service
    const retentionDays = await useService.getJobRetentionPolicy(customerId);
    
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
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = session.user.id;
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = retentionPolicySchema.safeParse(body);
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validatedData.error },
        { status: 400 }
      );
    }
    
    const { retentionDays } = validatedData.data;
    
    // Update retention policy using the mock service
    const success = await useService.setJobRetentionPolicy(customerId, retentionDays);
    
    if (success) {
      return NextResponse.json({ success: true, retentionDays });
    } else {
      return NextResponse.json(
        { error: 'Failed to update retention policy' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error updating retention policy', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}