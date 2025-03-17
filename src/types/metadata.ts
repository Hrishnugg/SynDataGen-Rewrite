/**
 * Metadata Types
 * 
 * Type definitions for metadata objects used throughout the application
 */

/**
 * Base metadata interface with common fields
 */
export interface BaseMetadata {
  source?: string;
  lastUpdated?: string | Date;
  version?: string | number;
}

/**
 * Waitlist submission metadata
 */
export interface WaitlistMetadata extends BaseMetadata {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  browser?: string;
  device?: string;
  priority?: number;
  tags?: string[];
  notes?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Customer metadata
 */
export interface CustomerMetadata extends BaseMetadata {
  customerType?: 'enterprise' | 'pro' | 'starter';
  industry?: string;
  region?: string;
  employees?: number;
  revenue?: string;
  tags?: string[];
  notes?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Project metadata
 */
export interface ProjectMetadata extends BaseMetadata {
  projectType?: string;
  dataSize?: string;
  status?: string;
  tags?: string[];
  notes?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Generic Record type for unknown metadata
 * Use this as a fallback when more specific types aren't available
 */
export type GenericMetadata = Record<string, unknown>;
