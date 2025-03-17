/**
 * Import Path Fixer
 * 
 * This script scans for common import path issues after the codebase
 * reorganization and fixes them automatically.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const config = {
  rootDir: path.resolve(__dirname, '..'),
  scanDirectories: ['src'],
  excludeDirectories: ['node_modules', '.git', '.next', 'dist'],
  fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  pathMaps: [
    // Most common import path mappings based on the errors
    {
      from: '@/lib/utils',
      to: '@/lib/utils/utils',
      description: 'Fix path to cn utility function used in UI components'
    },
    {
      from: './ThemeToggle',
      to: '@/components/common/ThemeToggle',
      description: 'Fix ThemeToggle component import'
    },
    {
      from: './ClientOnly',
      to: '@/components/ui/ClientOnly',
      description: 'Fix ClientOnly component import'
    },
    {
      from: './three/compat',
      to: '@/components/three/compat',
      description: 'Fix compat module import for Three.js components'
    },
    {
      from: '@/utils/isBrowser',
      to: '@/lib/utils/isBrowser',
      description: 'Fix isBrowser utility import'
    },
    {
      from: '../../models/data-generation/types',
      to: '@/lib/models/data-generation/types',
      description: 'Fix data generation types import'
    },
    {
      from: '../../models/data-generation/job-state-machine',
      to: '@/lib/models/data-generation/job-state-machine',
      description: 'Fix job state machine import'
    },
    {
      from: '../../logger',
      to: '@/lib/utils/logger',
      description: 'Fix logger import'
    },
    {
      from: '../../firebase',
      to: '@/lib/firebase',
      description: 'Fix firebase import'
    },
    {
      from: './firebase',
      to: '@/lib/firebase',
      description: 'Fix firebase import (local version)'
    },
    {
      from: './logger',
      to: '@/lib/utils/logger',
      description: 'Fix logger import (local version)'
    },
    {
      from: '@/lib/services/data-generation/job-management-service',
      to: '@/features/data-generation/services/job-management-service',
      description: 'Fix job management service import'
    },
    {
      from: '@/lib/services/data-generation/pipeline-service',
      to: '@/features/data-generation/services/pipeline-service',
      description: 'Fix pipeline service import'
    },
    {
      from: '@/lib/services/data-generation/webhook-service',
      to: '@/features/data-generation/services/webhook-service',
      description: 'Fix webhook service import'
    },
    {
      from: '../ui/ui-card',
      to: '@/components/ui/ui-card',
      description: 'Fix ui-card component import'
    },
    {
      from: '@/lib/customers',
      to: '@/features/customers/services/customers',
      description: 'Fix customers service import'
    },
    {
      from: '../ui/alert',
      to: '@/components/ui/alert',
      description: 'Fix alert component import'
    },
    {
      from: './lib/services/credential-manager',
      to: '@/lib/services/credential-manager',
      description: 'Fix credential manager import'
    }
  ]
};

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  pathsFixed: 0,
  errors: []
};

// Map of path replacements to track which ones were used
const usedPathMaps = new Map(config.pathMaps.map(map => [map.from, { ...map, count: 0 }]));

/**
 * Recursively scan a directory for files to process
 */
async function scanDirectory(dirPath, excludes = config.excludeDirectories) {
  const files = [];
  
  try {
    const entries = await readdir(dirPath);
    
    for (const entry of entries) {
      if (excludes.includes(entry)) continue;
      
      const entryPath = path.join(dirPath, entry);
      const entryStat = await stat(entryPath);
      
      if (entryStat.isDirectory()) {
        const subFiles = await scanDirectory(entryPath, excludes);
        files.push(...subFiles);
      } else if (entryStat.isFile()) {
        const ext = path.extname(entryPath).toLowerCase();
        if (config.fileExtensions.includes(ext)) {
          files.push(entryPath);
        }
      }
    }
  } catch (error) {
    stats.errors.push(`Error scanning directory ${dirPath}: ${error.message}`);
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return files;
}

/**
 * Process a single file and fix import paths
 */
async function processFile(filePath) {
  try {
    stats.filesScanned++;
    
    // Read file content
    const content = await readFile(filePath, 'utf8');
    let modifiedContent = content;
    let fileModified = false;
    
    // Search for import patterns
    for (const pathMap of config.pathMaps) {
      // Need to escape special regex characters in the from path
      const escapedFrom = pathMap.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Look for different import patterns
      const importRegexes = [
        new RegExp(`import\\s+(?:.+?)\\s+from\\s+['"]${escapedFrom}['"]`, 'g'),
        new RegExp(`import\\s*{[^}]*}\\s*from\\s+['"]${escapedFrom}['"]`, 'g'),
        new RegExp(`import\\s+['"]${escapedFrom}['"]`, 'g'),
        new RegExp(`require\\(['"]${escapedFrom}['"]\\)`, 'g')
      ];
      
      for (const regex of importRegexes) {
        let match;
        
        // Use a copy of the content to prevent multiple replacements in same match
        const tempContent = modifiedContent;
        modifiedContent = tempContent.replace(regex, (match) => {
          stats.pathsFixed++;
          fileModified = true;
          const usedMap = usedPathMaps.get(pathMap.from);
          if (usedMap) {
            usedMap.count++;
          }
          
          return match.replace(new RegExp(escapedFrom, 'g'), pathMap.to);
        });
      }
    }
    
    // Write modified content if changed
    if (fileModified) {
      stats.filesModified++;
      
      if (config.verbose) {
        console.log(`Modified: ${path.relative(config.rootDir, filePath)}`);
      }
      
      if (!config.dryRun) {
        await writeFile(filePath, modifiedContent, 'utf8');
      }
    }
    
    return fileModified;
  } catch (error) {
    stats.errors.push(`Error processing file ${filePath}: ${error.message}`);
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}

/**
 * Main execution function
 */
async function fixImportPaths() {
  console.log(`
====================================================
          IMPORT PATH FIXER
====================================================
  `);
  
  console.log(`Root directory: ${config.rootDir}`);
  console.log(`Dry run: ${config.dryRun ? 'YES (no changes will be made)' : 'NO (files will be modified)'}`);
  console.log(`Verbose: ${config.verbose ? 'YES' : 'NO'}`);
  console.log(`\nScanning directories: ${config.scanDirectories.join(', ')}`);
  
  // Collect all files to process
  const filesToProcess = [];
  for (const dir of config.scanDirectories) {
    const dirPath = path.join(config.rootDir, dir);
    const files = await scanDirectory(dirPath);
    filesToProcess.push(...files);
  }
  
  console.log(`\nFound ${filesToProcess.length} files to process.`);
  console.log(`\nFixing import paths...`);
  
  // Process all files
  for (const file of filesToProcess) {
    await processFile(file);
    
    // Log progress for every 50 files
    if (stats.filesScanned % 50 === 0) {
      console.log(`Processed ${stats.filesScanned}/${filesToProcess.length} files...`);
    }
  }
  
  // Print summary
  console.log(`
====================================================
                  SUMMARY
====================================================

Files scanned: ${stats.filesScanned}
Files modified: ${stats.filesModified}
Paths fixed: ${stats.pathsFixed}
Errors: ${stats.errors.length}
  `);
  
  // Print used path mappings
  console.log(`
Path Mapping Usage:
----------------------------------------------------`);
  
  for (const [from, map] of usedPathMaps) {
    console.log(`${from} -> ${map.to}: ${map.count} occurrences`);
  }
  
  // Print errors if any
  if (stats.errors.length > 0) {
    console.log(`
Errors:
----------------------------------------------------`);
    
    for (const error of stats.errors) {
      console.log(`- ${error}`);
    }
  }
  
  console.log(`
====================================================
  `);
  
  if (config.dryRun) {
    console.log(`This was a dry run. No files were modified.`);
    console.log(`Run without --dry-run to apply changes.`);
  } else {
    console.log(`Import paths have been fixed.`);
  }
}

// Execute the script
fixImportPaths().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 