import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createMetricsHandler } from '@/lib/monitoring/firestore-metrics';
import { getDatabaseCacheStats } from '@/lib/services/db-service';
import { headers } from 'next/headers';

// Firestore operation costs (per 100K operations)
const COST_PER_100K = {
  reads: 0.06,  // $0.06 per 100K reads
  writes: 0.18, // $0.18 per 100K writes
  deletes: 0.02, // $0.02 per 100K deletes
  storage: 0.18, // $0.18 per GB-month
};

/**
 * GET handler for Firestore metrics
 * 
 * This endpoint provides metrics and performance statistics for Firestore operations,
 * including cost estimation and cache effectiveness.
 * Access is restricted to authenticated users with admin rights.
 */
export async function GET(req: Request) {
  try {
    // Check for monitoring token (for monitoring services)
    const headersList = headers();
    const monitoringToken = headersList.get('x-monitoring-token');
    const configuredToken = process.env.MONITORING_TOKEN;
    
    let isAuthorized = false;
    
    // If monitoring token is provided and matches, allow access
    if (monitoringToken && configuredToken && monitoringToken === configuredToken) {
      isAuthorized = true;
    } else {
      // Otherwise check for user session with admin rights
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
      
      isAuthorized = true;
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'Invalid authorization credentials' 
      }, { status: 401 });
    }
    
    // Get metrics from handler
    const metricsHandler = createMetricsHandler(req);
    const metricsResponse = await metricsHandler.json();
    
    // Get cache statistics
    const cacheStats = getDatabaseCacheStats();
    
    // Calculate estimated costs
    const costs = calculateCosts(metricsResponse);
    
    // Return combined metrics
    return NextResponse.json({
      ...metricsResponse,
      cache: cacheStats,
      costs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in Firestore metrics endpoint:', error);
    
    // Create a safe error response
    return NextResponse.json({ 
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Calculate estimated costs based on operation counts
 */
function calculateCosts(metrics: any) {
  try {
    // Extract global metrics
    const { reads, writes, deletes } = metrics.global;
    
    // Calculate cost for each operation type
    const readCost = (reads.count / 100000) * COST_PER_100K.reads;
    const writeCost = (writes.count / 100000) * COST_PER_100K.writes;
    const deleteCost = (deletes.count / 100000) * COST_PER_100K.deletes;
    
    // Calculate total cost
    const totalCost = readCost + writeCost + deleteCost;
    
    // Calculate daily and monthly projections
    const operationsPerHour = (reads.count + writes.count + deletes.count) / 
      (Math.max(1, (Date.now() - new Date(metrics.global.startTime).getTime()) / (1000 * 60 * 60)));
    
    const dailyProjection = (operationsPerHour * 24) / 100000;
    const monthlyProjection = dailyProjection * 30;
    
    // Calculate projected costs
    const projectedDailyCost = dailyProjection * 
      ((reads.count / (reads.count + writes.count + deletes.count || 1)) * COST_PER_100K.reads +
       (writes.count / (reads.count + writes.count + deletes.count || 1)) * COST_PER_100K.writes +
       (deletes.count / (reads.count + writes.count + deletes.count || 1)) * COST_PER_100K.deletes);
    
    const projectedMonthlyCost = projectedDailyCost * 30;
    
    return {
      current: {
        readCost: roundCost(readCost),
        writeCost: roundCost(writeCost),
        deleteCost: roundCost(deleteCost),
        totalCost: roundCost(totalCost)
      },
      projected: {
        dailyCost: roundCost(projectedDailyCost),
        monthlyCost: roundCost(projectedMonthlyCost),
        operationsPerHour: Math.round(operationsPerHour)
      },
      savingsFromCache: calculateCacheSavings(metrics)
    };
  } catch (error) {
    console.error('Error calculating costs:', error);
    return {
      error: 'Failed to calculate costs'
    };
  }
}

/**
 * Round cost to 4 decimal places for readability
 */
function roundCost(cost: number): number {
  return Math.round(cost * 10000) / 10000;
}

/**
 * Calculate savings from cache hits
 */
function calculateCacheSavings(metrics: any): {
  operations: number;
  cost: number;
  percentage: number;
} {
  try {
    // If cache metrics are available
    if (metrics.cache && typeof metrics.cache.hits === 'number') {
      const cacheHits = metrics.cache.hits;
      const savingsUSD = (cacheHits / 100000) * COST_PER_100K.reads;
      const totalRequests = metrics.cache.hits + metrics.cache.misses;
      const percentage = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
      
      return {
        operations: cacheHits,
        cost: roundCost(savingsUSD),
        percentage: Math.round(percentage * 100) / 100
      };
    }
    
    // Fallback if cache info not available
    return {
      operations: 0,
      cost: 0,
      percentage: 0
    };
  } catch (error) {
    console.error('Error calculating cache savings:', error);
    return {
      operations: 0,
      cost: 0,
      percentage: 0
    };
  }
} 