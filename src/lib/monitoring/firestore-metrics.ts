/**
 * Firestore Metrics and Monitoring
 * 
 * This module provides utilities for monitoring Firestore operations,
 * tracking performance, and logging important events.
 * 
 * Modified for compatibility with Vercel deployment and Edge Runtime.
 */

// Simple in-memory metrics tracking
interface OperationMetrics {
  count: number;
  totalDuration: number;
  failures: number;
  lastError?: string; // Changed from Error to string for better serialization
}

// Define the operation types to ensure type safety
type OperationType = 'read' | 'write' | 'delete' | 'query';

// Update the interface with proper index signature
interface FirestoreMetrics {
  reads: OperationMetrics;
  writes: OperationMetrics;
  deletes: OperationMetrics;
  queries: OperationMetrics;
  startTime: string; // Changed from Date to ISO string for better serialization
  // Add index signature to allow string literal indexing
  [key: string]: OperationMetrics | string;
}

// Factory function for metrics to avoid issues with global state in serverless environments
function createDefaultMetrics(): FirestoreMetrics {
  return {
    reads: { count: 0, totalDuration: 0, failures: 0 },
    writes: { count: 0, totalDuration: 0, failures: 0 },
    deletes: { count: 0, totalDuration: 0, failures: 0 },
    queries: { count: 0, totalDuration: 0, failures: 0 },
    startTime: new Date().toISOString()
  };
}

// Use a class-based approach instead of global variables
// This helps with tree-shaking and avoids issues with global state
class FirestoreMetricsService {
  private metrics: FirestoreMetrics;
  private collectionMetrics: Record<string, FirestoreMetrics>;
  
  constructor() {
    this.metrics = createDefaultMetrics();
    this.collectionMetrics = {};
  }
  
  /**
   * Record a Firestore operation metric
   * @param operation Type of operation (read, write, delete, query)
   * @param duration Duration in milliseconds
   * @param collection Collection name
   * @param success Whether the operation was successful
   * @param error Optional error if operation failed
   */
  recordMetric(
    operation: OperationType,
    duration: number,
    collection: string,
    success: boolean,
    error?: Error | unknown
  ): void {
    // Map operation type to the correct property name
    const metricKey = this.getMetricKey(operation);
    
    // Update global metrics
    const metric = this.metrics[metricKey] as OperationMetrics;
    metric.count++;
    metric.totalDuration += duration;
    
    if (!success) {
      metric.failures++;
      metric.lastError = error instanceof Error 
        ? error.message 
        : String(error);
    }
    
    // Update collection-specific metrics
    if (!this.collectionMetrics[collection]) {
      this.collectionMetrics[collection] = createDefaultMetrics();
    }
    
    const collectionMetric = this.collectionMetrics[collection][metricKey] as OperationMetrics;
    collectionMetric.count++;
    collectionMetric.totalDuration += duration;
    
    if (!success) {
      collectionMetric.failures++;
      collectionMetric.lastError = error instanceof Error 
        ? error.message 
        : String(error);
    }
    
    // Log significant events (excessive duration, failures)
    if (duration > 1000) {
      // Safe console logging
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`Slow Firestore ${operation} on ${collection}: ${duration}ms`);
      }
    }
    
    if (!success) {
      // Safe console logging
      if (typeof console !== 'undefined' && console.error) {
        console.error(`Firestore ${operation} error on ${collection}:`, error);
      }
    }
  }
  
  /**
   * Helper method to map operation type to metric key
   */
  private getMetricKey(operation: OperationType): string {
    switch(operation) {
      case 'read': return 'reads';
      case 'write': return 'writes';
      case 'delete': return 'deletes';
      case 'query': return 'queries';
      default: 
        // This should never happen due to TypeScript's exhaustive checking
        throw new Error(`Unknown operation type: ${operation}`);
    }
  }
  
  /**
   * Get the current metrics
   * @returns The current metrics
   */
  getMetrics(): {
    global: FirestoreMetrics;
    collections: Record<string, FirestoreMetrics>;
  } {
    return {
      global: { ...this.metrics },
      collections: { ...this.collectionMetrics }
    };
  }
  
  /**
   * Calculate and return performance statistics
   * @returns Performance statistics
   */
  getPerformanceStats(): {
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
    const metricsStartTime = new Date(this.metrics.startTime).getTime();
    const elapsedSeconds = Math.max(1, (Date.now() - metricsStartTime) / 1000);
    
    const reads = this.metrics.reads as OperationMetrics;
    const writes = this.metrics.writes as OperationMetrics;
    const deletes = this.metrics.deletes as OperationMetrics;
    const queries = this.metrics.queries as OperationMetrics;
    
    const globalStats = {
      operationsPerSecond: {
        reads: reads.count / elapsedSeconds,
        writes: writes.count / elapsedSeconds,
        deletes: deletes.count / elapsedSeconds,
        queries: queries.count / elapsedSeconds
      },
      averageDuration: {
        reads: reads.count > 0 ? reads.totalDuration / reads.count : 0,
        writes: writes.count > 0 ? writes.totalDuration / writes.count : 0,
        deletes: deletes.count > 0 ? deletes.totalDuration / deletes.count : 0,
        queries: queries.count > 0 ? queries.totalDuration / queries.count : 0
      },
      failureRate: {
        reads: reads.count > 0 ? (reads.failures / reads.count) * 100 : 0,
        writes: writes.count > 0 ? (writes.failures / writes.count) * 100 : 0,
        deletes: deletes.count > 0 ? (deletes.failures / deletes.count) * 100 : 0,
        queries: queries.count > 0 ? (queries.failures / queries.count) * 100 : 0
      },
      totalOperations: reads.count + writes.count + deletes.count + queries.count
    };
    
    // Calculate collection-specific stats
    const collectionStats: Record<string, any> = {};
    
    for (const [collection, stats] of Object.entries(this.collectionMetrics)) {
      const collectionStartTime = new Date(stats.startTime).getTime();
      const collectionElapsedSeconds = Math.max(1, (Date.now() - collectionStartTime) / 1000);
      
      const collReads = stats.reads as OperationMetrics;
      const collWrites = stats.writes as OperationMetrics;
      const collDeletes = stats.deletes as OperationMetrics;
      const collQueries = stats.queries as OperationMetrics;
      
      collectionStats[collection] = {
        operationsPerSecond: {
          reads: collReads.count / collectionElapsedSeconds,
          writes: collWrites.count / collectionElapsedSeconds,
          deletes: collDeletes.count / collectionElapsedSeconds,
          queries: collQueries.count / collectionElapsedSeconds
        },
        averageDuration: {
          reads: collReads.count > 0 ? collReads.totalDuration / collReads.count : 0,
          writes: collWrites.count > 0 ? collWrites.totalDuration / collWrites.count : 0,
          deletes: collDeletes.count > 0 ? collDeletes.totalDuration / collDeletes.count : 0,
          queries: collQueries.count > 0 ? collQueries.totalDuration / collQueries.count : 0
        },
        failureRate: {
          reads: collReads.count > 0 ? (collReads.failures / collReads.count) * 100 : 0,
          writes: collWrites.count > 0 ? (collWrites.failures / collWrites.count) * 100 : 0,
          deletes: collDeletes.count > 0 ? (collDeletes.failures / collDeletes.count) * 100 : 0,
          queries: collQueries.count > 0 ? (collQueries.failures / collQueries.count) * 100 : 0
        },
        totalOperations: collReads.count + collWrites.count + collDeletes.count + collQueries.count
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
  resetMetrics(): void {
    // Reset global metrics
    this.metrics = createDefaultMetrics();
    
    // Reset collection metrics
    Object.keys(this.collectionMetrics).forEach(collection => {
      this.collectionMetrics[collection] = createDefaultMetrics();
    });
  }
  
  /**
   * Create a monitoring API route handler to get metrics
   * This method is compatible with both Edge Runtime and Node.js
   * 
   * @param req Next.js request
   * @returns API response with metrics
   */
  createMetricsHandler(req: Request): Response {
    try {
      const url = new URL(req.url);
      const searchParams = url.searchParams;
      const format = searchParams.get('format') || 'json';
      
      if (format === 'prometheus') {
        // Generate Prometheus format metrics
        const stats = this.getPerformanceStats();
        let output = '';
        
        // Access typed metrics
        const reads = this.metrics.reads as OperationMetrics;
        const writes = this.metrics.writes as OperationMetrics;
        const deletes = this.metrics.deletes as OperationMetrics;
        const queries = this.metrics.queries as OperationMetrics;
        
        // Global metrics
        output += '# HELP firestore_operations_total Total Firestore operations\n';
        output += '# TYPE firestore_operations_total counter\n';
        output += `firestore_operations_total{operation="read"} ${reads.count}\n`;
        output += `firestore_operations_total{operation="write"} ${writes.count}\n`;
        output += `firestore_operations_total{operation="delete"} ${deletes.count}\n`;
        output += `firestore_operations_total{operation="query"} ${queries.count}\n`;
        
        output += '# HELP firestore_operations_failures_total Total Firestore operation failures\n';
        output += '# TYPE firestore_operations_failures_total counter\n';
        output += `firestore_operations_failures_total{operation="read"} ${reads.failures}\n`;
        output += `firestore_operations_failures_total{operation="write"} ${writes.failures}\n`;
        output += `firestore_operations_failures_total{operation="delete"} ${deletes.failures}\n`;
        output += `firestore_operations_failures_total{operation="query"} ${queries.failures}\n`;
        
        output += '# HELP firestore_operation_duration_avg Average Firestore operation duration in ms\n';
        output += '# TYPE firestore_operation_duration_avg gauge\n';
        output += `firestore_operation_duration_avg{operation="read"} ${stats.global.averageDuration.reads}\n`;
        output += `firestore_operation_duration_avg{operation="write"} ${stats.global.averageDuration.writes}\n`;
        output += `firestore_operation_duration_avg{operation="delete"} ${stats.global.averageDuration.deletes}\n`;
        output += `firestore_operation_duration_avg{operation="query"} ${stats.global.averageDuration.queries}\n`;
        
        // Collection-specific metrics - safely handle possibly empty collections
        if (Object.keys(this.collectionMetrics).length > 0) {
          Object.entries(stats.collections).forEach(([collection, collectionStats]) => {
            if (this.collectionMetrics[collection]) {
              const collReads = this.collectionMetrics[collection].reads as OperationMetrics;
              const collWrites = this.collectionMetrics[collection].writes as OperationMetrics;
              const collDeletes = this.collectionMetrics[collection].deletes as OperationMetrics;
              const collQueries = this.collectionMetrics[collection].queries as OperationMetrics;
              
              output += `# HELP firestore_collection_operations_total Total operations for collection ${collection}\n`;
              output += `# TYPE firestore_collection_operations_total counter\n`;
              output += `firestore_collection_operations_total{collection="${collection}",operation="read"} ${collReads.count}\n`;
              output += `firestore_collection_operations_total{collection="${collection}",operation="write"} ${collWrites.count}\n`;
              output += `firestore_collection_operations_total{collection="${collection}",operation="delete"} ${collDeletes.count}\n`;
              output += `firestore_collection_operations_total{collection="${collection}",operation="query"} ${collQueries.count}\n`;
            }
          });
        }
        
        return new Response(output, {
          headers: {
            'Content-Type': 'text/plain'
          }
        });
      } else {
        // Default to JSON format
        return new Response(JSON.stringify({
          metrics: this.getMetrics(),
          stats: this.getPerformanceStats(),
          timestamp: new Date().toISOString()
        }, null, 2), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Error creating metrics response:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate metrics', 
        message: error instanceof Error ? error.message : String(error) 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
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
  async timeOperation<T>(
    operation: OperationType,
    collection: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let error: unknown;
    
    try {
      const result = await fn();
      success = true;
      return result;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration, collection, success, error);
    }
  }
  
  /**
   * Create a decorator for FirestoreService class methods
   */
  withMetrics() {
    return (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;
      const metricsService = this;
      
      descriptor.value = async function(...args: any[]) {
        const collection = typeof args[0] === 'string' ? args[0] : 'unknown';
        let operation: OperationType;
        
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
        
        return metricsService.timeOperation(operation, collection, () => originalMethod.apply(this, args));
      };
      
      return descriptor;
    };
  }
}

// Create a singleton instance
const metricsService = new FirestoreMetricsService();

// Export individual methods to maintain API compatibility
export const recordMetric = metricsService.recordMetric.bind(metricsService);
export const getMetrics = metricsService.getMetrics.bind(metricsService);
export const getPerformanceStats = metricsService.getPerformanceStats.bind(metricsService);
export const resetMetrics = metricsService.resetMetrics.bind(metricsService);
export const createMetricsHandler = metricsService.createMetricsHandler.bind(metricsService);
export const timeOperation = metricsService.timeOperation.bind(metricsService);
export const withMetrics = metricsService.withMetrics.bind(metricsService);

// Export the operation type for external use
export type { OperationType };

// Export the class for advanced usage
export { FirestoreMetricsService };

// Export default instance for convenience
export default metricsService; 