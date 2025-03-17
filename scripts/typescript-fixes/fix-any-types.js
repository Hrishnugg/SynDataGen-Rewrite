/**
 * Fix Any Types Script
 * 
 * This script helps identify and fix 'any' types in the codebase.
 * It creates type definitions for common patterns and replaces 'any' with proper types.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TYPES_DIR = path.join(process.cwd(), 'src', 'types');
const FILES_TO_FIX = [
  {
    path: 'src/app/auth-diagnostic/page.tsx',
    replacements: [
      {
        pattern: /useState<any>\(null\)/g,
        replacement: 'useState<AuthDiagnosticApiResponse | null>(null)'
      }
    ],
    typeDefinitions: [
      {
        name: 'AuthDiagnosticApiResponse',
        definition: `
/**
 * Response from the auth-debug API endpoint
 */
export interface AuthDiagnosticApiResponse {
  status: 'ok' | 'error';
  timestamp: string;
  environment: {
    nextAuthUrl: string;
    nextAuthSecret: string;
    nodeEnv: string;
    apiUrl: string;
    headers: {
      host: string | null;
      origin: string | null;
      referer: string | null;
    }
  };
  auth: {
    sessionStatus: string;
    hasSession: boolean;
    sessionKeys: string[] | null;
    userKeys: string[] | null;
    error: {
      message: string;
      name: string;
      stack?: string;
    } | string | null;
  }
}`
      }
    ]
  },
  {
    path: 'src/app/api/auth-debug/route.ts',
    replacements: [
      {
        pattern: /const safeStringify = \(obj: any\)/g,
        replacement: 'const safeStringify = (obj: unknown)'
      }
    ]
  },
  {
    path: 'src/lib/api/services/firestore-service.ts',
    replacements: [
      {
        pattern: /async createDocument\(collectionPath: string, data: any\)/g,
        replacement: 'async createDocument<T extends FirestoreDocument>(collectionPath: string, data: T)'
      },
      {
        pattern: /async updateDocument\(path: string, data: any\)/g,
        replacement: 'async updateDocument<T extends Partial<FirestoreDocument>>(path: string, data: T)'
      },
      {
        pattern: /async getDocument\(path: string\): Promise<any>/g,
        replacement: 'async getDocument<T extends FirestoreDocument = FirestoreDocument>(path: string): Promise<T | null>'
      },
      {
        pattern: /async queryDocuments\(collectionPath: string, conditions: any\[\]\)/g,
        replacement: 'async queryDocuments<T extends FirestoreDocument = FirestoreDocument>(collectionPath: string, conditions: FirestoreQueryCondition)'
      }
    ],
    typeDefinitions: [
      {
        name: 'FirestoreDocument',
        definition: `
/**
 * Base interface for Firestore documents
 */
export interface FirestoreDocument {
  id?: string;
  [key: string]: any; // This is a temporary solution until we can properly type all document fields
}`
      },
      {
        name: 'FirestoreQueryCondition',
        definition: `
/**
 * Type for Firestore query conditions
 */
export type FirestoreQueryCondition = (query: FirebaseFirestore.Query) => FirebaseFirestore.Query;`
      }
    ]
  },
  {
    path: 'src/lib/models/project.ts',
    replacements: [
      {
        pattern: /metadata: Record<string, any>;/g,
        replacement: 'metadata: ProjectMetadata;'
      }
    ],
    typeDefinitions: [
      {
        name: 'ProjectMetadata',
        definition: `
/**
 * Project metadata interface
 */
export interface ProjectMetadata {
  tags?: string[];
  category?: string;
  lastGeneratedAt?: Date;
  generationCount?: number;
  customFields?: Record<string, string | number | boolean>;
}`
      }
    ]
  },
  {
    path: 'src/features/projects/components/ProjectList.tsx',
    replacements: [
      {
        pattern: /const \[debugInfo, setDebugInfo\] = useState<any>\(null\);/g,
        replacement: 'const [debugInfo, setDebugInfo] = useState<ProjectsApiDebugInfo | null>(null);'
      }
    ],
    typeDefinitions: [
      {
        name: 'ProjectsApiDebugInfo',
        definition: `
/**
 * Debug information returned from the projects API
 */
export interface ProjectsApiDebugInfo {
  mockDataUsed?: boolean;
  noProjects?: boolean;
  errors?: string[];
  timestamp?: string;
  [key: string]: any; // Allow for additional debug fields
}`
      }
    ]
  },
  {
    path: 'src/components/three/SafeThreeLoader.tsx',
    replacements: [
      {
        pattern: /componentProps\?: any;/g,
        replacement: 'componentProps?: Record<string, unknown>;'
      }
    ]
  },
  {
    path: 'src/features/data-generation/services/job-management-service.ts',
    replacements: [
      {
        pattern: /data\?: any;/g,
        replacement: 'data?: JobData;'
      },
      {
        pattern: /result\?: any;/g,
        replacement: 'result?: JobResult;'
      },
      {
        pattern: /async createJob\(type: string, data\?: any\)/g,
        replacement: 'async createJob(type: string, data?: JobData)'
      }
    ],
    typeDefinitions: [
      {
        name: 'JobData',
        definition: `
/**
 * Data for a job
 */
export interface JobData {
  parameters?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}`
      },
      {
        name: 'JobResult',
        definition: `
/**
 * Result of a job
 */
export interface JobResult {
  outputs?: Record<string, unknown>;
  metrics?: Record<string, number>;
  logs?: string[];
  metadata?: Record<string, unknown>;
}`
      }
    ]
  },
  {
    path: 'src/tests/setup.ts',
    replacements: [
      {
        pattern: /mockResolvedValue\(value: any\)/g,
        replacement: 'mockResolvedValue<T>(value: T)'
      },
      {
        pattern: /mockResolvedValueOnce\(value: any\)/g,
        replacement: 'mockResolvedValueOnce<T>(value: T)'
      },
      {
        pattern: /mockRejectedValue\(value: any\)/g,
        replacement: 'mockRejectedValue(value: Error | unknown)'
      },
      {
        pattern: /mockRejectedValueOnce\(value: any\)/g,
        replacement: 'mockRejectedValueOnce(value: Error | unknown)'
      }
    ]
  },
  {
    path: 'src/tests/lib/services/data-generation/webhook-service.test.ts',
    replacements: [
      {
        pattern: /catch \(error: any\)/g,
        replacement: 'catch (error: unknown)'
      }
    ]
  }
];

// Create types directory if it doesn't exist
if (!fs.existsSync(TYPES_DIR)) {
  fs.mkdirSync(TYPES_DIR, { recursive: true });
  console.log(`Created types directory: ${TYPES_DIR}`);
}

// Create index.ts in types directory
const typesIndexPath = path.join(TYPES_DIR, 'index.ts');
if (!fs.existsSync(typesIndexPath)) {
  fs.writeFileSync(typesIndexPath, `/**
 * Type Definitions Index
 * 
 * This file exports all type definitions used throughout the application.
 */

export * from './api-responses';
export * from './firestore';
export * from './projects';
export * from './jobs';
`);
  console.log(`Created types index file: ${typesIndexPath}`);
}

// Create type definition files
const typeFiles = {
  'api-responses.ts': [],
  'firestore.ts': [],
  'projects.ts': [],
  'jobs.ts': []
};

// Map type definitions to appropriate files
FILES_TO_FIX.forEach(file => {
  if (!file.typeDefinitions) return;
  
  file.typeDefinitions.forEach(typeDef => {
    if (typeDef.name.includes('Api') || typeDef.name.includes('Response')) {
      typeFiles['api-responses.ts'].push(typeDef);
    } else if (typeDef.name.includes('Firestore') || typeDef.name.includes('Query')) {
      typeFiles['firestore.ts'].push(typeDef);
    } else if (typeDef.name.includes('Project')) {
      typeFiles['projects.ts'].push(typeDef);
    } else if (typeDef.name.includes('Job')) {
      typeFiles['jobs.ts'].push(typeDef);
    }
  });
});

// Write type definition files
Object.entries(typeFiles).forEach(([fileName, typeDefs]) => {
  if (typeDefs.length === 0) return;
  
  const filePath = path.join(TYPES_DIR, fileName);
  let fileContent = `/**
 * ${fileName.replace('.ts', '')} Type Definitions
 * 
 * This file contains type definitions for ${fileName.replace('.ts', '')} in the application.
 */

`;

  typeDefs.forEach(typeDef => {
    fileContent += typeDef.definition + '\n\n';
  });

  fs.writeFileSync(filePath, fileContent);
  console.log(`Created type definition file: ${filePath}`);
});

// Fix files
FILES_TO_FIX.forEach(file => {
  const filePath = path.join(process.cwd(), file.path);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Add import for types if needed
  if (file.typeDefinitions && file.typeDefinitions.length > 0) {
    // Check if we need to add imports
    const needsApiResponseTypes = file.typeDefinitions.some(def => 
      def.name.includes('Api') || def.name.includes('Response'));
    
    const needsFirestoreTypes = file.typeDefinitions.some(def => 
      def.name.includes('Firestore') || def.name.includes('Query'));
    
    const needsProjectTypes = file.typeDefinitions.some(def => 
      def.name.includes('Project'));
    
    const needsJobTypes = file.typeDefinitions.some(def => 
      def.name.includes('Job'));
    
    // Add imports if not already present
    if (needsApiResponseTypes && !content.includes('@/types/api-responses')) {
      content = `import { ${file.typeDefinitions
        .filter(def => def.name.includes('Api') || def.name.includes('Response'))
        .map(def => def.name)
        .join(', ')} } from '@/types/api-responses';\n${content}`;
      modified = true;
    }
    
    if (needsFirestoreTypes && !content.includes('@/types/firestore')) {
      content = `import { ${file.typeDefinitions
        .filter(def => def.name.includes('Firestore') || def.name.includes('Query'))
        .map(def => def.name)
        .join(', ')} } from '@/types/firestore';\n${content}`;
      modified = true;
    }
    
    if (needsProjectTypes && !content.includes('@/types/projects')) {
      content = `import { ${file.typeDefinitions
        .filter(def => def.name.includes('Project'))
        .map(def => def.name)
        .join(', ')} } from '@/types/projects';\n${content}`;
      modified = true;
    }
    
    if (needsJobTypes && !content.includes('@/types/jobs')) {
      content = `import { ${file.typeDefinitions
        .filter(def => def.name.includes('Job'))
        .map(def => def.name)
        .join(', ')} } from '@/types/jobs';\n${content}`;
      modified = true;
    }
  }
  
  // Apply replacements
  file.replacements.forEach(replacement => {
    const originalContent = content;
    content = content.replace(replacement.pattern, replacement.replacement);
    if (content !== originalContent) {
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed file: ${filePath}`);
  } else {
    console.log(`No changes needed for: ${filePath}`);
  }
});

console.log('\nType fixes completed. Please run TypeScript compiler to verify the changes.'); 