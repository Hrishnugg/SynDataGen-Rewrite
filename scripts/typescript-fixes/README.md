# TypeScript Fixes

This directory contains scripts to automatically fix common TypeScript issues in the codebase.

## Overview

These scripts were created based on a comprehensive TypeScript audit of the codebase. They address issues such as:

- Replacing `any` types with proper interfaces
- Adding missing return type annotations to functions
- Fixing unsafe type assertions
- Correcting import-related issues

## Scripts

### 1. install-dependencies.js

Installs the necessary dependencies for the TypeScript fixes:
- Checks if TypeScript is installed and installs it if needed
- Checks if ts-prune is installed and installs it if needed
- Creates a tsconfig.json file if it doesn't exist
- Creates the src/types directory if it doesn't exist

### 2. fix-any-types.js

Replaces `any` types with proper interfaces and type definitions:
- Creates type definitions in the `src/types` directory
- Adds imports for the new types
- Replaces `any` type annotations with proper types

### 3. fix-missing-return-types.js

Adds explicit return type annotations to functions:
- Identifies functions without return types
- Adds appropriate return types based on function names and patterns
- Marks complex cases with `unknown` for manual review

### 4. fix-type-casting.js

Fixes unsafe type assertions:
- Replaces `as any` with safer alternatives
- Adds proper type imports
- Uses specific types for common patterns

### 5. fix-import-issues.js

Corrects import-related issues:
- Adds missing imports
- Removes unused imports
- Fixes import paths
- Checks for unused exports using ts-prune

### 6. fix-service-inconsistencies.js

Addresses inconsistencies in how services are used across the codebase:
- Creates a unified service provider for consistent service selection
- Updates API routes to use the service provider
- Fixes type mismatches between mock services and their interfaces
- Adds proper interface implementation to mock services

### 7. fix-dashboard-components.js

Addresses TypeScript issues in dashboard components:
- Creates proper type definition for extended user data
- Replaces unsafe type assertions using `(session?.user as any)?.role`
- Adds missing return type annotations for components
- Fixes index signature with `any` in Customer interface

### 8. fix-waitlist-types.js

Addresses TypeScript issues in waitlist and metadata models:
- Creates proper type definitions for metadata objects
- Replaces `Record<string, any>` with specific metadata interfaces
- Adds appropriate imports for metadata types
- Fixes metadata fields across all model files

### 9. run-all-fixes.js

Main script to run all fixes:
- Creates a backup of the codebase before making changes
- Runs all fix scripts in sequence
- Runs the TypeScript compiler to check for remaining issues
- Provides instructions for manual fixes

## Usage

First, install the necessary dependencies:

```bash
node scripts/typescript-fixes/install-dependencies.js
```

Then, to run all the TypeScript fixes:

```bash
node scripts/typescript-fixes/run-all-fixes.js
```

To run a specific fix script:

```bash
node scripts/typescript-fixes/fix-any-types.js
```

## Backup

The `run-all-fixes.js` script creates a backup of your codebase before making any changes. The backup is stored in a directory named `typescript-fixes-backup-{timestamp}` in the project root.

## Manual Review

After running the automated fixes, some issues will still require manual intervention:

1. **Complex Type Definitions**: Some complex types may need manual refinement
2. **Component Props**: Ensure all React components have proper prop interfaces
3. **API Responses**: Verify API response types match actual data structures
4. **Unknown Return Types**: Review functions where the automatic fix used `unknown` as the return type
5. **Remaining `any` Types**: Check for any remaining `any` types that weren't caught by the scripts

## Testing

After applying the fixes, it's important to:

1. Run the TypeScript compiler (`npx tsc --noEmit`)
2. Run all tests to ensure functionality wasn't broken
3. Manually test key features of the application

## Dependencies

These scripts require:
- Node.js
- TypeScript (for compiler checks)
- ts-prune (optional, for checking unused exports)

The `install-dependencies.js` script will install these dependencies for you. 