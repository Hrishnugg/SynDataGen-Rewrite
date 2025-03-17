/**
 * Logger Bridge Module
 * 
 * This module re-exports the logger from its new location to maintain
 * compatibility with existing imports across the codebase.
 */

export { logger, createPrefixedLogger } from './utils/logger';
