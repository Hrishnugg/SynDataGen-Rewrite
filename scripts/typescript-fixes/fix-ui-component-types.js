/**
 * Fix UI Component Types
 * 
 * This script addresses TypeScript issues in UI components:
 * 1. Missing or incorrect prop types
 * 2. Type mismatches in component props
 * 3. Implicit 'any' types in component callbacks
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
const FEATURES_DIR = path.join(SRC_DIR, 'features');

// Component files with type issues
const COMPONENT_FILES = {
  PAGINATION: path.join(COMPONENTS_DIR, 'ui/pagination.tsx'),
  UI_CARD: path.join(COMPONENTS_DIR, 'ui/ui-card.tsx'),
  ALERT: path.join(COMPONENTS_DIR, 'ui/alert.tsx'),
  RATE_LIMIT_INDICATOR: path.join(FEATURES_DIR, 'data-generation/components/dashboard/rate-limit-indicator.tsx'),
  DATA_TABLE: path.join(FEATURES_DIR, 'data-generation/components/data-viewer/data-table.tsx'),
  JOB_HISTORY_TABLE: path.join(FEATURES_DIR, 'data-generation/components/job-management/job-history-table.tsx'),
  PROJECT_JOBS: path.join(FEATURES_DIR, 'projects/components/project-detail/project-jobs.tsx'),
  PROJECT_SETTINGS: path.join(FEATURES_DIR, 'projects/components/project-detail/project-settings.tsx'),
  PROJECT_STATS: path.join(FEATURES_DIR, 'projects/components/project-detail/project-stats.tsx'),
  PROJECT_LIST: path.join(FEATURES_DIR, 'projects/components/ProjectList.tsx'),
};

/**
 * Fix pagination component types
 */
function fixPaginationComponent() {
  const filePath = COMPONENT_FILES.PAGINATION;
  console.log(`Fixing pagination component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add missing disabled prop to PaginationLink props
  content = content.replace(
    /interface PaginationLinkProps extends ButtonProps {/,
    `interface PaginationLinkProps extends ButtonProps {
  disabled?: boolean;`
  );
  
  // Fix "disabled" not found errors
  const matches = content.match(/disabled && "pointer-events-none opacity-50"/g);
  
  if (matches) {
    for (const match of matches) {
      content = content.replace(
        match,
        "disabled ? \"pointer-events-none opacity-50\" : \"\""
      );
    }
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed pagination component at ${filePath}`);
}

/**
 * Fix UI card component types
 */
function fixUICardComponent() {
  const filePath = COMPONENT_FILES.UI_CARD;
  console.log(`Fixing UI card component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix "Cannot assign to 'current' because it is a read-only property"
  content = content.replace(
    /cardRef\.current = node;/,
    "// Safe assignment to ref\nif (cardRef) { (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node; }"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed UI card component at ${filePath}`);
}

/**
 * Fix Alert component types
 */
function fixAlertComponent() {
  const filePath = COMPONENT_FILES.ALERT;
  console.log(`Fixing Alert component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add "warning" variant to Alert component
  content = content.replace(
    /const alertVariants = cva\(\s+"(.*?)"\s*,\s*{\s+variants:\s+{\s+variant:\s+{([\s\S]+?)}\s+},/m,
    (match, baseClass, variants) => {
      // Add warning variant if it doesn't exist
      if (!variants.includes('warning')) {
        const newVariants = variants + 
          ',\n      warning: "border border-warning/50 text-warning bg-warning/10 dark:border-warning [&>svg]:text-warning"';
        return `const alertVariants = cva(\n  "${baseClass}",\n  {\n    variants: {\n      variant: {${newVariants}}\n    },`;
      }
      return match;
    }
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Alert component at ${filePath}`);
}

/**
 * Fix RateLimitIndicator component
 */
function fixRateLimitIndicator() {
  const filePath = COMPONENT_FILES.RATE_LIMIT_INDICATOR;
  console.log(`Fixing RateLimitIndicator component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add missing types for RateLimitStatus
  if (!content.includes('export interface RateLimitStatus')) {
    const rateLimitStatusInterface = `
export interface RateLimitStatus {
  currentUsage: number;
  limit: number;
  resetTime?: string | number | Date;
  available?: boolean;
  limitReached?: boolean;
  refillTime?: string | number | Date;
  limitType?: string;
  description?: string;
}`;
    
    // Add the interface after imports
    content = content.replace(
      /import[^;]+;(\s+)/m,
      (match, spacing) => match + rateLimitStatusInterface + spacing
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed RateLimitIndicator component at ${filePath}`);
}

/**
 * Fix DataTable component
 */
function fixDataTable() {
  const filePath = COMPONENT_FILES.DATA_TABLE;
  console.log(`Fixing DataTable component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace PaginationLink with Button for disabled props
  content = content.replace(
    /<PaginationLink\s+onClick={\(\) => handlePreviousPage\(\)}\s+disabled={currentPage === 1}>/g,
    `<Button 
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => handlePreviousPage()}
                disabled={currentPage === 1}>`
  );
  
  content = content.replace(
    /<\/PaginationLink>/g,
    `</Button>`
  );
  
  content = content.replace(
    /<PaginationLink\s+onClick={\(\) => handleNextPage\(\)}\s+disabled={currentPage === totalPages}>/g,
    `<Button 
                variant="outline"
                size="sm"
                className="gap-1" 
                onClick={() => handleNextPage()}
                disabled={currentPage === totalPages}>`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed DataTable component at ${filePath}`);
}

/**
 * Fix JobHistoryTable component
 */
function fixJobHistoryTable() {
  const filePath = COMPONENT_FILES.JOB_HISTORY_TABLE;
  console.log(`Fixing JobHistoryTable component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix statusFilter type mismatch
  content = content.replace(
    /status: statusFilter \? statusFilter : undefined,/,
    `status: statusFilter && statusFilter !== 'all' ? statusFilter as ('running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'queued') : undefined,`
  );
  
  // Replace PaginationLink with Button for disabled props (similar to DataTable)
  content = content.replace(
    /<PaginationLink\s+onClick={\(\) => handlePreviousPage\(\)}\s+disabled={pagination\.currentPage === 1}>/g,
    `<Button 
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => handlePreviousPage()}
                disabled={pagination.currentPage === 1}>`
  );
  
  content = content.replace(
    /<PaginationLink\s+onClick={\(\) => handleNextPage\(\)}\s+disabled={pagination\.currentPage === pagination\.totalPages}>/g,
    `<Button 
                variant="outline"
                size="sm"
                className="gap-1" 
                onClick={() => handleNextPage()}
                disabled={pagination.currentPage === pagination.totalPages}>`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed JobHistoryTable component at ${filePath}`);
}

/**
 * Fix ProjectJobs component
 */
function fixProjectJobs() {
  const filePath = COMPONENT_FILES.PROJECT_JOBS;
  console.log(`Fixing ProjectJobs component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the implicit any in row parameter
  content = content.replace(
    /cell: \(\{ row \}\) =>/g,
    "cell: ({ row }: { row: any }) =>"
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ProjectJobs component at ${filePath}`);
}

/**
 * Fix ProjectSettings component
 */
function fixProjectSettings() {
  const filePath = COMPONENT_FILES.PROJECT_SETTINGS;
  console.log(`Fixing ProjectSettings component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix implicit any in err and i parameters
  content = content.replace(
    /{results\.errors\.map\(\(err, i\) => \(/g,
    "{results.errors.map((err: any, i: number) => ("
  );
  
  // Fix comparison type mismatch
  content = content.replace(
    /deletionStatus\.stage === 'complete'/g,
    "deletionStatus?.stage === 'complete'"
  );
  
  // Fix type mismatch in setStatus
  content = content.replace(
    /onValueChange={\(value\) => setStatus\(value as "active" \| "archived" \| "draft"\)}/g,
    'onValueChange={(value) => setStatus(value as "active" | "archived" | "deleted")}'
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ProjectSettings component at ${filePath}`);
}

/**
 * Fix ProjectStats component
 */
function fixProjectStats() {
  const filePath = COMPONENT_FILES.PROJECT_STATS;
  console.log(`Fixing ProjectStats component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace indicatorColor with indicatorClassName
  content = content.replace(
    /indicatorColor=\{([^}]+)\}/g,
    (match, color) => {
      return `indicatorClassName={${color} ? (${color} === "bg-destructive" ? "bg-destructive" : ${color} === "bg-warning" ? "bg-warning" : "") : ""}`;
    }
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ProjectStats component at ${filePath}`);
}

/**
 * Fix ProjectList component
 */
function fixProjectList() {
  const filePath = COMPONENT_FILES.PROJECT_LIST;
  console.log(`Fixing ProjectList component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix implicit any in err and i parameters
  content = content.replace(
    /{debugInfo\.errors\.map\(\(err, i\) => \(/g,
    "{debugInfo.errors.map((err: any, i: number) => ("
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ProjectList component at ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('Starting UI component type fixes...');
  
  try {
    // Fix components
    fixPaginationComponent();
    fixUICardComponent();
    fixAlertComponent();
    fixRateLimitIndicator();
    fixDataTable();
    fixJobHistoryTable();
    fixProjectJobs();
    fixProjectSettings();
    fixProjectStats();
    fixProjectList();
    
    // Run TypeScript compiler to check for errors
    console.log('Running TypeScript compiler to check for errors...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('TypeScript compilation successful!');
    } catch (error) {
      console.error('TypeScript compilation failed. Some manual fixes may be required.');
    }
    
    console.log('\nUI component type fixes completed!');
    console.log('\nManual steps that may be required:');
    console.log('1. Review error messages from TypeScript compiler');
    console.log('2. Fix any remaining type errors in UI components');
    console.log('3. Check for compatibility issues with component libraries');
    console.log('4. Ensure proper component interfaces for all components');
    
  } catch (error) {
    console.error('Error fixing UI component types:', error);
  }
}

// Run the script
main().catch(console.error); 