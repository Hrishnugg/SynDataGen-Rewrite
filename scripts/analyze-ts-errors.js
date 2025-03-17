const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'ts-error-analysis.json');
const VERBOSE = true;

// Run TypeScript compiler and capture errors
function getTsErrors() {
  try {
    execSync('npx tsc --noEmit --project tsconfig.clean.json', { stdio: 'pipe' });
  } catch (error) {
    return error.stdout.toString();
  }
  return '';
}

// Parse TypeScript error output
function parseErrors(errorOutput) {
  const lines = errorOutput.split('\n');
  const errors = [];
  
  for (const line of lines) {
    // Format: src/file.ts(123,45): error TS1234: Message
    const errorMatch = line.match(/^([^(]+)\((\d+),(\d+)\): error TS(\d+): (.*)/);
    if (errorMatch) {
      errors.push({
        file: errorMatch[1].trim(),
        line: parseInt(errorMatch[2]),
        column: parseInt(errorMatch[3]),
        code: `TS${errorMatch[4]}`,
        message: errorMatch[5],
        context: null
      });
    }
  }

  return errors;
}

// Analyze errors to find patterns
function analyzeErrors(errors) {
  const errorsByFile = {};
  const errorsByCode = {};
  const errorsByMessage = {};

  for (const error of errors) {
    // Group by file
    if (!errorsByFile[error.file]) {
      errorsByFile[error.file] = [];
    }
    errorsByFile[error.file].push(error);

    // Group by error code
    if (!errorsByCode[error.code]) {
      errorsByCode[error.code] = [];
    }
    errorsByCode[error.code].push(error);

    // Group by error message
    if (error.message) {
      const messageKey = error.message.substring(0, 30);
      if (!errorsByMessage[messageKey]) {
        errorsByMessage[messageKey] = [];
      }
      errorsByMessage[messageKey].push(error);
    }
  }

  // Sort files by error count
  const filesSorted = Object.keys(errorsByFile).sort(
    (a, b) => errorsByFile[b].length - errorsByFile[a].length
  );

  // Sort error codes by frequency
  const codesSorted = Object.keys(errorsByCode).sort(
    (a, b) => errorsByCode[b].length - errorsByCode[a].length
  );

  return {
    totalErrors: errors.length,
    fileCount: Object.keys(errorsByFile).length,
    mostProblematicFiles: filesSorted.slice(0, 5).map(file => ({
      file,
      errorCount: errorsByFile[file].length,
      commonErrors: getMostCommonErrors(errorsByFile[file], 3)
    })),
    mostCommonErrorCodes: codesSorted.slice(0, 5).map(code => {
      const firstError = errorsByCode[code][0];
      return {
        code,
        count: errorsByCode[code].length,
        message: firstError && firstError.message ? firstError.message : 'Unknown error',
        examples: errorsByCode[code].slice(0, 3).map(e => ({
          file: e.file,
          line: e.line,
          context: e.context
        }))
      };
    }),
    suggestedFixes: generateSuggestedFixes(errors, errorsByCode)
  };
}

// Get most common errors in a set
function getMostCommonErrors(errors, limit) {
  const errorCounts = {};
  
  for (const error of errors) {
    if (!error.code) continue;
    
    if (!errorCounts[error.code]) {
      errorCounts[error.code] = 0;
    }
    errorCounts[error.code]++;
  }
  
  return Object.keys(errorCounts)
    .sort((a, b) => errorCounts[b] - errorCounts[a])
    .slice(0, limit)
    .map(code => {
      const errorWithCode = errors.find(e => e.code === code);
      return {
        code,
        count: errorCounts[code],
        message: errorWithCode && errorWithCode.message ? errorWithCode.message : 'Unknown error'
      };
    });
}

// Generate suggested fixes based on error patterns
function generateSuggestedFixes(errors, errorsByCode) {
  const fixes = [];

  // TS1005: ',' expected
  if (errorsByCode['TS1005']) {
    fixes.push({
      errorCode: 'TS1005',
      description: 'Missing punctuation (commas, semicolons, etc.)',
      fixStrategy: 'Create a script to add missing punctuation at the end of lines',
      examples: errorsByCode['TS1005'].slice(0, 3).map(e => ({
        file: e.file,
        line: e.line,
        context: e.context,
        message: e.message || 'Unknown error'
      }))
    });
  }

  // TS1128: Declaration or statement expected
  if (errorsByCode['TS1128']) {
    fixes.push({
      errorCode: 'TS1128',
      description: 'Syntax error in code structure',
      fixStrategy: 'Check for missing braces, parentheses, or incorrect method chaining',
      examples: errorsByCode['TS1128'].slice(0, 3).map(e => ({
        file: e.file,
        line: e.line,
        context: e.context,
        message: e.message || 'Unknown error'
      }))
    });
  }

  // TS1434: Unexpected keyword or identifier
  if (errorsByCode['TS1434']) {
    fixes.push({
      errorCode: 'TS1434',
      description: 'Unexpected keyword in code',
      fixStrategy: 'Check for incorrect function declarations or misplaced keywords',
      examples: errorsByCode['TS1434'].slice(0, 3).map(e => ({
        file: e.file,
        line: e.line,
        context: e.context,
        message: e.message || 'Unknown error'
      }))
    });
  }

  return fixes;
}

// Read a file and extract the problematic lines with context
function extractErrorContext(file, errors, contextLines = 2) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    return errors.map(error => {
      const startLine = Math.max(0, error.line - contextLines - 1);
      const endLine = Math.min(lines.length - 1, error.line + contextLines - 1);
      
      const context = [];
      for (let i = startLine; i <= endLine; i++) {
        const prefix = i === error.line - 1 ? '> ' : '  ';
        context.push(`${prefix}${i + 1}: ${lines[i]}`);
      }
      
      return {
        ...error,
        expandedContext: context.join('\n')
      };
    });
  } catch (error) {
    console.error(`Error reading file ${file}:`, error);
    return errors;
  }
}

// Generate a fix script for common errors
function generateFixScript(analysis) {
  const fixScriptPath = path.join(ROOT_DIR, 'scripts', 'auto-fix-ts-errors.js');
  
  const scriptContent = `const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = process.cwd();
const DRY_RUN = false;
const VERBOSE = true;

// Files to process
const FILES_TO_FIX = [
${analysis.mostProblematicFiles.map(f => `  '${f.file.replace(/\\/g, '\\\\')}'`).join(',\n')}
];

// Common fixes to apply
const FIXES = [
  // Fix missing semicolons
  { pattern: /(\\w|\\)|\\}|"|')\\s*$/, replacement: '$1;' },
  
  // Fix missing commas in object literals
  { pattern: /(\\w|\\)|\\}|"|')\\s*\\n\\s*(\\w|\\[|\\{|"|')/, replacement: '$1,\\n  $2' },
  
  // Fix method chaining
  { pattern: /\\.(\\w+)\\s*\\n\\s*\\./, replacement: '.$1\\n      .' },
  
  // Fix if statements missing closing parenthesis
  { pattern: /(if\\s*\\([^)]*)(\\s*\\{)/, replacement: '$1)$2' }
];

// Process a file with the given fixes
function processFile(filePath) {
  try {
    if (VERBOSE) console.log(\`Processing \${filePath}...\`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    const lines = content.split('\\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let originalLine = line;
      
      for (const fix of FIXES) {
        // Only apply fix if we're not in a comment or string
        // This is a simplified check and might not catch all cases
        if (!line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
          line = line.replace(fix.pattern, fix.replacement);
        }
      }
      
      newLines.push(line);
      if (line !== originalLine) {
        modified = true;
        if (VERBOSE) {
          console.log(\`  Line \${i + 1}:\`);
          console.log(\`    - \${originalLine}\`);
          console.log(\`    + \${line}\`);
        }
      }
    }
    
    if (modified && !DRY_RUN) {
      fs.writeFileSync(filePath, newLines.join('\\n'));
      console.log(\`✅ Fixed \${filePath}\`);
    } else if (!modified) {
      console.log(\`ℹ️ No changes needed for \${filePath}\`);
    } else {
      console.log(\`🔍 Would fix \${filePath} (dry run)\`);
    }
    
    return modified;
  } catch (error) {
    console.error(\`❌ Error processing \${filePath}:\`, error);
    return false;
  }
}

// Main execution
function main() {
  console.log(\`🔧 Starting TypeScript error auto-fix\`);
  console.log(\`Mode: \${DRY_RUN ? 'DRY RUN' : 'LIVE'}\`);
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const file of FILES_TO_FIX) {
    try {
      const filePath = path.isAbsolute(file) ? file : path.join(ROOT_DIR, file);
      
      if (!fs.existsSync(filePath)) {
        console.warn(\`⚠️ File not found: \${filePath}\`);
        continue;
      }
      
      const modified = processFile(filePath);
      if (modified) fixedCount++;
    } catch (error) {
      console.error(\`❌ Error with file \${file}:\`, error);
      errorCount++;
    }
  }
  
  console.log(\`\\n📊 Summary:\`);
  console.log(\`  - Files processed: \${FILES_TO_FIX.length}\`);
  console.log(\`  - Files modified: \${fixedCount}\`);
  console.log(\`  - Errors encountered: \${errorCount}\`);
}

main();
`;

  fs.writeFileSync(fixScriptPath, scriptContent);
  console.log(`Generated fix script at: ${fixScriptPath}`);
  return fixScriptPath;
}

// Main execution
function main() {
  console.log('🔍 Analyzing TypeScript errors...');
  
  const errorOutput = getTsErrors();
  if (!errorOutput) {
    console.log('✅ No TypeScript errors found!');
    return;
  }
  
  const errors = parseErrors(errorOutput);
  console.log(`Found ${errors.length} TypeScript errors.`);
  
  const analysis = analyzeErrors(errors);
  
  // Add expanded context for the most problematic files
  for (const fileInfo of analysis.mostProblematicFiles) {
    const fileErrors = errors.filter(e => e.file === fileInfo.file);
    const errorsWithContext = extractErrorContext(fileInfo.file, fileErrors.slice(0, 5));
    fileInfo.errorExamples = errorsWithContext;
  }
  
  // Save analysis to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(analysis, null, 2));
  console.log(`📝 Analysis saved to: ${OUTPUT_FILE}`);
  
  // Generate fix script
  const fixScriptPath = generateFixScript(analysis);
  
  // Print summary
  console.log('\n📊 Error Analysis Summary:');
  console.log(`  - Total errors: ${analysis.totalErrors}`);
  console.log(`  - Files with errors: ${analysis.fileCount}`);
  console.log('\n🔴 Most problematic files:');
  for (const file of analysis.mostProblematicFiles) {
    console.log(`  - ${file.file}: ${file.errorCount} errors`);
  }
  
  console.log('\n🔢 Most common error types:');
  for (const error of analysis.mostCommonErrorCodes) {
    console.log(`  - ${error.code} (${error.count}): ${error.message}`);
  }
  
  console.log('\n🔧 Suggested fixes:');
  for (const fix of analysis.suggestedFixes) {
    console.log(`  - ${fix.errorCode}: ${fix.description}`);
    console.log(`    Strategy: ${fix.fixStrategy}`);
  }
  
  console.log('\n📋 Next steps:');
  console.log(`  1. Review the detailed analysis in ${OUTPUT_FILE}`);
  console.log(`  2. Run the auto-fix script: node ${fixScriptPath}`);
  console.log(`  3. For remaining errors, consider manual fixes or excluding problematic files`);
}

main(); 