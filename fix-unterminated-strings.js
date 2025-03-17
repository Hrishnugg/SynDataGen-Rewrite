const fs = require('fs');
const path = require('path');

// Target files to fix
const filesToFix = [
  'src/lib/gcp/firestore/initFirestore.ts',
  'src/lib/gcp/serviceAccount.ts'
];

// Function to fix unterminated string literals
function fixUnterminatedStrings(content) {
  let fixed = content;
  
  // Fix console statements with unterminated strings
  fixed = fixed.replace(/console\.(log|error|warn|info|debug)\s*\(\s*"([^"]*)" \+ ([^)]+) \+ "\)/g, 
                        'console.$1("$2" + $3)');
  fixed = fixed.replace(/console\.(log|error|warn|info|debug)\s*\(\s*'([^']*)' \+ ([^)]+) \+ "\)/g, 
                        'console.$1(\'$2\' + $3)');
  
  // Fix throw new Error with unterminated strings
  fixed = fixed.replace(/throw new Error\("([^"]*)" \+ ([^)]+) \+ "\)/g, 
                        'throw new Error("$1" + $2)');
  
  // Fix string assignments with unterminated strings
  fixed = fixed.replace(/= ['"]([^'"]*)['"]\s*\+\s*([^;]+?)\s*\+\s*["'];/g, 
                        '= \'$1\' + $2;');
  
  // Fix quotes inside strings
  fixed = fixed.replace(/"\s*\+\s*'([^']+)'\s*\+\s*"/g, '" + \'$1\' + "');
  
  // Fix string concatenations ending with ;
  fixed = fixed.replace(/['"]([^'"]*)['"]\s*\+;/g, 
                        '\'$1\';');
  
  // Fix specific logger settings
  fixed = fixed.replace(/warn: \(messag,e: string, \.\.\.args: any\[\]\) => console\.warn\("\[Firestore\] " \+ message \+ ", \.\.\.args\),/g,
                      'warn: (message: string, ...args: any[]) => console.warn("[Firestore] " + message, ...args),');
  
  fixed = fixed.replace(/error: \(messag,e: string, \.\.\.args: any\[\]\) => console\.error\("\[Firestore\] " \+ message \+ ", \.\.\.args\),/g,
                      'error: (message: string, ...args: any[]) => console.error("[Firestore] " + message, ...args),');
  
  fixed = fixed.replace(/debug: \(messag,e: string, \.\.\.args: any\[\]\) => \{\s*if \(process\.env\.DEBUG_FIRESTORE\) \{\s*console\.log\("\[Firestore:DEBUG\] " \+ message \+ ", \.\.\.args\)/g,
                      'debug: (message: string, ...args: any[]) => {\n    if (process.env.DEBUG_FIRESTORE) {\n      console.log("[Firestore:DEBUG] " + message, ...args)');
  
  // Fix regex replace statements
  fixed = fixed.replace(/\.replace\(\/-----BEGIN PRIVATE KEY-----\/g, '\)/g,
                      '.replace(/-----BEGIN PRIVATE KEY-----/g, \'\')');
  
  fixed = fixed.replace(/\.replace\(\/\[\\r\\n\\s\]\/g, '\)/g,
                      '.replace(/[\\r\\n\\s]/g, \'\')');
  
  // Fix formattedKey assignment
  fixed = fixed.replace(/const formattedKey = '-----BEGIN PRIVATE KEY-----\\n' \+ formattedPrivateKey \+;/g,
                      'const formattedKey = \'-----BEGIN PRIVATE KEY-----\\n\' + formattedPrivateKey + \'-----END PRIVATE KEY-----\';');
  
  // Fix service account paths
  fixed = fixed.replace(/if \(db\) \{/g, 'if (db) {');
  
  // Fix return prefix string literal
  fixed = fixed.replace(/return prefix \? ' \+ prefix \+ '_' \+ id \+ " : id/g,
                       'return prefix ? prefix + \'_\' + id : id');
  
  // Fix method parameters and returns
  fixed = fixed.replace(/name: "projects\/" \+ projectId \+ ",/g,
                       'name: "projects/" + projectId,');
  
  fixed = fixed.replace(/displayNam, e: "SynDataGen - " \+ params\.customerName \+ ",/g,
                       'displayName: "SynDataGen - " + params.customerName,');
  
  fixed = fixed.replace(/const accountId = 'sa-' \+ sanitizedName \+ '-' \+ params\.customerId\.substring\(0, 6\) \+ ";/g,
                       'const accountId = \'sa-\' + sanitizedName + \'-\' + params.customerId.substring(0, 6);');
  
  fixed = fixed.replace(/const keySecretName = "sa-key-" \+ params\.customerId \+ ";/g, 
                       'const keySecretName = "sa-key-" + params.customerId;');
  
  fixed = fixed.replace(/const serviceAccountMember = "serviceAccount: " \+ serviceAccountEmail \+ ",/g,
                       'const serviceAccountMember = "serviceAccount:" + serviceAccountEmail,');
  
  // Fix parameter declarations
  fixed = fixed.replace(/name: 'projects\/' \+ projectId \+ '\/serviceAccounts\/' \+ email \+ ",/g, 
                       'name: \'projects/\' + projectId + \'/serviceAccounts/\' + email,');
  
  // Fix empty requestBody
  fixed = fixed.replace(/requestBody: \{\}/g, 'requestBody: {}');
  
  // Fix error messages
  fixed = fixed.replace(/throw new Error\("Service account email not found for customer " \+ customerId \+ "\);/g,
                       'throw new Error("Service account email not found for customer " + customerId);');
  
  return fixed;
}

// Process each file
filesToFix.forEach(filePath => {
  const fullPath = path.resolve(process.cwd(), filePath);
  console.log(`Processing ${filePath}...`);
  
  try {
    // Read the file
    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    
    // Apply fixes
    content = fixUnterminatedStrings(content);
    
    // Write the file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed unterminated string literals in ${filePath}`);
    } else {
      console.log(`No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Unterminated string literal fixing completed.'); 