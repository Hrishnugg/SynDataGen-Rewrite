/**
 * TypeScript Configuration Test
 * 
 * This script logs information about the current TypeScript configuration
 * to help diagnose JSX-related errors.
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../lib/utils/logger';

function logTsConfig(configPath: string) {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    logger.info(`Config file: ${configPath}`);
    logger.info(`JSX setting: ${config.compilerOptions?.jsx || 'not set'}`);
    logger.info(`Include patterns: ${JSON.stringify(config.include || [])}`);
    logger.info(`Exclude patterns: ${JSON.stringify(config.exclude || [])}`);
    
    return config;
  } catch (error) {
    logger.error(`Error reading config ${configPath}:`, error);
    return null;
  }
}

function checkReactVersion() {
  try {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    logger.info('React version:', packageJson.dependencies?.react || 'not found');
    logger.info('React DOM version:', packageJson.dependencies?.['react-dom'] || 'not found');
    logger.info('TypeScript version:', packageJson.devDependencies?.typescript || 'not found');
    logger.info('@types/react version:', packageJson.devDependencies?.['@types/react'] || 'not found');
    
    return packageJson;
  } catch (error) {
    logger.error('Error checking React version:', error);
    return null;
  }
}

function listTsConfigFiles() {
  try {
    const rootDir = process.cwd();
    const configFiles = fs.readdirSync(rootDir)
      .filter(file => file.startsWith('tsconfig') && file.endsWith('.json'));
    
    logger.info('Found TypeScript config files:', configFiles);
    return configFiles;
  } catch (error) {
    logger.error('Error listing tsconfig files:', error);
    return [];
  }
}

function main() {
  logger.info('======= TypeScript Configuration Test =======');
  
  // Check React version
  logger.info('\n--- React and TypeScript Versions ---');
  checkReactVersion();
  
  // List all tsconfig files
  logger.info('\n--- TypeScript Config Files ---');
  const configFiles = listTsConfigFiles();
  
  // Log details of each config file
  logger.info('\n--- TypeScript Config Details ---');
  for (const configFile of configFiles) {
    const configPath = path.resolve(process.cwd(), configFile);
    logger.info(`\n${configFile}:`);
    logTsConfig(configPath);
  }
  
  logger.info('\n======= TypeScript Configuration Test Complete =======');
}

// Run the test
main(); 