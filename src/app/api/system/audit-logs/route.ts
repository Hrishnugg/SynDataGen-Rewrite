import { NextRequest, NextResponse } from 'next/server';
import { getRecentAuditLogs } from '@/lib/audit-logs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get limit from query params or use default
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // Fetch audit logs
    const logs = await getRecentAuditLogs(limit);

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch audit logs', details: (error as Error).message },
      { status: 500 }
    );
  }
} 