import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createMetricsHandler, getMetrics, getPerformanceStats } from '@/lib/monitoring/firestore-metrics';

/**
 * GET handler for Firestore metrics
 * 
 * This endpoint provides metrics and performance statistics for Firestore operations.
 * Access is restricted to authenticated users with admin rights.
 */
export async function GET(req: Request) {
  try {
    // Authenticate the request
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check for admin role (adjust based on your auth model)
    if (session.user.role !== 'admin' && !session.user.isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Use the metrics handler
    return createMetricsHandler(req);
  } catch (error) {
    console.error('Error in Firestore metrics endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
} 