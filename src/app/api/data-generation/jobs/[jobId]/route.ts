/**
 * Data Generation Job API
 * 
 * API endpoints for managing a specific data generation job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobManagementService } from '@/lib/services/data-generation';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/data-generation/jobs/[jobId]
 * Get status of a specific job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    // Get job status
    const jobStatus = await jobManagementService.getJobStatus(jobId);
    
    // Check if the user has access to this job
    if (jobStatus.customerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json(jobStatus);
  } catch (error) {
    logger.error('Error getting job status', error);
    
    // Check if job not found
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/data-generation/jobs/[jobId]
 * Cancel a specific job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    // Cancel job
    const success = await jobManagementService.cancelJob(jobId, userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to cancel job. Job may be in a state that cannot be cancelled.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error cancelling job', error);
    
    // Check if job not found or forbidden
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      if (error.message.includes('forbidden') || error.message.includes('access')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data-generation/jobs/[jobId]/resume
 * Resume a specific job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    // Check if this is a resume request
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'resume') {
      // Resume job
      const success = await jobManagementService.resumeJob(jobId, userId);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to resume job. Job may be in a state that cannot be resumed or the resume window has expired.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Supported actions: resume' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error resuming job', error);
    
    // Check if job not found or forbidden
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      if (error.message.includes('forbidden') || error.message.includes('access')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 