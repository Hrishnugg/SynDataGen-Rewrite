/**
 * Directory Structure Mapper
 * 
 * This script traverses the entire codebase and generates a markdown file
 * containing the full directory structure to help with the TypeScript path
 * reorganization efforts.
 */

const fs = require('fs');
const path = require('path');

// Directories to exclude from the mapping
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  '.vercel',
  '.cursor'
];

// File types to include in the detailed mapping (empty array means all files)
const INCLUDE_EXTENSIONS = [
  '.ts', 
  '.tsx', 
  '.js', 
  '.jsx', 
  '.json'
];

// Configuration
const config = {
  rootDir: path.resolve(__dirname, '..'),
  outputFile: path.resolve(__dirname, '../DIRECTORY_STRUCTURE.md'),
  maxDepth: 10, // Maximum directory depth to traverse
  includeFiles: true,
  detailedFileInfo: true // Include file size and content preview for key files
};

// Track statistics
const stats = {
  totalDirs: 0,
  totalFiles: 0,
  tsFiles: 0,
  jsFiles: 0,
  jsonFiles: 0
};

/**
 * Format a file size in a human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Check if a file's extension is included in the detailed mapping
 */
function shouldIncludeFile(filePath) {
  if (INCLUDE_EXTENSIONS.length === 0) return true;
  const ext = path.extname(filePath).toLowerCase();
  return INCLUDE_EXTENSIONS.includes(ext);
}

/**
 * Recursively map a directory structure
 */
function mapDirectory(dirPath, indent = 0, depth = 0) {
  if (depth > config.maxDepth) return '';
  
  const relativePath = path.relative(config.rootDir, dirPath);
  const displayPath = relativePath || '.';
  
  let output = `${'  '.repeat(indent)}* **${path.basename(dirPath)}** (${displayPath}/)\\n`;
  stats.totalDirs++;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    // Process directories first
    const directories = items
      .filter(item => {
        const itemPath = path.join(dirPath, item);
        return fs.statSync(itemPath).isDirectory() && !EXCLUDED_DIRS.includes(item);
      })
      .sort();
    
    for (const dir of directories) {
      output += mapDirectory(path.join(dirPath, dir), indent + 1, depth + 1);
    }
    
    // Then process files if configured to do so
    if (config.includeFiles) {
      const files = items
        .filter(item => {
          const itemPath = path.join(dirPath, item);
          return fs.statSync(itemPath).isFile() && shouldIncludeFile(itemPath);
        })
        .sort();
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const fileStats = fs.statSync(filePath);
        stats.totalFiles++;
        
        // Update stats based on file extension
        const ext = path.extname(file).toLowerCase();
        if (ext === '.ts' || ext === '.tsx') stats.tsFiles++;
        else if (ext === '.js' || ext === '.jsx') stats.jsFiles++;
        else if (ext === '.json') stats.jsonFiles++;
        
        if (config.detailedFileInfo) {
          const fileSize = formatFileSize(fileStats.size);
          output += `${'  '.repeat(indent + 1)}* \`${file}\` (${fileSize})\\n`;
        } else {
          output += `${'  '.repeat(indent + 1)}* \`${file}\`\\n`;
        }
      }
    }
    
    return output;
  } catch (error) {
    return `${'  '.repeat(indent + 1)}* Error reading directory: ${error.message}\\n`;
  }
}

/**
 * Generate a markdown table of statistics
 */
function generateStats() {
  return `
## Project Statistics

| Metric | Count |
|--------|-------|
| Total Directories | ${stats.totalDirs} |
| Total Files (tracked types) | ${stats.totalFiles} |
| TypeScript Files (.ts, .tsx) | ${stats.tsFiles} |
| JavaScript Files (.js, .jsx) | ${stats.jsFiles} |
| JSON Files | ${stats.jsonFiles} |
`;
}

/**
 * Main execution function
 */
function generateDirectoryStructure() {
  console.log('Mapping directory structure...');
  
  const header = `# Project Directory Structure

> Generated on ${new Date().toLocaleString()}

This document maps the entire project structure to assist with TypeScript path resolution and codebase navigation.

`;
  
  const structureContent = mapDirectory(config.rootDir);
  const statsContent = generateStats();
  
  const fullContent = `${header}${statsContent}

## Directory Tree
  
${structureContent}`;
  
  fs.writeFileSync(config.outputFile, fullContent);
  
  console.log(`
Directory structure mapped successfully!
Output saved to: ${config.outputFile}
  
Statistics:
- Total directories: ${stats.totalDirs}
- Total files (tracked): ${stats.totalFiles}
- TypeScript files: ${stats.tsFiles}
- JavaScript files: ${stats.jsFiles}
- JSON files: ${stats.jsonFiles}
  `);
}

// Execute the script
generateDirectoryStructure(); 