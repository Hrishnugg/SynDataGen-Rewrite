/**
 * Fix Null and Undefined Handling
 * 
 * This script addresses TypeScript errors related to null and undefined:
 * 1. Optional chaining for potentially null/undefined values
 * 2. Nullish coalescing for default values
 * 3. Type guards for null/undefined checks
 * 4. Non-null assertion operator (!) usage
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const APP_DIR = path.join(SRC_DIR, 'app');
const LIB_DIR = path.join(SRC_DIR, 'lib');
const FEATURES_DIR = path.join(SRC_DIR, 'features');

// Files with null/undefined handling issues
const PROBLEMATIC_FILES = {
  PROJECTS_API_ROUTE: path.join(APP_DIR, 'api/projects/route.ts'),
  PROJECT_DETAILS_API_ROUTE: path.join(APP_DIR, 'api/projects/[id]/route.ts'),
  PROJECT_JOBS_API_ROUTE: path.join(APP_DIR, 'api/projects/[id]/jobs/route.ts'),
  PROJECT_METRICS_API_ROUTE: path.join(APP_DIR, 'api/projects/[id]/metrics/route.ts'),
  USER_API_ROUTE: path.join(APP_DIR, 'api/user/route.ts'),
  FIREBASE_AUTH: path.join(LIB_DIR, 'firebase/auth.ts'),
  PROJECT_SERVICE: path.join(LIB_DIR, 'api/services/project-service.ts'),
  USER_SERVICE: path.join(LIB_DIR, 'api/services/user-service.ts'),
  PROJECT_LIST: path.join(FEATURES_DIR, 'projects/components/ProjectList.tsx'),
  JOB_HISTORY_TABLE: path.join(FEATURES_DIR, 'data-generation/components/JobHistoryTable.tsx'),
};

/**
 * Fix Projects API Route
 */
function fixProjectsAPIRoute() {
  const filePath = PROBLEMATIC_FILES.PROJECTS_API_ROUTE;
  console.log(`Fixing Projects API Route at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add user null check
  content = content.replace(
    /const user = await getUserFromSession\(\);/,
    `const user = await getUserFromSession();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }`
  );
  
  // Fix property access on potentially undefined values
  content = content.replace(
    /const projects = await projectService\.getProjectsByUserId\(user\.id\);/,
    `const projects = await projectService.getProjectsByUserId(user.id);`
  );
  
  // Add optional chaining and nullish coalescing for defaults
  content = content.replace(
    /const limit = parseInt\(searchParams\.get\('limit'\)\) \|\| 10;/,
    `const limit = parseInt(searchParams?.get('limit') ?? '') || 10;`
  );
  
  content = content.replace(
    /const offset = parseInt\(searchParams\.get\('offset'\)\) \|\| 0;/,
    `const offset = parseInt(searchParams?.get('offset') ?? '') || 0;`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Projects API Route at ${filePath}`);
}

/**
 * Fix Project Details API Route
 */
function fixProjectDetailsAPIRoute() {
  const filePath = PROBLEMATIC_FILES.PROJECT_DETAILS_API_ROUTE;
  console.log(`Fixing Project Details API Route at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add project null check
  content = content.replace(
    /const project = await projectService\.getProjectById\(params\.id\);/,
    `const project = await projectService.getProjectById(params.id);

  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }`
  );
  
  // Fix property access with optional chaining
  content = content.replace(
    /if \(project\.userId !== user\.id\) {/,
    `if (project.userId !== user?.id) {`
  );
  
  // Add user null check
  content = content.replace(
    /const user = await getUserFromSession\(\);/,
    `const user = await getUserFromSession();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Project Details API Route at ${filePath}`);
}

/**
 * Fix Project Jobs API Route
 */
function fixProjectJobsAPIRoute() {
  const filePath = PROBLEMATIC_FILES.PROJECT_JOBS_API_ROUTE;
  console.log(`Fixing Project Jobs API Route at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add project null check
  content = content.replace(
    /const project = await projectService\.getProjectById\(params\.id\);/,
    `const project = await projectService.getProjectById(params.id);

  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }`
  );
  
  // Add user null check
  content = content.replace(
    /const user = await getUserFromSession\(\);/,
    `const user = await getUserFromSession();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }`
  );
  
  // Add null checks for request body
  content = content.replace(
    /const { config } = await request\.json\(\);/,
    `const body = await request.json();
  const config = body?.config;
  
  if (!config) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Project Jobs API Route at ${filePath}`);
}

/**
 * Fix Project Metrics API Route
 */
function fixProjectMetricsAPIRoute() {
  const filePath = PROBLEMATIC_FILES.PROJECT_METRICS_API_ROUTE;
  console.log(`Fixing Project Metrics API Route at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add project null check
  content = content.replace(
    /const project = await projectService\.getProjectById\(params\.id\);/,
    `const project = await projectService.getProjectById(params.id);

  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }`
  );
  
  // Fix property access with optional chaining
  content = content.replace(
    /if \(project\.userId !== user\.id\) {/,
    `if (project.userId !== user?.id) {`
  );
  
  // Add user null check
  content = content.replace(
    /const user = await getUserFromSession\(\);/,
    `const user = await getUserFromSession();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }`
  );
  
  // Fix date parsing
  content = content.replace(
    /const startDate = searchParams\.get\('startDate'\) \? new Date\(searchParams\.get\('startDate'\)\) : null;/,
    `const startDateParam = searchParams?.get('startDate') ?? null;
  const startDate = startDateParam ? new Date(startDateParam) : null;`
  );
  
  content = content.replace(
    /const endDate = searchParams\.get\('endDate'\) \? new Date\(searchParams\.get\('endDate'\)\) : null;/,
    `const endDateParam = searchParams?.get('endDate') ?? null;
  const endDate = endDateParam ? new Date(endDateParam) : null;`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Project Metrics API Route at ${filePath}`);
}

/**
 * Fix User API Route
 */
function fixUserAPIRoute() {
  const filePath = PROBLEMATIC_FILES.USER_API_ROUTE;
  console.log(`Fixing User API Route at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add user null check
  content = content.replace(
    /const user = await getUserFromSession\(\);/,
    `const user = await getUserFromSession();
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }`
  );
  
  // Fix optional property access
  content = content.replace(
    /const userProfile = await userService\.getUserProfile\(user\.id\);/,
    `const userProfile = await userService.getUserProfile(user.id);`
  );
  
  content = content.replace(
    /const { name, email, company } = await request\.json\(\);/,
    `const body = await request.json();
  const { name, email, company } = body as { 
    name?: string; 
    email?: string; 
    company?: string; 
  };`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed User API Route at ${filePath}`);
}

/**
 * Fix Firebase Auth
 */
function fixFirebaseAuth() {
  const filePath = PROBLEMATIC_FILES.FIREBASE_AUTH;
  console.log(`Fixing Firebase Auth at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add type guard for user
  content = content.replace(
    /async function getUserFromSession\(session\) {/,
    `async function getUserFromSession(session: Session | null): Promise<User | null> {
  if (!session?.user?.email) {
    return null;
  }`
  );
  
  // Fix optional property access
  content = content.replace(
    /const user = await getUser\(session\.user\.email\);/,
    `const user = await getUser(session.user.email);`
  );
  
  // Fix nullish coalescing
  content = content.replace(
    /return user \|\| null;/,
    `return user ?? null;`
  );
  
  // Fix optional parameter
  content = content.replace(
    /async function getUser\(email\) {/,
    `async function getUser(email: string | null | undefined): Promise<User | null> {
  if (!email) {
    return null;
  }`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Firebase Auth at ${filePath}`);
}

/**
 * Fix Project Service
 */
function fixProjectService() {
  const filePath = PROBLEMATIC_FILES.PROJECT_SERVICE;
  console.log(`Fixing Project Service at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix type guards for return values
  content = content.replace(
    /async getProjectById\(id\) {/,
    `async getProjectById(id: string): Promise<any | null> {
    if (!id) {
      return null;
    }`
  );
  
  content = content.replace(
    /async getProjectsByUserId\(userId\) {/,
    `async getProjectsByUserId(userId: string): Promise<any[]> {
    if (!userId) {
      return [];
    }`
  );
  
  // Fix null checks for parameters
  content = content.replace(
    /async updateProject\(id, updates\) {/,
    `async updateProject(id: string, updates: any): Promise<any | null> {
    if (!id || !updates) {
      return null;
    }`
  );
  
  content = content.replace(
    /async deleteProject\(id\) {/,
    `async deleteProject(id: string): Promise<boolean> {
    if (!id) {
      return false;
    }`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Project Service at ${filePath}`);
}

/**
 * Fix User Service
 */
function fixUserService() {
  const filePath = PROBLEMATIC_FILES.USER_SERVICE;
  console.log(`Fixing User Service at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix type guards for return values
  content = content.replace(
    /async getUserById\(id\) {/,
    `async getUserById(id: string): Promise<any | null> {
    if (!id) {
      return null;
    }`
  );
  
  content = content.replace(
    /async getUserByEmail\(email\) {/,
    `async getUserByEmail(email: string): Promise<any | null> {
    if (!email) {
      return null;
    }`
  );
  
  // Fix null checks for parameters
  content = content.replace(
    /async updateUser\(id, updates\) {/,
    `async updateUser(id: string, updates: any): Promise<any | null> {
    if (!id || !updates) {
      return null;
    }`
  );
  
  content = content.replace(
    /async getUserProfile\(userId\) {/,
    `async getUserProfile(userId: string): Promise<any | null> {
    if (!userId) {
      return null;
    }`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed User Service at ${filePath}`);
}

/**
 * Fix Project List Component
 */
function fixProjectListComponent() {
  const filePath = PROBLEMATIC_FILES.PROJECT_LIST;
  console.log(`Fixing Project List Component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add Project interface
  if (!content.includes('interface Project')) {
    // Find the imports section
    const importsEnd = content.indexOf('interface ProjectListProps');
    
    // Add Project interface after imports
    const interfaceDefinition = `
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  status?: string;
  [key: string]: any;
}
`;
    
    content = content.slice(0, importsEnd) + interfaceDefinition + content.slice(importsEnd);
  }
  
  // Fix ProjectListProps interface
  content = content.replace(
    /interface ProjectListProps {[^}]*}/s,
    `interface ProjectListProps {
  projects: Project[];
  onProjectClick?: (projectId: string) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}`
  );
  
  // Fix optional props access
  content = content.replace(
    /const handleProjectClick = \(projectId\) => {/,
    `const handleProjectClick = (projectId: string) => {
    if (onProjectClick) {
      onProjectClick(projectId);
    }`
  );
  
  // Fix nullish coalescing for empty data check
  content = content.replace(
    /if \(!projects || projects\.length === 0\) {/,
    `if ((!projects || projects.length === 0) && !isLoading) {`
  );
  
  // Fix mapping functions
  content = content.replace(
    /\.map\(\(project\) =>/g,
    `.map((project: Project) =>`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Project List Component at ${filePath}`);
}

/**
 * Fix Job History Table Component
 */
function fixJobHistoryTableComponent() {
  const filePath = PROBLEMATIC_FILES.JOB_HISTORY_TABLE;
  console.log(`Fixing Job History Table Component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add Job interface
  if (!content.includes('interface Job')) {
    // Find the imports section
    const importsEnd = content.indexOf('interface JobHistoryTableProps');
    
    // Add Job interface after imports
    const interfaceDefinition = `
interface Job {
  id: string;
  name?: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  createdAt: string | Date;
  startedAt?: string | Date;
  completedAt?: string | Date;
  [key: string]: any;
}
`;
    
    content = content.slice(0, importsEnd) + interfaceDefinition + content.slice(importsEnd);
  }
  
  // Fix JobHistoryTableProps interface
  content = content.replace(
    /interface JobHistoryTableProps {[^}]*}/s,
    `interface JobHistoryTableProps {
  jobs: Job[];
  onJobClick?: (jobId: string) => void;
  isLoading?: boolean;
  projectId?: string;
}`
  );
  
  // Fix optional props access with null checks
  content = content.replace(
    /const handleJobClick = \(jobId\) => {/,
    `const handleJobClick = (jobId: string) => {
    if (onJobClick) {
      onJobClick(jobId);
    }`
  );
  
  // Fix mapping with type annotations
  content = content.replace(
    /\.map\(\(job\) =>/g,
    `.map((job: Job) =>`
  );
  
  // Fix date formatting with null checks
  content = content.replace(
    /formatDate\(job\.createdAt\)/g,
    `formatDate(job.createdAt)`
  );
  
  content = content.replace(
    /formatDate\(job\.completedAt\)/g,
    `job.completedAt ? formatDate(job.completedAt) : 'N/A'`
  );
  
  // Add formatDate function if it doesn't exist
  if (!content.includes('function formatDate')) {
    // Find a good spot to add the function, like before the component
    const beforeComponent = content.indexOf('export function JobHistoryTable');
    
    // Add formatDate function
    const formatDateFunction = `
// Format date to a readable string
function formatDate(date: string | Date): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

`;
    
    content = content.slice(0, beforeComponent) + formatDateFunction + content.slice(beforeComponent);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Job History Table Component at ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('Starting null and undefined handling fixes...');
  
  try {
    // Fix API routes with null/undefined issues
    fixProjectsAPIRoute();
    fixProjectDetailsAPIRoute();
    fixProjectJobsAPIRoute();
    fixProjectMetricsAPIRoute();
    fixUserAPIRoute();
    
    // Fix services
    fixFirebaseAuth();
    fixProjectService();
    fixUserService();
    
    // Fix components
    fixProjectListComponent();
    fixJobHistoryTableComponent();
    
    // Run TypeScript compiler to check for errors
    console.log('Running TypeScript compiler to check for errors...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('TypeScript compilation successful!');
    } catch (error) {
      console.error('TypeScript compilation failed. Some manual fixes may be required.');
    }
    
    console.log('\nNull and undefined handling fixes completed!');
    
  } catch (error) {
    console.error('Error fixing null and undefined handling issues:', error);
  }
}

// Run the script
main().catch(console.error); 