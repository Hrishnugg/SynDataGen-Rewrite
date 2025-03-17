# TypeScript Error Fixing Scripts

This directory contains a set of scripts designed to systematically address and fix TypeScript errors in the SynDataGen codebase.

## Overview

These scripts were created to address TypeScript errors that emerged after a codebase reorganization, particularly focusing on:

1. **Import path errors** - Incorrect module paths after restructuring
2. **Nullable reference errors** - Missing null checks and optional chaining
3. **Component prop type errors** - Inconsistencies in component prop interfaces

## Available Scripts

### Combined Script (Recommended)

The `fix-typescript-errors.js` script runs all the individual fixing scripts in sequence:

```bash
# Dry run (preview changes without modifying files)
node scripts/fix-typescript-errors.js --dry-run

# Apply all fixes
node scripts/fix-typescript-errors.js

# Apply fixes with verbose logging
node scripts/fix-typescript-errors.js --verbose
```

#### Options
- `--dry-run`: Preview changes without modifying files
- `--verbose`: Show detailed logging
- `--skip-imports`: Skip the import path fixes
- `--skip-nullables`: Skip the nullable reference fixes
- `--skip-components`: Skip the component prop fixes
- `--focus-specific-files`: Focus only on known problematic files (for nullable fixes)

### Individual Scripts

#### Import Path Fixer

Fixes incorrect import paths after codebase reorganization:

```bash
# Dry run
node scripts/fix-import-paths.js --dry-run

# Apply fixes
node scripts/fix-import-paths.js
```

#### Nullable Reference Fixer

Adds optional chaining, null checks, and appropriate type guards:

```bash
# Dry run
node scripts/fix-nullable-refs.js --dry-run

# Focus on specific known problematic files
node scripts/fix-nullable-refs.js --focus-specific-files
```

#### Component Props Fixer

Fixes UI component prop type issues:

```bash
# Dry run
node scripts/fix-component-props.js --dry-run
```

## After Running Scripts

After running the scripts, it's recommended to:

1. Run TypeScript to check for any remaining errors:
   ```bash
   npx tsc --noEmit
   ```

2. Manually review the changes made by the scripts

3. Test the application functionality to ensure fixes didn't introduce new issues

## Error Categories & Patterns

### Import Path Errors
- Path mappings from `@/lib/utils` to `@/lib/utils/utils`
- Incorrect component import paths
- Missing file extensions

### Nullable Reference Errors
- `containerRef.current` accessed without null check
- DOM methods called on potentially null elements
- Material and uniform access without proper checks
- Database calls without null checks

### Component Prop Errors
- Missing variants in UI components
- Incorrect ref handling
- Missing or incorrect prop types
- Required props not marked as optional 