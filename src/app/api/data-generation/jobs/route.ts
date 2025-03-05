/**
 * Data Generation Jobs API
 * 
 * API endpoints for managing data generation jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { jobManagementService } from '@/lib/services/data-generation';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Schema for job creation
const jobConfigSchema = z.object({
  dataType: z.string(),
  dataSize: z.number().positive(),
  inputFormat: z.string(),
  outputFormat: z.string(),
  inputBucket: z.string(),
  outputBucket: z.string(),
  inputPath: z.string(),
  outputPath: z.string(),
  isAsync: z.boolean().default(true),
  timeout: z.number().positive().default(3600), // Default: 1 hour
  resumeWindow: z.number().positive().default(300), // Default: 5 minutes
  parameters: z.record(z.any()).optional().default({}),
  projectId: z.string(),
});

// Schema for job history query parameters
const jobHistoryQuerySchema = z.object({
  limit: z.coerce.number().positive().default(10),
  offset: z.coerce.number().nonnegative().default(0),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'cancelled', 'paused']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

/**
 * POST /api/data-generation/jobs
 * Create a new data generation job
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = session.user.id;
    
    // Parse and validate request body
    const body = await request.json();
    const validationResult = jobConfigSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { projectId, ...config } = validationResult.data;
    
    // Create job
    const result = await jobManagementService.createJob(customerId, projectId, config);
    
    if (result.status === 'rejected') {
      return NextResponse.json(
        { error: result.message || 'Job creation failed' },
        { status: 429 }
      );
    }
    
    return NextResponse.json({ jobId: result.jobId }, { status: 201 });
  } catch (error) {
    logger.error('Error creating job', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/data-generation/jobs
 * Get job history for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customerId = session.user.id;
    
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      status: searchParams.get('status'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };
    
    // Convert string parameters to appropriate types
    const parsedParams = {
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
      status: queryParams.status as any,
      startDate: queryParams.startDate ? new Date(queryParams.startDate) : undefined,
      endDate: queryParams.endDate ? new Date(queryParams.endDate) : undefined,
    };
    
    const validationResult = jobHistoryQuerySchema.safeParse(parsedParams);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Get job history
    const jobs = await jobManagementService.getJobHistory(customerId, validationResult.data);
    
    return NextResponse.json({ jobs });
  } catch (error) {
    logger.error('Error getting job history', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 