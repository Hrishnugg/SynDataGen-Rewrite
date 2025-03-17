/**
 * Fix Missing Return Types Script
 * 
 * This script helps identify and fix missing return types in functions.
 * It adds explicit return type annotations to functions that are missing them.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FILES_TO_FIX = [
  {
    path: 'src/components/ui/ParticleBackground.tsx',
    functionPatterns: [
      {
        // Find function without return type
        pattern: /function\s+(\w+)\s*\(([^)]*)\)\s*{/g,
        getReturnType: (functionName, params) => {
          // Determine return type based on function name
          if (functionName === 'ParticleBackground') {
            return 'JSX.Element';
          } else if (functionName.startsWith('init') || 
                    functionName.startsWith('setup') || 
                    functionName.startsWith('create')) {
            return 'void';
          } else if (functionName.startsWith('get') || 
                    functionName.startsWith('calculate') || 
                    functionName.startsWith('compute')) {
            return 'any'; // This will need manual review
          } else if (functionName.startsWith('handle') || 
                    functionName.startsWith('on')) {
            return 'void';
          } else {
            return 'unknown'; // This will need manual review
          }
        }
      },
      {
        // Find arrow functions without return type
        pattern: /const\s+(\w+)\s*=\s*(\([^)]*\))\s*=>\s*{/g,
        getReturnType: (functionName, params) => {
          // Determine return type based on function name
          if (functionName.includes('Effect') || 
              functionName.startsWith('use')) {
            return 'void';
          } else if (functionName.startsWith('handle') || 
                    functionName.startsWith('on')) {
            return 'void';
          } else if (functionName.startsWith('get') || 
                    functionName.startsWith('calculate') || 
                    functionName.startsWith('compute')) {
            return 'any'; // This will need manual review
          } else {
            return 'unknown'; // This will need manual review
          }
        }
      }
    ]
  },
  {
    path: 'src/lib/utils/key-fixer.ts',
    functionPatterns: [
      {
        // Find exported functions without return type
        pattern: /export\s+function\s+(\w+)\s*\(([^)]*)\)\s*{/g,
        getReturnType: (functionName, params) => {
          if (functionName === 'fixPrivateKey') {
            return 'string';
          } else if (functionName === 'diagnosePrivateKey') {
            return '{ issues: string[], isValid: boolean }';
          } else if (functionName === 'isValidPrivateKey') {
            return 'boolean';
          } else {
            return 'unknown'; // This will need manual review
          }
        }
      }
    ]
  },
  {
    path: 'src/lib/utils/utils.ts',
    functionPatterns: [
      {
        // Find the cn function without return type
        pattern: /export\s+function\s+cn\s*\(([^)]*)\)\s*{/g,
        getReturnType: () => 'string'
      }
    ]
  },
  {
    path: 'src/components/three/VanillaThreeBackground.tsx',
    functionPatterns: [
      {
        // Find the component function without return type
        pattern: /export\s+default\s+function\s+VanillaThreeBackground\s*\(\s*\)\s*{/g,
        getReturnType: () => 'JSX.Element'
      },
      {
        // Find arrow functions without return type
        pattern: /const\s+(\w+)\s*=\s*(\([^)]*\))\s*=>\s*{/g,
        getReturnType: (functionName, params) => {
          if (functionName === 'handleResize') {
            return 'void';
          } else if (functionName === 'animate') {
            return 'void';
          } else {
            return 'unknown'; // This will need manual review
          }
        }
      }
    ]
  },
  {
    path: 'src/components/three/ThreePlaceholder.tsx',
    functionPatterns: [
      {
        // Find the component function without return type
        pattern: /export\s+const\s+ThreePlaceholder\s*=\s*\(\s*\)\s*=>\s*{/g,
        getReturnType: () => 'JSX.Element'
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
  
  // Apply function return type fixes
  file.functionPatterns.forEach(pattern => {
    const matches = [...content.matchAll(pattern.pattern)];
    
    // Process matches in reverse order to avoid offset issues
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const fullMatch = match[0];
      const functionName = match[1];
      const params = match[2];
      
      // Get return type for this function
      const returnType = pattern.getReturnType(functionName, params);
      
      // Replace the function declaration with one that includes return type
      const replacement = fullMatch.replace(
        new RegExp(`${functionName}\\s*\\(${params.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*{`),
        `${functionName}(${params}): ${returnType} {`
      );
      
      // Apply the replacement
      content = content.substring(0, match.index) + 
                replacement + 
                content.substring(match.index + fullMatch.length);
      
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed return types in: ${filePath}`);
  } else {
    console.log(`No return type fixes needed for: ${filePath}`);
  }
});

console.log('\nReturn type fixes completed. Please review the changes and run TypeScript compiler to verify them.'); 