/**
 * Fix Service Inconsistencies
 * 
 * This script addresses inconsistencies in how services are used across the codebase,
 * particularly focusing on the data generation mock service implementation.
 * 
 * Issues addressed:
 * 1. Inconsistent service usage between different API routes
 * 2. Type mismatches between mock services and their interfaces
 * 3. Missing adapter patterns for mock services
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const API_DIR = path.join(SRC_DIR, 'app/api');
const FEATURES_DIR = path.join(SRC_DIR, 'features');
const SERVICES_DIR = path.join(FEATURES_DIR, 'data-generation/services');
const LIB_DIR = path.join(SRC_DIR, 'lib');

// Files to modify
const FILES_TO_CHECK = [
  'src/app/api/data-generation/jobs/route.ts',
  'src/app/api/data-generation/jobs/[jobId]/route.ts',
  'src/features/data-generation/services/mock-service.ts',
  'src/features/data-generation/services/job-management-service.ts'
];

// Create service provider file path
const SERVICE_PROVIDER_PATH = path.join(SERVICES_DIR, 'service-provider.ts');

/**
 * Create a unified service provider
 */
function createServiceProvider() {
  console.log('Creating unified service provider...');
  
  const serviceProviderContent = `/**
 * Data Generation Service Provider
 * 
 * This module provides a unified way to access data generation services,
 * handling the selection between mock and real implementations based on environment.
 */

import { MockJobManagementService } from './mock-service';
import { JobManagementService } from './job-management-service';

/**
 * Get the appropriate job management service based on environment
 */
export function getJobManagementService(): JobManagementService {
  // Use mock service in development environment
  if (process.env.NODE_ENV === 'development') {
    return new MockJobManagementService() as unknown as JobManagementService;
  }
  
  // Use real service in production
  return new JobManagementService();
}

// Export a singleton instance for convenience
export const jobService = getJobManagementService();
`;

  fs.writeFileSync(SERVICE_PROVIDER_PATH, serviceProviderContent);
  console.log(`Created service provider at ${SERVICE_PROVIDER_PATH}`);
}

/**
 * Update API routes to use the service provider
 */
function updateApiRoutes() {
  console.log('Updating API routes to use service provider...');
  
  // Update main jobs route
  const jobsRoutePath = path.join(API_DIR, 'data-generation/jobs/route.ts');
  if (fs.existsSync(jobsRoutePath)) {
    let content = fs.readFileSync(jobsRoutePath, 'utf8');
    
    // Replace imports
    content = content.replace(
      /import { jobManagementService } from '@\/features\/data-generation\/services\/job-management-service';[\s\S]*?import { MockJobManagementService } from '@\/features\/data-generation\/services\/mock-service';/,
      `import { jobService } from '@/features/data-generation/services/service-provider';`
    );
    
    // Replace conditional service selection
    content = content.replace(
      /const useService = process\.env\.NODE_ENV === 'development'[\s\S]*?\? new MockJobManagementService\(\)[\s\S]*?\: jobManagementService;/,
      `// Service is now provided by the service provider\nconst useService = jobService;`
    );
    
    fs.writeFileSync(jobsRoutePath, content);
    console.log(`Updated ${jobsRoutePath}`);
  }
  
  // Update job detail route
  const jobDetailRoutePath = path.join(API_DIR, 'data-generation/jobs/[jobId]/route.ts');
  if (fs.existsSync(jobDetailRoutePath)) {
    let content = fs.readFileSync(jobDetailRoutePath, 'utf8');
    
    // Replace imports
    content = content.replace(
      /import { jobManagementService } from '@\/features\/data-generation\/services\/job-management-service';/,
      `import { jobService } from '@/features/data-generation/services/service-provider';`
    );
    
    // Replace service usage
    content = content.replace(
      /jobManagementService\./g,
      `jobService.`
    );
    
    fs.writeFileSync(jobDetailRoutePath, content);
    console.log(`Updated ${jobDetailRoutePath}`);
  }
}

/**
 * Update mock service to properly implement the interface
 */
function updateMockService() {
  console.log('Updating mock service implementation...');
  
  const mockServicePath = path.join(SERVICES_DIR, 'mock-service.ts');
  if (fs.existsSync(mockServicePath)) {
    let content = fs.readFileSync(mockServicePath, 'utf8');
    
    // Add import for JobManagementService
    if (!content.includes('import { JobManagementService }')) {
      const importStatement = `import { JobManagementService } from './job-management-service';`;
      content = content.replace(
        /import {[\s\S]*?} from '@\/lib\/models\/data-generation\/types';/,
        `$&\n${importStatement}`
      );
    }
    
    // Update class declaration to implement JobManagementService
    content = content.replace(
      /export class MockJobManagementService {/,
      `export class MockJobManagementService implements Partial<JobManagementService> {`
    );
    
    fs.writeFileSync(mockServicePath, content);
    console.log(`Updated ${mockServicePath}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting service inconsistency fixes...');
  
  try {
    // Create service provider
    createServiceProvider();
    
    // Update API routes
    updateApiRoutes();
    
    // Update mock service
    updateMockService();
    
    // Run TypeScript compiler to check for errors
    console.log('Running TypeScript compiler to check for errors...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('TypeScript compilation successful!');
    } catch (error) {
      console.error('TypeScript compilation failed. Some manual fixes may be required.');
    }
    
    console.log('\nService inconsistency fixes completed!');
    console.log('\nManual steps that may be required:');
    console.log('1. Check if the mock service needs additional methods to match the JobManagementService interface');
    console.log('2. Verify that all API routes are using the service provider correctly');
    console.log('3. Update any tests that directly use the services');
    
  } catch (error) {
    console.error('Error fixing service inconsistencies:', error);
  }
}

// Run the script
main().catch(console.error); 