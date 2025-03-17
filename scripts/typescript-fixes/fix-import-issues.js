/**
 * Fix Import Issues Script
 * 
 * This script helps identify and fix import issues in the codebase.
 * It corrects import paths, adds missing imports, and removes unused imports.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FILES_TO_FIX = [
  {
    path: 'src/app/dashboard/page.tsx',
    addImports: [
      "import { Project } from '@/lib/models/project';",
      "import { useRouter } from 'next/navigation';"
    ],
    removeImports: [
      /import\s+{\s*useRouter\s*}\s+from\s+['"]next\/router['"];/
    ]
  },
  {
    path: 'src/features/projects/components/ProjectList.tsx',
    addImports: [
      "import { Project } from '@/lib/models/project';",
      "import { useToast } from '@/components/ui/use-toast';"
    ],
    removeImports: [
      /import\s+{\s*toast\s*}\s+from\s+['"]react-toastify['"];/
    ]
  },
  {
    path: 'src/components/ui/ParticleBackground.tsx',
    addImports: [
      "import * as THREE from 'three';",
      "import { useEffect, useRef } from 'react';"
    ],
    fixImportPaths: [
      {
        pattern: /from\s+['"]\.\.\/utils\/([^'"]+)['"]/g,
        replacement: "from '@/lib/utils/$1'"
      }
    ]
  }
];

// Fix files
FILES_TO_FIX.forEach(file => {
  const filePath = path.join(process.cwd(), file.path);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remove imports if needed
  if (file.removeImports) {
    file.removeImports.forEach(importPattern => {
      const originalContent = content;
      content = content.replace(importPattern, '');
      if (content !== originalContent) {
        modified = true;
        console.log(`Removed import matching ${importPattern} from ${filePath}`);
      }
    });
  }
  
  // Fix import paths if needed
  if (file.fixImportPaths) {
    file.fixImportPaths.forEach(pathFix => {
      const originalContent = content;
      content = content.replace(pathFix.pattern, pathFix.replacement);
      if (content !== originalContent) {
        modified = true;
        console.log(`Fixed import paths in ${filePath}`);
      }
    });
  }
  
  // Add imports if needed
  if (file.addImports) {
    // Find the last import statement
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import '));
    
    if (importLines.length > 0) {
      const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
      const endOfLastImport = lastImportIndex + importLines[importLines.length - 1].length;
      
      // Add new imports after the last import
      const importsToAdd = file.addImports.filter(importStatement => 
        !content.includes(importStatement.replace(/\s+/g, ' ').trim())
      );
      
      if (importsToAdd.length > 0) {
        content = content.substring(0, endOfLastImport) + 
                  '\n' + importsToAdd.join('\n') + 
                  content.substring(endOfLastImport);
        modified = true;
        console.log(`Added imports to ${filePath}: ${importsToAdd.join(', ')}`);
      }
    } else {
      // No imports found, add at the top
      const importsToAdd = file.addImports.filter(importStatement => 
        !content.includes(importStatement.replace(/\s+/g, ' ').trim())
      );
      
      if (importsToAdd.length > 0) {
        content = importsToAdd.join('\n') + '\n\n' + content;
        modified = true;
        console.log(`Added imports to ${filePath}: ${importsToAdd.join(', ')}`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in: ${filePath}`);
  } else {
    console.log(`No import fixes needed for: ${filePath}`);
  }
});

// Run a script to find unused imports
console.log('\nChecking for unused imports...');
try {
  // This requires the TypeScript compiler to be installed
  const result = execSync('npx ts-prune', { encoding: 'utf8' });
  console.log('Unused exports found:');
  console.log(result);
} catch (error) {
  console.log('Error running ts-prune. You may need to install it with:');
  console.log('npm install -D ts-prune');
}

console.log('\nImport fixes completed. Please run TypeScript compiler to verify the changes.'); 