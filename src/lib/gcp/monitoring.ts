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
  
  // Mock implementation that returns a fake alert policy ID
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'mock-project';
  
  console.log(`[MOCK] Creating alert policy: ${options.displayName}`);
  console.log(`[MOCK] Metric type: ${options.metricType}`);
  console.log(`[MOCK] Threshold: ${options.thresholdValue} ${options.comparisonType}`);
  
  return `projects/${projectId}/alertPolicies/mock-alert-${Date.now()}`;
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
  
  // Mock implementation that returns fake metrics data
  console.log(`[MOCK] Getting metrics for ${metricType} over ${timeframe} seconds`);
  
  // Return mock data structure
  return {
    timeSeries: [{
      metric: { type: metricType },
      points: [
        {
          interval: {
            startTime: new Date(Date.now() - timeframe * 1000).toISOString(),
            endTime: new Date().toISOString()
          },
          value: {
            int64Value: '5000',
            doubleValue: 5000.0
          }
        }
      ]
    }]
  };
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
  // Mock implementation that returns fake alert policy IDs
  console.log('[MOCK] Setting up standard Firestore alerts');
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'mock-project';
  const timestamp = Date.now();
  
  // Return fake policy IDs
  return [
    `projects/${projectId}/alertPolicies/mock-reads-alert-${timestamp}`,
    `projects/${projectId}/alertPolicies/mock-writes-alert-${timestamp}`,
    `projects/${projectId}/alertPolicies/mock-storage-alert-${timestamp}`,
    `projects/${projectId}/alertPolicies/mock-connections-alert-${timestamp}`
  ];
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
  // Mock implementation that returns fake dashboard info
  console.log('[MOCK] Creating Firestore dashboard');
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || 'mock-project';
  const timestamp = Date.now();
  
  return {
    name: `projects/${projectId}/dashboards/mock-firestore-dashboard-${timestamp}`,
    url: `https://console.cloud.google.com/monitoring/dashboards/custom/mock-${timestamp}?project=${projectId}`
  };
} 