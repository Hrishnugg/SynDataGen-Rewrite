/**
 * Component Props Fixer
 * 
 * This script identifies and fixes common TypeScript errors related to component props,
 * such as missing variants, incorrect prop types, and ref handling issues.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Configuration
const config = {
  rootDir: path.resolve(__dirname, '..'),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  componentFixes: [
    // Badge component - add success variant
    {
      path: 'src/components/ui/badge.tsx',
      description: 'Add success variant to Badge component',
      find: /variant: {\s*default:[^,}]+(,[^}]+)*\s*},/gs,
      replace: (match) => {
        if (match.includes('success:')) {
          return match; // Already has success variant
        }
        return match.replace(/(\s*})/, ',\n        success: "bg-success text-success-foreground"$1');
      }
    },
    // Progress component - add indicatorClassName or fix indicatorColor
    {
      path: 'src/components/ui/progress.tsx',
      description: 'Add indicatorColor support to Progress component',
      find: /interface ProgressProps[^{]*{[^}]*}/gs,
      replace: (match) => {
        if (match.includes('indicatorColor?:')) {
          return match; // Already has indicatorColor
        }
        return match.replace(/(\s*})/, '\n  indicatorColor?: string;$1');
      }
    },
    // Pagination link - add disabled prop
    {
      path: 'src/components/ui/pagination.tsx',
      description: 'Add disabled prop to PaginationLink component',
      find: /interface PaginationLinkProps[^{]*{[^}]*}/gs,
      replace: (match) => {
        if (match.includes('disabled?:')) {
          return match; // Already has disabled prop
        }
        return match.replace(/(\s*})/, '\n  disabled?: boolean;$1');
      }
    },
    // Also update the PaginationLink function to use the disabled prop
    {
      path: 'src/components/ui/pagination.tsx',
      description: 'Update PaginationLink to handle disabled prop',
      find: /const PaginationLink = \(\{[^}]*\}: PaginationLinkProps\) => {/g,
      replace: (match) => {
        if (match.includes('disabled,')) {
          return match; // Already has disabled prop
        }
        return match.replace(/\(\{([^}]*)\}: PaginationLinkProps\)/, '({$1, disabled,}: PaginationLinkProps)');
      }
    },
    // Pass disabled to Button in PaginationLink
    {
      path: 'src/components/ui/pagination.tsx',
      description: 'Pass disabled prop to Button in PaginationLink',
      find: /<Button\s*[^>]*aria-current=[^>]*>/g,
      replace: (match) => {
        if (match.includes('disabled={disabled}')) {
          return match; // Already passing disabled
        }
        return match.replace(/aria-current={([^}]*)}/g, 'aria-current={$1}\n      disabled={disabled}');
      }
    },
    // Update Button className in PaginationLink to include disabled styles
    {
      path: 'src/components/ui/pagination.tsx',
      description: 'Add disabled styles to PaginationLink',
      find: /className={\s*cn\([^)]*\)\s*}/g,
      replace: (match) => {
        if (match.includes('disabled &&')) {
          return match; // Already has disabled styles
        }
        return match.replace(/className={\s*cn\(([^)]*)\)\s*}/g, 'className={cn($1,\n        disabled && "pointer-events-none opacity-50")}');
      }
    },
    // Fix the ui-card.tsx ref issue
    {
      path: 'src/components/ui/ui-card.tsx',
      description: 'Fix ref assignment in ui-card.tsx',
      find: /cardRef\.current = node;/g,
      replace: `// Use a safe ref callback approach
if (cardRef && typeof cardRef === 'object') {
  // Only assign if it's a RefObject
  cardRef.current = node;
}`
    },
    // Fix JobMetadata in mock-service.ts
    {
      path: 'src/features/data-generation/services/mock-service.ts',
      description: 'Add required properties to JobMetadata in mock-service',
      find: /metadata: {},/g,
      replace: `metadata: {
      inputSize: 0,
      retryCount: 0,
      // Include other required properties
    },`
    },
    // Update JobStatusFilter type in job-history-table.tsx
    {
      path: 'src/features/data-generation/components/job-management/job-history-table.tsx',
      description: 'Update JobStatusFilter type to include "all"',
      find: /type\s+JobStatusFilter\s*=\s*JobStatus\['status'\]\s*;/g,
      replace: `type JobStatusFilter = JobStatus['status'] | 'all';`
    },
    // If the type doesn't exist, look for where the status filter is used
    {
      path: 'src/features/data-generation/components/job-management/job-history-table.tsx',
      description: 'Fix status filter usage',
      find: /const\s+\[\s*statusFilter\s*,\s*setStatusFilter\s*\]\s*=\s*useState[^;]*;/g,
      replace: (match) => {
        if (match.includes('JobStatusFilter')) {
          return match; // Already correctly typed
        }
        return match.replace(/useState[^<]*(<[^>]*>)?/g, 'useState<JobStatus["status"] | "all" | undefined>');
      }
    }
  ]
};

// Statistics
const stats = {
  filesScanned: 0,
  filesModified: 0,
  componentFixesApplied: 0,
  errors: []
};

/**
 * Process a component fix
 */
async function processComponentFix(fix) {
  try {
    stats.filesScanned++;
    const filePath = path.join(config.rootDir, fix.path);
    
    console.log(`Processing fix for file: ${fix.path}`);
    
    // Check if file exists
    try {
      await stat(filePath);
      console.log(`- File exists, applying ${fix.description}`);
    } catch (error) {
      console.error(`- Error: File not found: ${fix.path}`);
      stats.errors.push(`File not found: ${fix.path}`);
      return false;
    }
    
    // Read file content
    const content = await readFile(filePath, 'utf8');
    console.log(`- File read successfully (${content.length} bytes)`);
    
    // Apply the fix
    let modifiedContent;
    
    if (typeof fix.replace === 'function') {
      modifiedContent = content.replace(fix.find, fix.replace);
    } else {
      modifiedContent = content.replace(fix.find, fix.replace);
    }
    
    // Check if the file was modified
    if (content !== modifiedContent) {
      stats.filesModified++;
      stats.componentFixesApplied++;
      
      console.log(`- Applied "${fix.description}" to ${fix.path}`);
      
      if (!config.dryRun) {
        await writeFile(filePath, modifiedContent, 'utf8');
        console.log(`- File written`);
      } else {
        console.log(`- (Dry run: file would be written)`);
      }
      
      return true;
    } else {
      console.log(`- No changes needed for ${fix.path} (pattern not found or already fixed)`);
    }
    
    return false;
  } catch (error) {
    console.error(`- Error processing component fix for ${fix.path}:`, error);
    stats.errors.push(`Error processing component fix for ${fix.path}: ${error.message}`);
    return false;
  }
}

/**
 * Main execution function
 */
async function fixComponentProps() {
  console.log(`
====================================================
           COMPONENT PROPS FIXER
====================================================
  `);
  
  console.log(`Root directory: ${config.rootDir}`);
  console.log(`Dry run: ${config.dryRun ? 'YES (no changes will be made)' : 'NO (files will be modified)'}`);
  console.log(`Verbose: ${config.verbose ? 'YES' : 'NO'}`);
  console.log(`\nProcessing ${config.componentFixes.length} component fixes...`);
  
  // Process all component fixes
  for (const fix of config.componentFixes) {
    await processComponentFix(fix);
  }
  
  // Print summary
  console.log(`
====================================================
                  SUMMARY
====================================================

Files scanned: ${stats.filesScanned}
Files modified: ${stats.filesModified}
Component fixes applied: ${stats.componentFixesApplied}
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
    console.log(`Component prop issues have been fixed.`);
  }
}

// Execute the script
fixComponentProps().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 