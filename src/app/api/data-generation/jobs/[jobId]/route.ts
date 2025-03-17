/**
 * Data Generation Job API
 * 
 * API endpoints for managing a specific data generation job.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/firebase/auth';
import { getJobManagementService } from '@/features/data-generation/services/job-management-service';
import { logger } from '@/lib/utils/logger';

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
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    const jobManagementService = getJobManagementService();
    
    // Get job status
    const jobStatus = await jobManagementService.getJobStatus(jobId);
    
    if (!jobStatus) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Use createdBy instead of customerId for access control
    if (jobStatus.createdBy !== userId) {
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
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    const jobManagementService = getJobManagementService();
    
    // Get job status to check ownership
    const jobStatus = await jobManagementService.getJobStatus(jobId);
    
    if (!jobStatus) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Use createdBy instead of customerId for access control
    if (jobStatus.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Cancel job
    const success = await jobManagementService.cancelJob(jobId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error cancelling job', error);
    
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
 * POST /api/data-generation/jobs/[jobId]/resume
 * Resume a paused job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    const jobManagementService = getJobManagementService();
    
    // Get job status to check ownership and current status
    const jobStatus = await jobManagementService.getJobStatus(jobId);
    
    if (!jobStatus) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    // Use createdBy instead of customerId for access control
    if (jobStatus.createdBy !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Check if the job is in a state that can be resumed
    // Use type assertion to help TypeScript understand the comparison
    if ((jobStatus.status as string) !== 'cancelled') {
      return NextResponse.json(
        { error: 'Job is not in a state that can be resumed' },
        { status: 400 }
      );
    }
    
    // Since the resumeJob method isn't part of our interface, use updateJobStatus instead
    const success = await jobManagementService.updateJobStatus(jobId, {
      status: 'pending' // Using string literal instead of JobStatusValue type
    });
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to resume job' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error resuming job', error);
    
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