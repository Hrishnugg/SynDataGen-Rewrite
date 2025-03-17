/**
 * Fix Component Import Paths Script
 * 
 * This script helps identify and fix incorrect component import paths in the codebase.
 * It looks for imports that directly reference components from the root components directory
 * when those components are actually located in subdirectories.
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Define the root directory
const rootDir = path.resolve(__dirname, '../src');
const componentsDir = path.resolve(rootDir, 'components');

// Track components and their locations
const componentMap = new Map();

// Simplified regex pattern to find import statements with @/components
const importFromComponentsRegex = /from\s+["']@\/components\/([^'"\/]+)["']/g;

/**
 * Find all component files recursively in the components directory
 */
async function findComponentFiles(dir, relativePath = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    const entryRelativePath = path.join(relativePath, entry.name);
    
    if (entry.isDirectory()) {
      await findComponentFiles(entryPath, entryRelativePath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      // Store the component name and its relative path
      const componentName = path.basename(entry.name, path.extname(entry.name));
      
      // Use the directory structure to determine the correct import path
      const dirPart = relativePath ? relativePath.split(path.sep)[0] : '';
      
      if (dirPart) {
        componentMap.set(componentName, dirPart);
        console.log(`Found component: ${componentName} in ${dirPart}`);
      }
    }
  }
}

/**
 * Scan source files for potential import errors
 */
async function scanSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await scanSourceFiles(entryPath);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      await analyzeFile(entryPath);
    }
  }
}

/**
 * Analyze a file for incorrect import paths
 */
async function analyzeFile(filePath) {
  try {
    let content = await readFile(filePath, 'utf8');
    let hasChanges = false;
    
    // Use a simpler approach to find and replace import statements
    let match;
    while ((match = importFromComponentsRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const componentName = match[1];
      
      if (componentMap.has(componentName)) {
        const correctDir = componentMap.get(componentName);
        const correctedImport = fullMatch.replace(
          `@/components/${componentName}`,
          `@/components/${correctDir}/${componentName}`
        );
        
        console.log(`\nIn ${path.relative(rootDir, filePath)}:`);
        console.log(`  Original: ${fullMatch}`);
        console.log(`  Corrected: ${correctedImport}`);
        
        // Replace the import statement in the content
        content = content.replace(
          fullMatch,
          correctedImport
        );
        hasChanges = true;
      }
    }
    
    // Write changes if any were made
    if (hasChanges) {
      await writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed imports in ${path.relative(rootDir, filePath)}`);
    }
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
  }
}

/**
 * Main function to run the script
 */
async function main() {
  console.log('🔍 Scanning components directory to build component map...');
  await findComponentFiles(componentsDir);
  
  console.log('\n📝 Analyzing source files for incorrect import paths...');
  await scanSourceFiles(rootDir);
  
  console.log('\n✨ Import path analysis complete!');
}

main().catch(console.error);
