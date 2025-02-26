/**
 * Firestore Monitoring and Alerting Utilities
 * 
 * This module provides utilities for monitoring Firestore usage and setting up alerts.
 */

import { monitoring_v3, google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';

// Initialize Monitoring client
let monitoringClient: monitoring_v3.Monitoring | null = null;
let isInitialized = false;

/**
 * Initialize the monitoring module
 */
export async function initializeMonitoring(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    // Create auth client
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    // Create monitoring client
    monitoringClient = google.monitoring({
      version: 'v3',
      auth
    });
    
    isInitialized = true;
    console.log('Monitoring initialized successfully');
  } catch (error: any) {
    console.error('Monitoring initialization failed:', error);
    throw error;
  }
}

/**
 * Ensure the monitoring module is initialized
 */
async function ensureInitialized(): Promise<void> {
  if (!monitoringClient) {
    await initializeMonitoring();
  }
}

/**
 * Firestore metric types
 */
export const FirestoreMetrics = {
  READ_OPERATIONS: 'firestore.googleapis.com/document/read_count',
  WRITE_OPERATIONS: 'firestore.googleapis.com/document/write_count',
  DELETE_OPERATIONS: 'firestore.googleapis.com/document/delete_count',
  QUERY_EXECUTION_COUNT: 'firestore.googleapis.com/query/execution_count',
  ACTIVE_CONNECTIONS: 'firestore.googleapis.com/active_connections',
  DOCUMENT_STORAGE_SIZE: 'firestore.googleapis.com/storage/used_bytes'
};

/**
 * Types of alerting policies
 */
export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

/**
 * Options for creating a metric alert
 */
export interface MetricAlertOptions {
  displayName: string;
  metricType: string;
  thresholdValue: number;
  comparisonType: 'COMPARISON_GT' | 'COMPARISON_GE' | 'COMPARISON_LT' | 'COMPARISON_LE';
  duration: string; // e.g., '60s', '5m', '1h'
  severity?: AlertSeverity;
  notificationChannels?: string[];
  description?: string;
  filter?: string; // Additional filter for the metric
}

/**
 * Create a metric-based alerting policy
 * 
 * @param options Alert policy options
 * @returns The policy resource name
 */
export async function createMetricAlert(
  options: MetricAlertOptions
): Promise<string> {
  await ensureInitialized();
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found. Set GOOGLE_CLOUD_PROJECT environment variable.');
  }
  
  try {
    if (!monitoringClient) throw new Error('Monitoring not initialized');
    
    // Build the condition filter
    let filter = `metric.type="${options.metricType}"`;
    if (options.filter) {
      filter += ` AND ${options.filter}`;
    }
    
    // Create the alerting policy
    const [response] = await monitoringClient.projects.alertPolicies.create({
      name: `projects/${projectId}`,
      requestBody: {
        displayName: options.displayName,
        conditions: [
          {
            displayName: `${options.metricType} threshold`,
            conditionThreshold: {
              filter,
              comparison: options.comparisonType,
              thresholdValue: options.thresholdValue,
              duration: options.duration,
              trigger: {
                count: 1
              },
              aggregations: [
                {
                  alignmentPeriod: '60s',
                  perSeriesAligner: 'ALIGN_RATE'
                }
              ]
            }
          }
        ],
        combiner: 'OR',
        enabled: true,
        notificationChannels: options.notificationChannels || [],
        documentation: {
          content: options.description || `Alert for ${options.metricType}`,
          mimeType: 'text/markdown'
        },
        severity: options.severity || AlertSeverity.WARNING
      }
    });
    
    console.log(`Created alert policy: ${response.data.name}`);
    return response.data.name || '';
  } catch (error: any) {
    console.error('Failed to create alert policy:', error);
    throw new Error(`Alert policy creation failed: ${error.message}`);
  }
}

/**
 * Get Firestore usage metrics
 * 
 * @param metricType The metric type to retrieve
 * @param timeframe Timeframe for metrics in seconds (e.g., 3600 for 1 hour)
 * @returns The metric data
 */
export async function getFirestoreUsageMetrics(
  metricType: string = FirestoreMetrics.READ_OPERATIONS,
  timeframe: number = 3600
): Promise<any> {
  await ensureInitialized();
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found. Set GOOGLE_CLOUD_PROJECT environment variable.');
  }
  
  try {
    if (!monitoringClient) throw new Error('Monitoring not initialized');
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (timeframe * 1000));
    
    const [response] = await monitoringClient.projects.timeSeries.list({
      name: `projects/${projectId}`,
      filter: `metric.type="${metricType}"`,
      interval: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`Failed to get metrics for ${metricType}:`, error);
    throw new Error(`Metrics retrieval failed: ${error.message}`);
  }
}

/**
 * Create standard Firestore alerting policies
 * 
 * @param notificationChannels Array of notification channel resource names
 * @returns The created policy names
 */
export async function setupStandardFirestoreAlerts(
  notificationChannels: string[] = []
): Promise<string[]> {
  const policies = [];
  
  try {
    // 1. Alert for high read operations
    policies.push(await createMetricAlert({
      displayName: 'High Firestore Read Operations',
      metricType: FirestoreMetrics.READ_OPERATIONS,
      thresholdValue: 5000, // Adjust based on your expected traffic
      comparisonType: 'COMPARISON_GT',
      duration: '300s', // 5 minutes
      severity: AlertSeverity.WARNING,
      notificationChannels,
      description: 'Firestore read operations exceeded the threshold. This may indicate high costs or potential performance issues.'
    }));
    
    // 2. Alert for high write operations
    policies.push(await createMetricAlert({
      displayName: 'High Firestore Write Operations',
      metricType: FirestoreMetrics.WRITE_OPERATIONS,
      thresholdValue: 1000, // Adjust based on your expected traffic
      comparisonType: 'COMPARISON_GT',
      duration: '300s', // 5 minutes
      severity: AlertSeverity.WARNING,
      notificationChannels,
      description: 'Firestore write operations exceeded the threshold. This may indicate high costs or potential performance issues.'
    }));
    
    // 3. Alert for document storage size
    policies.push(await createMetricAlert({
      displayName: 'High Firestore Storage Usage',
      metricType: FirestoreMetrics.DOCUMENT_STORAGE_SIZE,
      thresholdValue: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
      comparisonType: 'COMPARISON_GT',
      duration: '3600s', // 1 hour
      severity: AlertSeverity.INFO,
      notificationChannels,
      description: 'Firestore storage usage exceeded the threshold. Review your data retention and storage policies.'
    }));
    
    // 4. Alert for high number of connections
    policies.push(await createMetricAlert({
      displayName: 'High Firestore Connection Count',
      metricType: FirestoreMetrics.ACTIVE_CONNECTIONS,
      thresholdValue: 100, // Adjust based on your expected traffic
      comparisonType: 'COMPARISON_GT',
      duration: '300s', // 5 minutes
      severity: AlertSeverity.WARNING,
      notificationChannels,
      description: 'Number of Firestore active connections exceeded the threshold. This may indicate a traffic spike or connection leaks.'
    }));
    
    return policies;
  } catch (error: any) {
    console.error('Failed to setup standard alerts:', error);
    throw new Error(`Standard alerts setup failed: ${error.message}`);
  }
}

/**
 * Create a Firestore dashboard
 * 
 * @returns Dashboard info
 */
export async function createFirestoreDashboard(): Promise<{
  name: string;
  url: string;
}> {
  // Note: This is a placeholder for the implementation
  // Actual implementation would use the Cloud Monitoring API
  // to create a dashboard with Firestore metrics
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
  if (!projectId) {
    throw new Error('Project ID not found. Set GOOGLE_CLOUD_PROJECT environment variable.');
  }
  
  console.log('Created Firestore dashboard (placeholder)');
  
  return {
    name: `projects/${projectId}/dashboards/firestore-monitoring-${Date.now()}`,
    url: `https://console.cloud.google.com/monitoring/dashboards/custom/${Date.now()}?project=${projectId}`
  };
} 