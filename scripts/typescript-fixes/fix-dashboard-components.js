/**
 * Fix Dashboard Components TypeScript Issues
 * 
 * This script addresses TypeScript issues in dashboard components:
 * 1. Unsafe type assertions using (session?.user as any)?.role
 * 2. Missing return type annotations for components
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const FEATURES_DIR = path.join(SRC_DIR, 'features');
const DASHBOARD_DIR = path.join(FEATURES_DIR, 'dashboard/components');

// Files to modify
const FILES_TO_CHECK = [
  'src/features/dashboard/components/DashboardHeader.tsx',
  'src/features/dashboard/components/DashboardSidebar.tsx',
  'src/features/dashboard/components/DashboardLayoutManager.tsx',
  'src/features/dashboard/components/CustomerServiceAccountPanel.tsx'
];

/**
 * Create a User type file if it doesn't exist
 */
function createUserTypeFile() {
  console.log('Creating User type file...');
  
  const typeDir = path.join(SRC_DIR, 'types');
  if (!fs.existsSync(typeDir)) {
    fs.mkdirSync(typeDir, { recursive: true });
  }
  
  const userTypePath = path.join(typeDir, 'user.ts');
  
  // Only create the file if it doesn't exist
  if (!fs.existsSync(userTypePath)) {
    const userTypeContent = `/**
 * User Types
 * 
 * Type definitions for user-related data structures
 */

import { DefaultSession } from "next-auth";

/**
 * Extended user type with additional properties
 */
export interface ExtendedUser extends DefaultSession["user"] {
  id?: string;
  role?: "admin" | "user" | "guest";
  permissions?: string[];
  customerId?: string;
}

/**
 * Extended session type with the extended user
 */
declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}
`;
  
    fs.writeFileSync(userTypePath, userTypeContent);
    console.log(`Created User type file at ${userTypePath}`);
  } else {
    console.log(`User type file already exists at ${userTypePath}`);
  }
}

/**
 * Fix unsafe type assertions and add return types
 */
function fixDashboardComponents() {
  console.log('Fixing dashboard components...');
  
  FILES_TO_CHECK.forEach(filePath => {
    const fullPath = path.join(ROOT_DIR, filePath);
    
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Add import for ExtendedUser if not present
      if (!content.includes('import { ExtendedUser }') && 
          (content.includes('as any')?.role') || content.includes('session?.user'))) {
        const importStatement = `import { ExtendedUser } from "@/types/user";`;
        
        // Add after the last import statement
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const endOfImportLine = content.indexOf('\n', lastImportIndex) + 1;
          content = content.slice(0, endOfImportLine) + importStatement + '\n' + content.slice(endOfImportLine);
          modified = true;
        }
      }
      
      // Replace unsafe type assertions
      if (content.includes('session?.user as any')) {
        content = content.replace(
          /\(session\?\.user as any\)\?\.role/g,
          'session?.user?.role'
        );
        modified = true;
      }
      
      // Add return type for component
      if (content.includes('export default function') && !content.includes('): React.ReactNode')) {
        content = content.replace(
          /export default function (\w+)\s*\(/g,
          'export default function $1(): React.ReactNode ('
        );
        modified = true;
      }
      
      if (content.includes('const DashboardSidebar = () =>') && !content.includes(': React.ReactNode')) {
        content = content.replace(
          /const (\w+) = \(\) =>/g,
          'const $1 = (): React.ReactNode =>'
        );
        modified = true;
      }
      
      // Add React import if not present and we added ReactNode
      if (modified && content.includes(': React.ReactNode') && !content.includes('import React')) {
        content = content.replace(
          /import /,
          'import React from "react";\nimport '
        );
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${filePath}`);
      } else {
        console.log(`No changes needed for ${filePath}`);
      }
    } else {
      console.log(`File not found: ${fullPath}`);
    }
  });
}

/**
 * Update Customer service interface to avoid index signature with any
 */
function fixCustomerInterface() {
  console.log('Fixing Customer interface...');
  
  const customerServicePath = path.join(SRC_DIR, 'features/customers/services/customers.ts');
  
  if (fs.existsSync(customerServicePath)) {
    let content = fs.readFileSync(customerServicePath, 'utf8');
    
    // Replace [key: string]: any with metadata field
    if (content.includes('[key: string]: any')) {
      content = content.replace(
        /\[key: string\]: any;/,
        'metadata?: Record<string, unknown>;'
      );
      
      fs.writeFileSync(customerServicePath, content);
      console.log(`Updated Customer interface in ${customerServicePath}`);
    } else {
      console.log(`No index signature found in ${customerServicePath}`);
    }
  } else {
    console.log(`File not found: ${customerServicePath}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting dashboard component fixes...');
  
  try {
    // Create User type file
    createUserTypeFile();
    
    // Fix dashboard components
    fixDashboardComponents();
    
    // Fix Customer interface
    fixCustomerInterface();
    
    // Run TypeScript compiler to check for errors
    console.log('Running TypeScript compiler to check for errors...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('TypeScript compilation successful!');
    } catch (error) {
      console.error('TypeScript compilation failed. Some manual fixes may be required.');
    }
    
    console.log('\nDashboard component fixes completed!');
    console.log('\nManual steps that may be required:');
    console.log('1. Check if there are any remaining unsafe type assertions');
    console.log('2. Verify that the ExtendedUser type includes all necessary properties');
    console.log('3. Update any components that rely on the updated Customer interface');
    
  } catch (error) {
    console.error('Error fixing dashboard components:', error);
  }
}

// Run the script
main().catch(console.error); 