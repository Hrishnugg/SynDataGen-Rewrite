/**
 * JSX Verification Test
 * 
 * This script tests that JSX can be properly compiled
 * with the updated TypeScript configuration.
 */

// @jsx React.createElement
// @jsxImportSource react

import React from '../jsx-runtime-shim';
import { logger } from '../lib/utils/logger';

// Simple JSX element directly
const element = <div>JSX is working correctly!</div>;

logger.info('JSX element created successfully');
// Using string template for logging to avoid type errors
logger.info(`Element type: ${typeof element.type}`);
logger.info('Test passed');

// Exit successfully
process.exit(0); 