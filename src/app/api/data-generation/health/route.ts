/**
 * Data Generation Pipeline Health API
 * 
 * API endpoint for checking the health of the data generation pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPipelineService } from '@/features/data-generation/services/pipeline-service';
import { logger } from '@/lib/utils/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/firebase/auth';

/**
 * GET /api/data-generation/health
 * Get health status of the data generation pipeline
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get pipeline health
    const pipelineService = getPipelineService();
    const health = await pipelineService.checkHealth();
    
    // Return appropriate status code based on health status
    const statusCode = health.status === 'healthy' ? 200 
      : health.status === 'degraded' ? 200 
      : 503; // Service Unavailable for unhealthy
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    logger.error('Error checking pipeline health', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}