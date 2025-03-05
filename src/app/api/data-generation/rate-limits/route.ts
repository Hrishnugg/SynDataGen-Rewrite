/**
 * Data Generation Rate Limits API
 * 
 * API endpoints for managing rate limits for data generation jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobManagementService } from '@/lib/services/data-generation';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/data-generation/rate-limits
 * Get rate limit status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = session.user.id;
    
    // Get rate limit status
    const rateLimitStatus = await jobManagementService.getRateLimitStatus(customerId);
    
    return NextResponse.json(rateLimitStatus);
  } catch (error) {
    logger.error('Error getting rate limit status', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 