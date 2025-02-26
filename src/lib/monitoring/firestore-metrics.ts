/**
 * Firestore Metrics and Monitoring
 * 
 * This module provides utilities for monitoring Firestore operations,
 * tracking performance, and logging important events.
 */

// Simple in-memory metrics tracking
interface OperationMetrics {
  count: number;
  totalDuration: number;
  failures: number;
  lastError?: Error;
}

interface FirestoreMetrics {
  reads: OperationMetrics;
  writes: OperationMetrics;
  deletes: OperationMetrics;
  queries: OperationMetrics;
  startTime: Date;
}

// Global metrics object
const metrics: FirestoreMetrics = {
  reads: { count: 0, totalDuration: 0, failures: 0 },
  writes: { count: 0, totalDuration: 0, failures: 0 },
  deletes: { count: 0, totalDuration: 0, failures: 0 },
  queries: { count: 0, totalDuration: 0, failures: 0 },
  startTime: new Date()
};

// Collection metrics
const collectionMetrics: Record<string, FirestoreMetrics> = {};

/**
 * Record a Firestore operation metric
 * @param operation Type of operation (read, write, delete, query)
 * @param duration Duration in milliseconds
 * @param collection Collection name
 * @param success Whether the operation was successful
 * @param error Optional error if operation failed
 */
export function recordMetric(
  operation: 'read' | 'write' | 'delete' | 'query',
  duration: number,
  collection: string,
  success: boolean,
  error?: Error
): void {
  // Update global metrics
  metrics[operation].count++;
  metrics[operation].totalDuration += duration;
  
  if (!success) {
    metrics[operation].failures++;
    metrics[operation].lastError = error;
  }
  
  // Update collection-specific metrics
  if (!collectionMetrics[collection]) {
    collectionMetrics[collection] = {
      reads: { count: 0, totalDuration: 0, failures: 0 },
      writes: { count: 0, totalDuration: 0, failures: 0 },
      deletes: { count: 0, totalDuration: 0, failures: 0 },
      queries: { count: 0, totalDuration: 0, failures: 0 },
      startTime: new Date()
    };
  }
  
  collectionMetrics[collection][operation].count++;
  collectionMetrics[collection][operation].totalDuration += duration;
  
  if (!success) {
    collectionMetrics[collection][operation].failures++;
    collectionMetrics[collection][operation].lastError = error;
  }
  
  // Log significant events (excessive duration, failures)
  if (duration > 1000) {
    console.warn(`Slow Firestore ${operation} on ${collection}: ${duration}ms`);
  }
  
  if (!success) {
    console.error(`Firestore ${operation} error on ${collection}:`, error);
  }
}

/**
 * Get the current metrics
 * @returns The current metrics
 */
export function getMetrics(): {
  global: FirestoreMetrics;
  collections: Record<string, FirestoreMetrics>;
} {
  return {
    global: { ...metrics },
    collections: { ...collectionMetrics }
  };
}

/**
 * Calculate and return performance statistics
 * @returns Performance statistics
 */
export function getPerformanceStats(): {
  global: {
    operationsPerSecond: Record<string, number>;
    averageDuration: Record<string, number>;
    failureRate: Record<string, number>;
    totalOperations: number;
  };
  collections: Record<string, {
    operationsPerSecond: Record<string, number>;
    averageDuration: Record<string, number>;
    failureRate: Record<string, number>;
    totalOperations: number;
  }>;
} {
  // Calculate global stats
  const elapsedSeconds = (new Date().getTime() - metrics.startTime.getTime()) / 1000;
  
  const globalStats = {
    operationsPerSecond: {
      reads: metrics.reads.count / elapsedSeconds,
      writes: metrics.writes.count / elapsedSeconds,
      deletes: metrics.deletes.count / elapsedSeconds,
      queries: metrics.queries.count / elapsedSeconds
    },
    averageDuration: {
      reads: metrics.reads.count > 0 ? metrics.reads.totalDuration / metrics.reads.count : 0,
      writes: metrics.writes.count > 0 ? metrics.writes.totalDuration / metrics.writes.count : 0,
      deletes: metrics.deletes.count > 0 ? metrics.deletes.totalDuration / metrics.deletes.count : 0,
      queries: metrics.queries.count > 0 ? metrics.queries.totalDuration / metrics.queries.count : 0
    },
    failureRate: {
      reads: metrics.reads.count > 0 ? (metrics.reads.failures / metrics.reads.count) * 100 : 0,
      writes: metrics.writes.count > 0 ? (metrics.writes.failures / metrics.writes.count) * 100 : 0,
      deletes: metrics.deletes.count > 0 ? (metrics.deletes.failures / metrics.deletes.count) * 100 : 0,
      queries: metrics.queries.count > 0 ? (metrics.queries.failures / metrics.queries.count) * 100 : 0
    },
    totalOperations: metrics.reads.count + metrics.writes.count + metrics.deletes.count + metrics.queries.count
  };
  
  // Calculate collection-specific stats
  const collectionStats: Record<string, any> = {};
  
  for (const [collection, stats] of Object.entries(collectionMetrics)) {
    const collectionElapsedSeconds = (new Date().getTime() - stats.startTime.getTime()) / 1000;
    
    collectionStats[collection] = {
      operationsPerSecond: {
        reads: stats.reads.count / collectionElapsedSeconds,
        writes: stats.writes.count / collectionElapsedSeconds,
        deletes: stats.deletes.count / collectionElapsedSeconds,
        queries: stats.queries.count / collectionElapsedSeconds
      },
      averageDuration: {
        reads: stats.reads.count > 0 ? stats.reads.totalDuration / stats.reads.count : 0,
        writes: stats.writes.count > 0 ? stats.writes.totalDuration / stats.writes.count : 0,
        deletes: stats.deletes.count > 0 ? stats.deletes.totalDuration / stats.deletes.count : 0,
        queries: stats.queries.count > 0 ? stats.queries.totalDuration / stats.queries.count : 0
      },
      failureRate: {
        reads: stats.reads.count > 0 ? (stats.reads.failures / stats.reads.count) * 100 : 0,
        writes: stats.writes.count > 0 ? (stats.writes.failures / stats.writes.count) * 100 : 0,
        deletes: stats.deletes.count > 0 ? (stats.deletes.failures / stats.deletes.count) * 100 : 0,
        queries: stats.queries.count > 0 ? (stats.queries.failures / stats.queries.count) * 100 : 0
      },
      totalOperations: stats.reads.count + stats.writes.count + stats.deletes.count + stats.queries.count
    };
  }
  
  return {
    global: globalStats,
    collections: collectionStats
  };
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  // Reset global metrics
  metrics.reads = { count: 0, totalDuration: 0, failures: 0 };
  metrics.writes = { count: 0, totalDuration: 0, failures: 0 };
  metrics.deletes = { count: 0, totalDuration: 0, failures: 0 };
  metrics.queries = { count: 0, totalDuration: 0, failures: 0 };
  metrics.startTime = new Date();
  
  // Reset collection metrics
  Object.keys(collectionMetrics).forEach(collection => {
    collectionMetrics[collection] = {
      reads: { count: 0, totalDuration: 0, failures: 0 },
      writes: { count: 0, totalDuration: 0, failures: 0 },
      deletes: { count: 0, totalDuration: 0, failures: 0 },
      queries: { count: 0, totalDuration: 0, failures: 0 },
      startTime: new Date()
    };
  });
}

/**
 * Create a monitoring API route handler to get metrics
 * @param req Next.js request
 * @returns API response with metrics
 */
export function createMetricsHandler(req: Request): Response {
  const searchParams = new URL(req.url).searchParams;
  const format = searchParams.get('format') || 'json';
  
  if (format === 'prometheus') {
    // Generate Prometheus format metrics
    const stats = getPerformanceStats();
    let output = '';
    
    // Global metrics
    output += '# HELP firestore_operations_total Total Firestore operations\n';
    output += '# TYPE firestore_operations_total counter\n';
    output += `firestore_operations_total{operation="read"} ${metrics.reads.count}\n`;
    output += `firestore_operations_total{operation="write"} ${metrics.writes.count}\n`;
    output += `firestore_operations_total{operation="delete"} ${metrics.deletes.count}\n`;
    output += `firestore_operations_total{operation="query"} ${metrics.queries.count}\n`;
    
    output += '# HELP firestore_operations_failures_total Total Firestore operation failures\n';
    output += '# TYPE firestore_operations_failures_total counter\n';
    output += `firestore_operations_failures_total{operation="read"} ${metrics.reads.failures}\n`;
    output += `firestore_operations_failures_total{operation="write"} ${metrics.writes.failures}\n`;
    output += `firestore_operations_failures_total{operation="delete"} ${metrics.deletes.failures}\n`;
    output += `firestore_operations_failures_total{operation="query"} ${metrics.queries.failures}\n`;
    
    output += '# HELP firestore_operation_duration_avg Average Firestore operation duration in ms\n';
    output += '# TYPE firestore_operation_duration_avg gauge\n';
    output += `firestore_operation_duration_avg{operation="read"} ${stats.global.averageDuration.reads}\n`;
    output += `firestore_operation_duration_avg{operation="write"} ${stats.global.averageDuration.writes}\n`;
    output += `firestore_operation_duration_avg{operation="delete"} ${stats.global.averageDuration.deletes}\n`;
    output += `firestore_operation_duration_avg{operation="query"} ${stats.global.averageDuration.queries}\n`;
    
    // Collection-specific metrics
    Object.entries(stats.collections).forEach(([collection, collectionStats]) => {
      output += `# HELP firestore_collection_operations_total Total operations for collection ${collection}\n`;
      output += `# TYPE firestore_collection_operations_total counter\n`;
      output += `firestore_collection_operations_total{collection="${collection}",operation="read"} ${collectionMetrics[collection].reads.count}\n`;
      output += `firestore_collection_operations_total{collection="${collection}",operation="write"} ${collectionMetrics[collection].writes.count}\n`;
      output += `firestore_collection_operations_total{collection="${collection}",operation="delete"} ${collectionMetrics[collection].deletes.count}\n`;
      output += `firestore_collection_operations_total{collection="${collection}",operation="query"} ${collectionMetrics[collection].queries.count}\n`;
    });
    
    return new Response(output, {
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  } else {
    // Default to JSON format
    return new Response(JSON.stringify({
      metrics: getMetrics(),
      stats: getPerformanceStats(),
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * High-level timing wrapper for Firestore operations
 * @param operation Type of operation
 * @param collection Collection name
 * @param fn Function to execute
 * @returns Result of the function
 */
export async function timeOperation<T>(
  operation: 'read' | 'write' | 'delete' | 'query',
  collection: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let success = false;
  let error: Error | undefined;
  
  try {
    const result = await fn();
    success = true;
    return result;
  } catch (e: any) {
    error = e;
    throw e;
  } finally {
    const duration = Date.now() - startTime;
    recordMetric(operation, duration, collection, success, error);
  }
}

// Export a decorator version for the FirestoreService class
export function withMetrics() {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const collection = args[0]; // Assuming first arg is collection name
      let operation: 'read' | 'write' | 'delete' | 'query';
      
      // Determine operation type based on method name
      if (propertyKey.includes('get') || propertyKey.includes('find')) {
        operation = 'read';
      } else if (propertyKey.includes('create') || propertyKey.includes('update')) {
        operation = 'write';
      } else if (propertyKey.includes('delete')) {
        operation = 'delete';
      } else if (propertyKey.includes('query')) {
        operation = 'query';
      } else {
        operation = 'read'; // Default
      }
      
      return timeOperation(operation, collection, () => originalMethod.apply(this, args));
    };
    
    return descriptor;
  };
} 