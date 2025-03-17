/**
 * Install Dependencies for TypeScript Fixes
 * 
 * This script installs the necessary dependencies for the TypeScript fixes.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if package.json exists
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('package.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Read package.json
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error('Error reading package.json:', error);
  process.exit(1);
}

// Check if TypeScript is installed
const hasTypeScript = packageJson.dependencies?.typescript || packageJson.devDependencies?.typescript;
if (!hasTypeScript) {
  console.log('Installing TypeScript...');
  try {
    execSync('npm install --save-dev typescript', { stdio: 'inherit' });
    console.log('TypeScript installed successfully.');
  } catch (error) {
    console.error('Error installing TypeScript:', error);
    process.exit(1);
  }
}

// Check if ts-prune is installed
const hasTsPrune = packageJson.dependencies?.['ts-prune'] || packageJson.devDependencies?.['ts-prune'];
if (!hasTsPrune) {
  console.log('Installing ts-prune...');
  try {
    execSync('npm install --save-dev ts-prune', { stdio: 'inherit' });
    console.log('ts-prune installed successfully.');
  } catch (error) {
    console.error('Error installing ts-prune:', error);
    process.exit(1);
  }
}

// Check if tsconfig.json exists
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
if (!fs.existsSync(tsconfigPath)) {
  console.log('Creating tsconfig.json...');
  const tsconfig = {
    "compilerOptions": {
      "target": "es5",
      "lib": ["dom", "dom.iterable", "esnext"],
      "allowJs": true,
      "skipLibCheck": true,
      "strict": true,
      "forceConsistentCasingInFileNames": true,
      "noEmit": true,
      "esModuleInterop": true,
      "module": "esnext",
      "moduleResolution": "node",
      "resolveJsonModule": true,
      "isolatedModules": true,
      "jsx": "preserve",
      "incremental": true,
      "baseUrl": ".",
      "paths": {
        "@/*": ["src/*"]
      }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
    "exclude": ["node_modules"]
  };
  
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  console.log('tsconfig.json created successfully.');
}

// Create types directory if it doesn't exist
const typesDir = path.join(process.cwd(), 'src', 'types');
if (!fs.existsSync(typesDir)) {
  console.log('Creating types directory...');
  fs.mkdirSync(typesDir, { recursive: true });
  console.log('Types directory created successfully.');
}

console.log('\nAll dependencies installed successfully.');
console.log('You can now run the TypeScript fix scripts:');
console.log('node scripts/typescript-fixes/run-all-fixes.js'); 