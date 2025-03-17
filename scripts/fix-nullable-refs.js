/**
 * Nullable References Fixer
 * 
 * This script identifies and fixes common TypeScript errors related to nullable
 * references, adding optional chaining or null checks where needed.
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
  fileExtensions: ['.ts', '.tsx'],
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  focusFiles: process.argv.includes('--focus-specific-files'),
  specificFiles: [
    'src/components/three/VanillaThreeBackground.tsx',
    'src/components/three/VanillaThreeDecagon.tsx',
    'src/components/ui/ParticleBackground.tsx',
    'src/components/ui/ui-card.tsx',
    'src/scripts/create-test-data.ts',
    'src/scripts/firestore-test.ts'
  ]
};

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  issuesFixed: {
    optionalChaining: 0,
    nullChecks: 0,
    typeAssertions: 0,
    typeGuards: 0,
    total: 0
  },
  errors: []
};

// Patterns to search for and fix
const patterns = [
  // Container Ref Null Access (VanillaThreeBackground, VanillaThreeDecagon)
  {
    description: "containerRef.current access without null check",
    regex: /(\w+Ref)\.current\.([\w]+)/g,
    replacement: (match, refName, prop) => `${refName}.current?.${prop}`,
    type: 'optionalChaining'
  },
  // Container Ref appendChild/removeChild (VanillaThreeBackground, VanillaThreeDecagon)
  {
    description: "containerRef.current appendChild/removeChild",
    regex: /(const|let|var)?\s*(\w+Ref)\.current\.(appendChild|removeChild)\((.*?)\)/g,
    replacement: (match, declType, refName, method, args) => {
      if (declType) {
        return `${declType} ${refName}.current?.${method}(${args})`;
      }
      return `${refName}.current?.${method}(${args})`;
    },
    type: 'optionalChaining'
  },
  // container.firstChild (VanillaThreeBackground, VanillaThreeDecagon)
  {
    description: "containerRef.current.firstChild",
    regex: /while\s*\((\w+Ref)\.current\.firstChild\)/g,
    replacement: (match, refName) => `while (${refName}.current && ${refName}.current.firstChild)`,
    type: 'nullChecks'
  },
  // Material uniforms (ParticleBackground)
  {
    description: "Material uniforms access",
    regex: /(\w+)\.material\.uniforms/g,
    replacement: (match, objName) => `(${objName}.material as THREE.ShaderMaterial).uniforms`,
    type: 'typeAssertions'
  },
  // Material dispose (ParticleBackground)
  {
    description: "Material dispose",
    regex: /(\w+)\.material\.dispose\(\)/g,
    replacement: (match, objName) => {
      return `// Handle both single material and array of materials
if (Array.isArray(${objName}.material)) {
  ${objName}.material.forEach(m => m.dispose());
} else {
  ${objName}.material.dispose()
}`;
    },
    type: 'typeGuards'
  },
  // db. calls (create-test-data, firestore-test)
  {
    description: "Database calls without null check",
    regex: /(\s*)(await\s+)?db\.(collection|listCollections|runTransaction|batch)/g,
    replacement: (match, indent, awaitStr, method) => {
      if (!awaitStr) awaitStr = '';
      return `${indent}if (db) {
${indent}  ${awaitStr}db.${method}`;
    },
    requiresClosingBrace: true,
    type: 'nullChecks'
  }
];

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
 * Process a single file and fix nullable reference issues
 */
async function processFile(filePath) {
  try {
    stats.filesScanned++;
    
    // Read file content
    const content = await readFile(filePath, 'utf8');
    let modifiedContent = content;
    let fileModified = false;
    
    // Special handling for files that require import additions
    const fileName = path.basename(filePath);
    if (fileName === 'ParticleBackground.tsx') {
      // Add THREE imports if not already present
      if (!modifiedContent.includes('import * as THREE')) {
        modifiedContent = modifiedContent.replace(
          /import {([^}]+)} from ['"]three['"]/,
          `import * as THREE from 'three';\nimport {$1} from 'three'`
        );
        
        if (!modifiedContent.includes('import * as THREE')) {
          modifiedContent = `import * as THREE from 'three';\n${modifiedContent}`;
          fileModified = true;
        }
      }
    }
    
    // Apply each pattern
    let requiresClosingBraces = [];
    
    for (const pattern of patterns) {
      let match;
      let contentBeforeReplacements = modifiedContent;
      let replacementsMade = false;
      
      // Reset regex lastIndex to ensure we start from the beginning
      pattern.regex.lastIndex = 0;
      
      // For patterns requiring closing braces, we need to handle them differently
      if (pattern.requiresClosingBrace) {
        let lines = modifiedContent.split('\n');
        let newLines = [];
        let inDbBlock = false;
        let indentation = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = pattern.regex.exec(line);
          
          if (match) {
            // Store the indentation level
            indentation = match[1] || '';
            
            // Replace the line with the conditional version
            const replacedLine = line.replace(pattern.regex, pattern.replacement);
            newLines.push(replacedLine);
            inDbBlock = true;
            replacementsMade = true;
            stats.issuesFixed[pattern.type]++;
            stats.issuesFixed.total++;
          } else if (inDbBlock && line.trim() === '') {
            // End the block when we hit an empty line
            newLines.push(`${indentation}}`);
            newLines.push('');
            inDbBlock = false;
          } else {
            newLines.push(line);
          }
        }
        
        // Make sure to close any open blocks at the end of the file
        if (inDbBlock) {
          newLines.push(`${indentation}}`);
        }
        
        modifiedContent = newLines.join('\n');
      } else {
        // Regular replacements without special handling
        modifiedContent = modifiedContent.replace(pattern.regex, function() {
          const args = Array.from(arguments);
          const replacement = pattern.replacement.apply(null, args);
          
          replacementsMade = true;
          stats.issuesFixed[pattern.type]++;
          stats.issuesFixed.total++;
          
          return replacement;
        });
      }
      
      if (replacementsMade) {
        fileModified = true;
        
        if (config.verbose) {
          console.log(`Applied "${pattern.description}" to ${path.relative(config.rootDir, filePath)}`);
        }
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
async function fixNullableRefs() {
  console.log(`
====================================================
        NULLABLE REFERENCES FIXER
====================================================
  `);
  
  console.log(`Root directory: ${config.rootDir}`);
  console.log(`Dry run: ${config.dryRun ? 'YES (no changes will be made)' : 'NO (files will be modified)'}`);
  console.log(`Verbose: ${config.verbose ? 'YES' : 'NO'}`);
  
  let filesToProcess = [];
  
  // If --focus-specific-files is provided, only process those specific files
  if (config.focusFiles) {
    console.log(`\nFocusing on specific files with known issues:`);
    
    for (const specificFile of config.specificFiles) {
      const fullPath = path.join(config.rootDir, specificFile);
      try {
        await stat(fullPath);
        filesToProcess.push(fullPath);
        console.log(`- ${specificFile}`);
      } catch (error) {
        console.warn(`Warning: Could not find specific file: ${specificFile}`);
      }
    }
  } else {
    console.log(`\nScanning directories: ${config.scanDirectories.join(', ')}`);
    
    // Collect all files to process
    for (const dir of config.scanDirectories) {
      const dirPath = path.join(config.rootDir, dir);
      const files = await scanDirectory(dirPath);
      filesToProcess.push(...files);
    }
  }
  
  console.log(`\nFound ${filesToProcess.length} files to process.`);
  console.log(`\nFixing nullable reference issues...`);
  
  // Process all files
  for (const file of filesToProcess) {
    await processFile(file);
    
    // Log progress for every 50 files if not in specific files mode
    if (!config.focusFiles && stats.filesScanned % 50 === 0) {
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
Issues fixed: ${stats.issuesFixed.total}
  - Optional chaining: ${stats.issuesFixed.optionalChaining}
  - Null checks: ${stats.issuesFixed.nullChecks}
  - Type assertions: ${stats.issuesFixed.typeAssertions}
  - Type guards: ${stats.issuesFixed.typeGuards}
Errors: ${stats.errors.length}
  `);
  
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
    console.log(`Nullable reference issues have been fixed.`);
  }
}

// Execute the script
fixNullableRefs().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 