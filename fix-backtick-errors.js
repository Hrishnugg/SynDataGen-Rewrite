const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'src/lib/api/services/firestore-service.ts',
  'src/features/data-generation/services/job-management-service.ts',
  'src/lib/gcp/firestore/initFirestore.ts',
  'src/lib/gcp/serviceAccount.ts'
];

// Read a file into a string
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Write a string to a file
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    return false;
  }
}

// Replace all template literal backticks with single quotes
function fixTemplateStrings(content) {
  // Track if we're inside a template string
  let inTemplate = false;
  let result = '';
  let currentTemplate = '';
  
  // Process the content character by character
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    // Handle backticks
    if (char === '`') {
      if (inTemplate) {
        // Closing backtick - convert the template string to a regular string
        inTemplate = false;
        
        // Check if the template has ${} expressions
        if (currentTemplate.includes('${')) {
          // Replace ${var} with ' + var + '
          let processedTemplate = currentTemplate;
          let varExpressions = [];
          let varStartIndex = processedTemplate.indexOf('${');
          
          while (varStartIndex !== -1) {
            const varEndIndex = processedTemplate.indexOf('}', varStartIndex);
            if (varEndIndex !== -1) {
              const varExpression = processedTemplate.substring(varStartIndex + 2, varEndIndex);
              varExpressions.push(varExpression);
              processedTemplate = processedTemplate.substring(0, varStartIndex) + 
                                 '#VAR#' + 
                                 processedTemplate.substring(varEndIndex + 1);
            } else {
              break;
            }
            varStartIndex = processedTemplate.indexOf('${', varStartIndex + 1);
          }
          
          // Replace #VAR# with ' + var + '
          const parts = processedTemplate.split('#VAR#');
          let finalString = "'" + parts[0] + "'";
          
          for (let j = 0; j < varExpressions.length; j++) {
            finalString += ' + ' + varExpressions[j] + ' + ';
            if (j < parts.length - 1) {
              finalString += "'" + parts[j + 1] + "'";
            } else {
              finalString += "''";
            }
          }
          
          result += finalString;
        } else {
          // Simple string with no expressions
          result += "'" + currentTemplate + "'";
        }
        
        currentTemplate = '';
      } else {
        // Opening backtick - start collecting template string content
        inTemplate = true;
        currentTemplate = '';
      }
    } else if (inTemplate) {
      // Accumulate characters inside the template
      currentTemplate += char;
    } else {
      // Pass through characters outside templates
      result += char;
    }
  }
  
  return result;
}

// Fix issues with console.log statements
function fixConsoleStatements(content) {
  // Replace backticked string in console.log with normal strings
  const consolePattern = /console\.(log|error|warn|info|debug)\(`([^`]*)`(.*)\);/g;
  return content.replace(consolePattern, (match, method, message, args) => {
    // Check if the message contains template expressions
    if (message.includes('${')) {
      // Replace ${var} with ' + var + '
      let result = 'console.' + method + '(';
      let processedMessage = message;
      let varStartIndex = processedMessage.indexOf('${');
      
      if (varStartIndex !== -1) {
        const parts = [];
        const expressions = [];
        let lastEndIndex = 0;
        
        while (varStartIndex !== -1) {
          const varEndIndex = processedMessage.indexOf('}', varStartIndex);
          if (varEndIndex !== -1) {
            // Add text before the expression
            if (varStartIndex > lastEndIndex) {
              parts.push(processedMessage.substring(lastEndIndex, varStartIndex));
            }
            
            // Add the expression
            expressions.push(processedMessage.substring(varStartIndex + 2, varEndIndex));
            
            lastEndIndex = varEndIndex + 1;
          } else {
            break;
          }
          varStartIndex = processedMessage.indexOf('${', lastEndIndex);
        }
        
        // Add the remaining text
        if (lastEndIndex < processedMessage.length) {
          parts.push(processedMessage.substring(lastEndIndex));
        }
        
        // Build the new string
        result += "'" + parts[0] + "'";
        for (let i = 0; i < expressions.length; i++) {
          result += ' + ' + expressions[i];
          if (i + 1 < parts.length) {
            result += " + '" + parts[i + 1] + "'";
          }
        }
      } else {
        result += "'" + processedMessage + "'";
      }
      
      if (args && args.trim() !== '') {
        result += args;
      }
      
      result += ');';
      return result;
    } else {
      // Simple string with no expressions
      return 'console.' + method + '(\'' + message + '\'' + args + ');';
    }
  });
}

// Helper function to fix some common error patterns
function fixCommonErrorPatterns(content) {
  // Fix common issues with template literals in error messages
  let fixed = content;
  
  // Fix semicolons in object properties
  fixed = fixed.replace(/(\w+)\s*:\s*([^,;{}]+)\s*;(?!\s*$)/g, '$1: $2,');
  
  // Fix import statements with semicolons
  fixed = fixed.replace(/import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]\s*;/g, 'import {$1} from \'$2\';');
  
  // Fix interface properties with semicolons
  fixed = fixed.replace(/(\w+)\s*:\s*([^,;{}]+)\s*;(?=\s*\w+\s*:)/g, '$1: $2,');
  
  // Fix if statements with semicolons
  fixed = fixed.replace(/if\s*\(([^)]+)\)\s*;/g, 'if ($1)');
  
  // Fix function parameter type declarations
  fixed = fixed.replace(/(\w+)\s*:\s*([^,)]+)\s*;(?=\s*,|\s*\))/g, '$1: $2');
  
  // Fix parameter list separators
  fixed = fixed.replace(/(\w+\s*:\s*[^,);]+)\s*(?=\s*\w+\s*:)/g, '$1, ');
  
  // Fix missing commas in function parameter lists
  fixed = fixed.replace(/(\w+\s*:\s*[^,);]+)\s*(?=\s*\w+\s*:)/g, '$1, ');
  
  // Fix error in FirestoreService error property
  fixed = fixed.replace(/error.messag, e/g, 'error.message');
  
  // Fix messag,e pattern
  fixed = fixed.replace(/messag,e/g, 'message');
  
  // Fix missing commas in object literals
  fixed = fixed.replace(/(\w+)\s*:\s*([^,;{}]+)\s*(?=\s*\w+\s*:)/g, '$1: $2,');
  
  // Fix some specific errors in firestore-service.ts
  fixed = fixed.replace(/function\s+getFirestoreService\s*\(/g, 'export async function getFirestoreService(');
  
  return fixed;
}

// Main function to process each file
function processFile(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  
  console.log(`Processing ${filePath}...`);
  
  const content = readFile(fullPath);
  if (!content) return;
  
  let fixed = content;
  
  // Apply fixes
  fixed = fixCommonErrorPatterns(fixed);
  fixed = fixConsoleStatements(fixed);
  fixed = fixTemplateStrings(fixed);
  
  // Write the fixed content if changes were made
  if (fixed !== content) {
    if (writeFile(fullPath, fixed)) {
      console.log(`✅ Fixed template literals and backtick issues in ${filePath}`);
    }
  } else {
    console.log(`No changes needed in ${filePath}`);
  }
}

// Process all files
filesToFix.forEach(processFile);

console.log('Template literal and backtick fixing completed.'); 