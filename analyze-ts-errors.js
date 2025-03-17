const { exec } = require('child_process');
const fs = require('fs');

// Run TypeScript compiler and capture the output
exec('npx tsc --noEmit', { encoding: 'utf8' }, (error, stdout, stderr) => {
  if (error) {
    console.log('TypeScript compiler finished with errors. Analyzing...');
    
    // Parse the output to extract error information
    const errorsByFile = {};
    const lines = stderr.toString().split('\n').concat(stdout.toString().split('\n'));
    
    let currentFile = null;
    
    for (const line of lines) {
      // Look for file paths in error messages
      const fileMatch = line.match(/src\/([^:]+):(\d+):(\d+)/);
      if (fileMatch) {
        currentFile = `src/${fileMatch[1]}`;
        if (!errorsByFile[currentFile]) {
          errorsByFile[currentFile] = {
            count: 0,
            errors: []
          };
        }
        
        const lineNumber = parseInt(fileMatch[2], 10);
        const columnNumber = parseInt(fileMatch[3], 10);
        
        // Extract the error message
        const errorMatch = line.match(/error TS\d+: (.+)/);
        const errorMessage = errorMatch ? errorMatch[1] : 'Unknown error';
        
        errorsByFile[currentFile].count++;
        errorsByFile[currentFile].errors.push({
          line: lineNumber,
          column: columnNumber,
          message: errorMessage
        });
      }
    }
    
    // Sort files by error count
    const sortedFiles = Object.entries(errorsByFile)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([file, data]) => ({ file, count: data.count }));
    
    if (sortedFiles.length === 0) {
      console.log('No TypeScript errors found or could not parse the output.');
      return;
    }
    
    console.log('\nFiles with the most errors:');
    sortedFiles.slice(0, 10).forEach(({ file, count }) => {
      console.log(`${file}: ${count} errors`);
    });
    
    // Output total error count
    const totalErrors = sortedFiles.reduce((sum, { count }) => sum + count, 0);
    console.log(`\nTotal errors: ${totalErrors} across ${sortedFiles.length} files`);
    
    // Create a detailed report for the top problematic files
    console.log('\nDetailed analysis of top problematic files:');
    sortedFiles.slice(0, 5).forEach(({ file }) => {
      const fileData = errorsByFile[file];
      console.log(`\n${file} (${fileData.count} errors):`);
      
      // Group errors by type
      const errorTypes = {};
      fileData.errors.forEach(error => {
        if (!errorTypes[error.message]) {
          errorTypes[error.message] = [];
        }
        errorTypes[error.message].push(error.line);
      });
      
      // Display error types and their occurrences
      Object.entries(errorTypes)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([message, lines]) => {
          console.log(`  - ${message} (${lines.length} occurrences)`);
          if (lines.length <= 5) {
            console.log(`    Lines: ${lines.join(', ')}`);
          } else {
            console.log(`    Lines: ${lines.slice(0, 5).join(', ')}... (and ${lines.length - 5} more)`);
          }
        });
    });
  } else {
    console.log('TypeScript compiler finished without errors.');
  }
}); 