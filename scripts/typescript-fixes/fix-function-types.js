/**
 * Fix Function Types
 * 
 * This script addresses TypeScript issues with function types:
 * 1. Missing parameter types
 * 2. Implicit any types in callbacks
 * 3. Parameter type mismatches
 * 4. Optional parameter handling
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
const APP_DIR = path.join(SRC_DIR, 'app');
const FEATURES_DIR = path.join(SRC_DIR, 'features');

// Map of files with function type issues and their fixes
const PROBLEMATIC_FILES = {
  PROJECT_CARD: path.join(COMPONENTS_DIR, 'dashboard/ProjectCard.tsx'),
  SIDEBAR_NAV: path.join(COMPONENTS_DIR, 'layout/SidebarNav.tsx'),
  NAV_ITEM: path.join(COMPONENTS_DIR, 'layout/NavItem.tsx'),
  BUTTON: path.join(COMPONENTS_DIR, 'ui/Button.tsx'),
  MODAL: path.join(COMPONENTS_DIR, 'ui/Modal.tsx'),
  DATA_TABLE: path.join(COMPONENTS_DIR, 'ui/data-display/DataTable.tsx'),
  JOBS_PAGE: path.join(APP_DIR, 'jobs/page.tsx'),
  PROJECT_DETAILS: path.join(FEATURES_DIR, 'projects/components/ProjectDetails.tsx'),
  PROJECT_FORM: path.join(FEATURES_DIR, 'projects/components/ProjectForm.tsx'),
  PROMPT_MODULE: path.join(FEATURES_DIR, 'ai/PromptModule.tsx'),
};

/**
 * Fix ProjectCard component
 */
function fixProjectCardComponent() {
  const filePath = PROBLEMATIC_FILES.PROJECT_CARD;
  console.log(`Fixing ProjectCard component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix onClick handler type
  content = content.replace(
    /onClick={\(\) => handleClick\(project\.id\)}/,
    `onClick={() => handleClick(project.id)}`
  );
  
  // Fix project prop type
  content = content.replace(
    /interface ProjectCardProps {\s*project: any;\s*}/,
    `interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description?: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    status?: string;
    [key: string]: any;
  };
}`
  );
  
  // Fix handleClick function type
  content = content.replace(
    /const handleClick = \(id\) => {/,
    `const handleClick = (id: string) => {`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ProjectCard component at ${filePath}`);
}

/**
 * Fix SidebarNav component
 */
function fixSidebarNavComponent() {
  const filePath = PROBLEMATIC_FILES.SIDEBAR_NAV;
  console.log(`Fixing SidebarNav component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add missing interface for navigation items
  if (!content.includes('interface NavItem')) {
    // Find the imports section
    const importsEnd = content.indexOf('export function SidebarNav');
    
    // Add NavItem interface after imports
    const interfaceDefinition = `
interface NavItem {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  submenu?: NavItem[];
  disabled?: boolean;
}
`;
    
    content = content.slice(0, importsEnd) + interfaceDefinition + content.slice(importsEnd);
  }
  
  // Fix navItems parameter type
  content = content.replace(
    /export function SidebarNav\(\{ navItems \}\) {/,
    `export function SidebarNav({ navItems }: { navItems: NavItem[] }) {`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed SidebarNav component at ${filePath}`);
}

/**
 * Fix NavItem component
 */
function fixNavItemComponent() {
  const filePath = PROBLEMATIC_FILES.NAV_ITEM;
  console.log(`Fixing NavItem component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add NavItemProps interface
  if (!content.includes('interface NavItemProps')) {
    // Find the imports section
    const importsEnd = content.indexOf('export function NavItem');
    
    // Add NavItemProps interface after imports
    const interfaceDefinition = `
interface NavItemProps {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  submenu?: Array<{
    title: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
  }>;
  className?: string;
}
`;
    
    content = content.slice(0, importsEnd) + interfaceDefinition + content.slice(importsEnd);
  }
  
  // Fix NavItem props destructuring
  content = content.replace(
    /export function NavItem\(\{ title, href, icon: Icon, disabled, submenu, className \}\) {/,
    `export function NavItem({ title, href, icon: Icon, disabled, submenu, className }: NavItemProps) {`
  );
  
  // Fix onClick handler type for submenu items
  content = content.replace(
    /\.map\(\(item\) => \(/g,
    `.map((item) => (`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed NavItem component at ${filePath}`);
}

/**
 * Fix Button component
 */
function fixButtonComponent() {
  const filePath = PROBLEMATIC_FILES.BUTTON;
  console.log(`Fixing Button component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update ButtonProps interface to extend HTML button attributes
  content = content.replace(
    /interface ButtonProps {[^}]*}/s,
    `interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}`
  );
  
  // Fix props forwarding to handle both custom and HTML button props
  content = content.replace(
    /export function Button\(\{ children, variant = 'default', size = 'md', isLoading = false, loadingText, icon: Icon, iconPosition = 'left', fullWidth = false, ...props \}\) {/,
    `export function Button({
  children,
  variant = 'default',
  size = 'md',
  isLoading = false,
  loadingText,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  ...props
}: ButtonProps) {`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Button component at ${filePath}`);
}

/**
 * Fix Modal component
 */
function fixModalComponent() {
  const filePath = PROBLEMATIC_FILES.MODAL;
  console.log(`Fixing Modal component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update ModalProps interface
  content = content.replace(
    /interface ModalProps {[^}]*}/s,
    `interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}`
  );
  
  // Fix onClose handler in the Modal.Header component
  content = content.replace(
    /function ModalHeader\(\{ title, description, showCloseButton = true, onClose \}\) {/,
    `function ModalHeader({ 
  title, 
  description, 
  showCloseButton = true, 
  onClose 
}: { 
  title?: string; 
  description?: string; 
  showCloseButton?: boolean; 
  onClose: () => void 
}) {`
  );
  
  // Fix ModalFooter props
  content = content.replace(
    /function ModalFooter\(\{ children \}\) {/,
    `function ModalFooter({ children }: { children: React.ReactNode }) {`
  );
  
  // Fix ModalBody props
  content = content.replace(
    /function ModalBody\(\{ children \}\) {/,
    `function ModalBody({ children }: { children: React.ReactNode }) {`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Modal component at ${filePath}`);
}

/**
 * Fix DataTable component
 */
function fixDataTableComponent() {
  const filePath = PROBLEMATIC_FILES.DATA_TABLE;
  console.log(`Fixing DataTable component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add Column interface if it doesn't exist
  if (!content.includes('interface Column<T>')) {
    // Find the imports section
    const importsEnd = content.indexOf('interface DataTableProps');
    
    // Add Column interface after imports
    const interfaceDefinition = `
interface Column<T = any> {
  header: string;
  accessorKey: string;
  cell?: (info: { row: { original: T } }) => React.ReactNode;
}
`;
    
    content = content.slice(0, importsEnd) + interfaceDefinition + content.slice(importsEnd);
  }
  
  // Update DataTableProps interface
  content = content.replace(
    /interface DataTableProps {[^}]*}/s,
    `interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    onPageChange: (page: number) => void;
  };
  selectedRows?: string[];
  onRowSelectionChange?: (selectedRows: string[]) => void;
}`
  );
  
  // Fix DataTable component type
  content = content.replace(
    /export function DataTable\(\{[\s\S]*?\}\) {/,
    `export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  isLoading = false,
  emptyState,
  pagination,
  selectedRows,
  onRowSelectionChange,
}: DataTableProps<T>) {`
  );
  
  // Fix row click handler
  content = content.replace(
    /const handleRowClick = \(row\) => {/g,
    `const handleRowClick = (row: T) => {`
  );
  
  // Fix mapping functions
  content = content.replace(
    /\.map\(\(row\) =>/g,
    `.map((row: T) =>`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed DataTable component at ${filePath}`);
}

/**
 * Fix JobsPage types
 */
function fixJobsPage() {
  const filePath = PROBLEMATIC_FILES.JOBS_PAGE;
  console.log(`Fixing Jobs page at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add Job interface if it doesn't exist
  if (!content.includes('interface Job')) {
    // Find the imports section
    const importsEnd = content.indexOf('export default function');
    
    // Add Job interface after imports
    const interfaceDefinition = `
interface Job {
  id: string;
  name?: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string | Date;
  updatedAt?: string | Date;
  completedAt?: string | Date;
  [key: string]: any;
}
`;
    
    content = content.slice(0, importsEnd) + interfaceDefinition + content.slice(importsEnd);
  }
  
  // Fix function parameter types
  content = content.replace(
    /async function fetchJobs\(\) {/,
    `async function fetchJobs(): Promise<Job[]> {`
  );
  
  content = content.replace(
    /const handleJobClick = \(job\) => {/,
    `const handleJobClick = (job: Job) => {`
  );
  
  // Fix state types
  content = content.replace(
    /const \[jobs, setJobs\] = useState\(\[\]\);/,
    `const [jobs, setJobs] = useState<Job[]>([]);`
  );
  
  content = content.replace(
    /const \[loading, setLoading\] = useState\(true\);/,
    `const [loading, setLoading] = useState<boolean>(true);`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed Jobs page at ${filePath}`);
}

/**
 * Fix ProjectDetails component
 */
function fixProjectDetailsComponent() {
  const filePath = PROBLEMATIC_FILES.PROJECT_DETAILS;
  console.log(`Fixing ProjectDetails component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add Project interface if it doesn't exist
  if (!content.includes('interface Project')) {
    // Find the imports section
    const importsEnd = content.indexOf('interface ProjectDetailsProps');
    
    // Add Project interface after imports
    const interfaceDefinition = `
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  [key: string]: any;
}
`;
    
    content = content.slice(0, importsEnd) + interfaceDefinition + content.slice(importsEnd);
  }
  
  // Update ProjectDetailsProps interface
  content = content.replace(
    /interface ProjectDetailsProps {[^}]*}/s,
    `interface ProjectDetailsProps {
  project: Project;
  onEdit?: () => void;
  onDelete?: () => void;
}`
  );
  
  // Fix event handlers
  content = content.replace(
    /const handleEdit = \(\) => {/,
    `const handleEdit = () => {`
  );
  
  content = content.replace(
    /const handleDelete = \(\) => {/,
    `const handleDelete = () => {`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ProjectDetails component at ${filePath}`);
}

/**
 * Fix ProjectForm component
 */
function fixProjectFormComponent() {
  const filePath = PROBLEMATIC_FILES.PROJECT_FORM;
  console.log(`Fixing ProjectForm component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add FormData interface if it doesn't exist
  if (!content.includes('interface FormData')) {
    // Find the imports section
    const importsEnd = content.indexOf('interface ProjectFormProps');
    
    // Add FormData interface after imports
    const interfaceDefinition = `
interface FormData {
  name: string;
  description: string;
  [key: string]: any;
}

interface Project {
  id?: string;
  name: string;
  description?: string;
  [key: string]: any;
}
`;
    
    content = content.slice(0, importsEnd) + interfaceDefinition + content.slice(importsEnd);
  }
  
  // Update ProjectFormProps interface
  content = content.replace(
    /interface ProjectFormProps {[^}]*}/s,
    `interface ProjectFormProps {
  project?: Project;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}`
  );
  
  // Fix form submit handler
  content = content.replace(
    /const onSubmit = \(data\) => {/,
    `const onSubmit = (data: FormData) => {`
  );
  
  // Fix React Hook Form
  content = content.replace(
    /const { register, handleSubmit, formState: { errors } } = useForm\({/,
    `const { register, handleSubmit, formState: { errors } } = useForm<FormData>({`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ProjectForm component at ${filePath}`);
}

/**
 * Fix PromptModule component
 */
function fixPromptModuleComponent() {
  const filePath = PROBLEMATIC_FILES.PROMPT_MODULE;
  console.log(`Fixing PromptModule component at ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add PromptData interface if it doesn't exist
  if (!content.includes('interface PromptData')) {
    // Find the imports section
    const importsEnd = content.indexOf('interface PromptModuleProps');
    
    // Add PromptData interface after imports
    const interfaceDefinition = `
interface PromptData {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}

interface PromptResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  [key: string]: any;
}
`;
    
    content = content.slice(0, importsEnd) + interfaceDefinition + content.slice(importsEnd);
  }
  
  // Update PromptModuleProps interface
  content = content.replace(
    /interface PromptModuleProps {[^}]*}/s,
    `interface PromptModuleProps {
  initialPrompt?: string;
  onSubmit?: (data: PromptData) => Promise<PromptResponse>;
  isLoading?: boolean;
  availableModels?: string[];
  showModelSelector?: boolean;
  showAdvancedOptions?: boolean;
}`
  );
  
  // Fix form state
  content = content.replace(
    /const \[prompt, setPrompt\] = useState\(initialPrompt \|\| ''\);/,
    `const [prompt, setPrompt] = useState<string>(initialPrompt || '');`
  );
  
  content = content.replace(
    /const \[model, setModel\] = useState\('gpt-3.5-turbo'\);/,
    `const [model, setModel] = useState<string>('gpt-3.5-turbo');`
  );
  
  content = content.replace(
    /const \[temperature, setTemperature\] = useState\(0.7\);/,
    `const [temperature, setTemperature] = useState<number>(0.7);`
  );
  
  content = content.replace(
    /const \[maxTokens, setMaxTokens\] = useState\(1000\);/,
    `const [maxTokens, setMaxTokens] = useState<number>(1000);`
  );
  
  content = content.replace(
    /const \[response, setResponse\] = useState\(null\);/,
    `const [response, setResponse] = useState<PromptResponse | null>(null);`
  );
  
  // Fix event handlers
  content = content.replace(
    /const handlePromptChange = \(e\) => {/,
    `const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {`
  );
  
  content = content.replace(
    /const handleModelChange = \(e\) => {/,
    `const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {`
  );
  
  content = content.replace(
    /const handleTemperatureChange = \(e\) => {/,
    `const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {`
  );
  
  content = content.replace(
    /const handleMaxTokensChange = \(e\) => {/,
    `const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {`
  );
  
  content = content.replace(
    /const handleSubmit = async \(e\) => {/,
    `const handleSubmit = async (e: React.FormEvent) => {`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed PromptModule component at ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('Starting function type fixes...');
  
  try {
    // Fix components with function type issues
    fixProjectCardComponent();
    fixSidebarNavComponent();
    fixNavItemComponent();
    fixButtonComponent();
    fixModalComponent();
    fixDataTableComponent();
    fixJobsPage();
    fixProjectDetailsComponent();
    fixProjectFormComponent();
    fixPromptModuleComponent();
    
    // Run TypeScript compiler to check for errors
    console.log('Running TypeScript compiler to check for errors...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'inherit' });
      console.log('TypeScript compilation successful!');
    } catch (error) {
      console.error('TypeScript compilation failed. Some manual fixes may be required.');
    }
    
    console.log('\nFunction type fixes completed!');
    
  } catch (error) {
    console.error('Error fixing function type issues:', error);
  }
}

// Run the script
main().catch(console.error); 