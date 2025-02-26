import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createMetricsHandler } from '@/lib/monitoring/firestore-metrics';

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
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'You must be logged in to access metrics' 
      }, { status: 401 });
    }
    
    // Check for admin role - safely handle undefined properties
    const role = session.user.role;
    const isAdmin = session.user.isAdmin === true || role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Permission denied', 
        message: 'Admin privileges required to access metrics' 
      }, { status: 403 });
    }
    
    // Use the metrics handler from our service
    return createMetricsHandler(req);
  } catch (error) {
    console.error('Error in Firestore metrics endpoint:', error);
    
    // Create a safe error response
    return NextResponse.json({ 
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 