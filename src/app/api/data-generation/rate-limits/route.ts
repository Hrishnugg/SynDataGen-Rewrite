/**
 * Data Generation Rate Limits API
 * 
 * API endpoints for managing rate limits for data generation jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobManagementService } from '@/features/data-generation/services/job-management-service';
import { logger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/firebase/auth';
import { MockJobManagementService } from '@/features/data-generation/services/mock-service';

// Use mock service in development environment instead of returning mock data
const useService = process.env.NODE_ENV === 'development' 
  ? new MockJobManagementService() 
  : getJobManagementService();

/**
 * GET /api/data-generation/rate-limits
 * Get rate limit status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = session.user.id;
    
    // Get rate limit status using the mock service
    const rateLimitStatus = await useService.getRateLimitStatus(customerId);
    
    return NextResponse.json(rateLimitStatus);
  } catch (error) {
    logger.error('Error getting rate limit status', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}