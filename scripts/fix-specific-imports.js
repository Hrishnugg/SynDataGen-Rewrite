/**
 * Fix Specific Component Import Paths Script
 * 
 * This script addresses specific import path issues for identified components
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

// Define known component mappings (component name -> correct subdirectory)
const COMPONENT_MAP = {
  // Marketing components
  'HeroSection': 'marketing',
  'FeaturesSection': 'marketing',
  'WaitlistSection': 'marketing',
  
  // Layout components
  'ClientSideLayout': 'layout',
  'Footer': 'layout',
  'Header': 'layout',
  'Navbar': 'layout',
  
  // UI components that may be directly imported
  'DreamyParticles': 'ui',
  
  // Other components
  'ClientOnly': 'common'
};

// Regex to match "@/components/ComponentName" without a subdirectory
const directImportRegex = /@\/components\/([A-Z][A-Za-z0-9_]+)(?:"|')/g;

/**
 * Scan source files for specific import errors
 */
async function scanSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let fixCount = 0;
  
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      fixCount += await scanSourceFiles(entryPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      const fileFixCount = await analyzeFile(entryPath);
      fixCount += fileFixCount;
    }
  }
  
  return fixCount;
}

/**
 * Analyze a file for incorrect import paths and fix them
 */
async function analyzeFile(filePath) {
  try {
    let content = await readFile(filePath, 'utf8');
    let originalContent = content;
    let fixCount = 0;
    
    // Find all direct imports to @/components/ComponentName
    let match;
    while ((match = directImportRegex.exec(content)) !== null) {
      const componentName = match[1];
      
      // Check if this component is in our map
      if (COMPONENT_MAP[componentName]) {
        const correctSubdir = COMPONENT_MAP[componentName];
        const originalImport = `@/components/${componentName}`;
        const correctedImport = `@/components/${correctSubdir}/${componentName}`;
        
        // Replace all occurrences in the content
        const importRegex = new RegExp(originalImport.replace('/', '\\/'), 'g');
        content = content.replace(importRegex, correctedImport);
        
        console.log(`In ${path.relative(rootDir, filePath)}:`);
        console.log(`  Changed: ${originalImport} → ${correctedImport}`);
        fixCount++;
      }
    }
    
    // Write changes if any were made
    if (originalContent !== content) {
      await writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed ${fixCount} imports in ${path.relative(rootDir, filePath)}`);
    }
    
    return fixCount;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
    return 0;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  console.log('🔍 Scanning source files for specific import path issues...');
  const fixCount = await scanSourceFiles(rootDir);
  
  console.log(`\n✨ Import path analysis complete! Fixed ${fixCount} import issues.`);
}

main().catch(console.error);
