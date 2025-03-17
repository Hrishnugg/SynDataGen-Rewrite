/**
 * projects Type Definitions
 * 
 * This file contains type definitions for projects in the application.
 */


/**
 * Project metadata interface
 */
export interface ProjectMetadata {
  tags?: string[];
  category?: string;
  lastGeneratedAt?: Date;
  generationCount?: number;
  customFields?: Record<string, string | number | boolean>;
}

