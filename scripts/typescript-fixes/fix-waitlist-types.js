/**
 * Fix Waitlist Model TypeScript Issues
 * 
 * This script addresses TypeScript issues in the waitlist model:
 * 1. Replaces Record<string, any> with Record<string, unknown> for metadata fields
 * 2. Creates more specific types for common metadata patterns
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const MODELS_DIR = path.join(SRC_DIR, 'lib/models');
const FIRESTORE_MODELS_DIR = path.join(MODELS_DIR, 'firestore');
const WAITLIST_MODEL_PATH = path.join(FIRESTORE_MODELS_DIR, 'waitlist.ts');
const TYPES_DIR = path.join(SRC_DIR, 'types');

/**
 * Create a metadata types file if it doesn't exist
 */
function createMetadataTypesFile() {
  console.log('Creating metadata types file...');
  
  if (!fs.existsSync(TYPES_DIR)) {
    fs.mkdirSync(TYPES_DIR, { recursive: true });
  }
  
  const metadataTypesPath = path.join(TYPES_DIR, 'metadata.ts');
  
  // Only create the file if it doesn't exist
  if (!fs.existsSync(metadataTypesPath)) {
    const metadataTypesContent = `/**
 * Metadata Types
 * 
 * Type definitions for metadata objects used throughout the application
 */

/**
 * Base metadata interface with common fields
 */
export interface BaseMetadata {
  source?: string;
  lastUpdated?: string | Date;
  version?: string | number;
}

/**
 * Waitlist submission metadata
 */
export interface WaitlistMetadata extends BaseMetadata {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  browser?: string;
  device?: string;
  priority?: number;
  tags?: string[];
  notes?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Customer metadata
 */
export interface CustomerMetadata extends BaseMetadata {
  customerType?: 'enterprise' | 'pro' | 'starter';
  industry?: string;
  region?: string;
  employees?: number;
  revenue?: string;
  tags?: string[];
  notes?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Project metadata
 */
export interface ProjectMetadata extends BaseMetadata {
  projectType?: string;
  dataSize?: string;
  status?: string;
  tags?: string[];
  notes?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Generic Record type for unknown metadata
 * Use this as a fallback when more specific types aren't available
 */
export type GenericMetadata = Record<string, unknown>;
`;
  
    fs.writeFileSync(metadataTypesPath, metadataTypesContent);
    console.log(`Created metadata types file at ${metadataTypesPath}`);
  } else {
    console.log(`Metadata types file already exists at ${metadataTypesPath}`);
  }
}

/**
 * Fix waitlist model types
 */
function fixWaitlistModelTypes() {
  console.log('Fixing waitlist model types...');
  
  if (fs.existsSync(WAITLIST_MODEL_PATH)) {
    let content = fs.readFileSync(WAITLIST_MODEL_PATH, 'utf8');
    let modified = false;
    
    // Add import for WaitlistMetadata if not present
    if (!content.includes('import { WaitlistMetadata }')) {
      const importStatement = `import { WaitlistMetadata } from '@/types/metadata';`;
      
      // Add after the existing imports or at the top if no imports
      if (content.includes('import ')) {
        const lastImportIndex = content.lastIndexOf('import ');
        const endOfImportLine = content.indexOf('\n', lastImportIndex) + 1;
        content = content.slice(0, endOfImportLine) + importStatement + '\n' + content.slice(endOfImportLine);
      } else {
        content = importStatement + '\n\n' + content;
      }
      
      modified = true;
    }
    
    // Replace Record<string, any> with WaitlistMetadata in WaitlistSubmission interface
    if (content.includes('metadata: Record<string, any>')) {
      content = content.replace(
        'metadata: Record<string, any>',
        'metadata: WaitlistMetadata'
      );
      modified = true;
    }
    
    // Replace Record<string, any> with WaitlistMetadata in CreateWaitlistInput interface
    if (content.includes('metadata?: Record<string, any>')) {
      content = content.replace(
        'metadata?: Record<string, any>',
        'metadata?: WaitlistMetadata'
      );
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(WAITLIST_MODEL_PATH, content);
      console.log(`Updated waitlist model at ${WAITLIST_MODEL_PATH}`);
    } else {
      console.log(`No changes needed for ${WAITLIST_MODEL_PATH}`);
    }
  } else {
    console.log(`File not found: ${WAITLIST_MODEL_PATH}`);
  }
}

/**
 * Check other models for metadata fields and fix them
 */
function fixOtherMetadataFields() {
  console.log('Checking other models for metadata fields...');
  
  // Get all model files
  const modelFiles = [];
  
  // Walk the models directory recursively
  function walkDir(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        walkDir(fullPath);
      } else if (file.name.endsWith('.ts') && fullPath !== WAITLIST_MODEL_PATH) {
        modelFiles.push(fullPath);
      }
    }
  }
  
  walkDir(MODELS_DIR);
  
  // Check each file for metadata fields
  for (const filePath of modelFiles) {
    console.log(`Checking ${filePath}...`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let newContent = content;
    
    // Check if file has metadata: Record<string, any>
    if (content.includes('metadata: Record<string, any>') || 
        content.includes('metadata?: Record<string, any>')) {
      
      // Add import for appropriate metadata type
      let metadataType = 'GenericMetadata';
      
      if (filePath.includes('customer') || filePath.includes('Customer')) {
        metadataType = 'CustomerMetadata';
      } else if (filePath.includes('project') || filePath.includes('Project')) {
        metadataType = 'ProjectMetadata';
      }
      
      // Add import if not present
      if (!newContent.includes(`import { ${metadataType} }`)) {
        const importStatement = `import { ${metadataType} } from '@/types/metadata';`;
        
        // Add after the existing imports or at the top if no imports
        if (newContent.includes('import ')) {
          const lastImportIndex = newContent.lastIndexOf('import ');
          const endOfImportLine = newContent.indexOf('\n', lastImportIndex) + 1;
          newContent = newContent.slice(0, endOfImportLine) + importStatement + '\n' + newContent.slice(endOfImportLine);
        } else {
          newContent = importStatement + '\n\n' + newContent;
        }
        
        modified = true;
      }
      
      // Replace metadata fields
      newContent = newContent.replace(
        /metadata: Record<string, any>/g,
        `metadata: ${metadataType}`
      );
      
      newContent = newContent.replace(
        /metadata\?: Record<string, any>/g,
        `metadata?: ${metadataType}`
      );
      
      if (newContent !== content) {
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Updated ${filePath}`);
      }
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting waitlist model fixes...');
  
  try {
    // Create metadata types file
    createMetadataTypesFile();
    
    // Fix waitlist model types
    fixWaitlistModelTypes();
    
    // Fix other metadata fields
    fixOtherMetadataFields();
    
    // Run TypeScript compiler to check for errors
    console.log('Running TypeScript compiler to check for errors...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('TypeScript compilation successful!');
    } catch (error) {
      console.error('TypeScript compilation failed. Some manual fixes may be required.');
    }
    
    console.log('\nWaitlist model fixes completed!');
    console.log('\nManual steps that may be required:');
    console.log('1. Verify that the metadata types match the actual data structure used in the application');
    console.log('2. Update any code that relies on the specific fields in metadata objects');
    console.log('3. Add any additional metadata fields that may be missing from the type definitions');
    
  } catch (error) {
    console.error('Error fixing waitlist model types:', error);
  }
}

// Run the script
main().catch(console.error); 