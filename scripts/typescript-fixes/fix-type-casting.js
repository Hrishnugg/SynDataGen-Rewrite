/**
 * Fix Type Casting Script
 * 
 * This script helps identify and fix type casting issues in the codebase.
 * It replaces unsafe type assertions with safer alternatives.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FILES_TO_FIX = [
  {
    path: 'src/lib/firebase/auth.ts',
    replacements: [
      {
        // Replace unsafe type assertions with safer alternatives
        pattern: /as\s+any/g,
        replacement: 'as unknown'
      },
      {
        // Replace specific type assertions with proper types
        pattern: /user\s+as\s+any/g,
        replacement: 'user as FirebaseUser'
      },
      {
        // Replace specific type assertions with proper types
        pattern: /error\s+as\s+any/g,
        replacement: 'error as FirebaseError'
      }
    ],
    imports: [
      {
        // Add import for FirebaseUser if not present
        check: /FirebaseUser/,
        import: "import { User as FirebaseUser } from 'firebase/auth';"
      },
      {
        // Add import for FirebaseError if not present
        check: /FirebaseError/,
        import: "import { FirebaseError } from 'firebase/app';"
      }
    ]
  },
  {
    path: 'src/app/auth-diagnostic/page.tsx',
    replacements: [
      {
        // Replace unsafe type assertions with safer alternatives
        pattern: /as\s+any/g,
        replacement: 'as unknown'
      },
      {
        // Replace specific type assertions with proper types
        pattern: /data\s+as\s+any/g,
        replacement: 'data as AuthDiagnosticApiResponse'
      }
    ],
    imports: [
      {
        // Add import for AuthDiagnosticApiResponse if not present
        check: /AuthDiagnosticApiResponse/,
        import: "import { AuthDiagnosticApiResponse } from '@/types/api-responses';"
      }
    ]
  },
  {
    path: 'src/features/projects/components/ProjectList.tsx',
    replacements: [
      {
        // Replace unsafe type assertions with safer alternatives
        pattern: /as\s+any/g,
        replacement: 'as unknown'
      },
      {
        // Replace specific type assertions with proper types
        pattern: /projects\s+as\s+any\[\]/g,
        replacement: 'projects as Project[]'
      },
      {
        // Replace specific type assertions with proper types
        pattern: /error\s+as\s+any/g,
        replacement: 'error as Error'
      }
    ],
    imports: [
      {
        // Add import for Project if not present
        check: /import.*Project/,
        import: "import { Project } from '@/lib/models/project';"
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
  
  // Add imports if needed
  if (file.imports) {
    file.imports.forEach(importInfo => {
      if (!importInfo.check.test(content)) {
        // Add import at the top of the file
        const importLines = content.split('\n').filter(line => line.trim().startsWith('import '));
        const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
        
        if (lastImportIndex !== -1) {
          const endOfLastImport = lastImportIndex + importLines[importLines.length - 1].length;
          content = content.substring(0, endOfLastImport) + 
                    '\n' + importInfo.import + 
                    content.substring(endOfLastImport);
          modified = true;
        } else {
          // No imports found, add at the top
          content = importInfo.import + '\n' + content;
          modified = true;
        }
      }
    });
  }
  
  // Apply replacements
  if (file.replacements) {
    file.replacements.forEach(replacement => {
      const originalContent = content;
      content = content.replace(replacement.pattern, replacement.replacement);
      if (content !== originalContent) {
        modified = true;
      }
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed type casting in: ${filePath}`);
  } else {
    console.log(`No type casting fixes needed for: ${filePath}`);
  }
});

console.log('\nType casting fixes completed. Please run TypeScript compiler to verify the changes.'); 