/**
 * Firebase Private Key Fixer
 * 
 * This module provides utilities for fixing common issues with Firebase private keys
 * stored in environment variables. It handles:
 * 
 * 1. Replacing escaped newlines (\n) with actual newlines
 * 2. Adding missing BEGIN/END markers if needed
 * 3. Proper formatting with newlines as required by the JWT library
 * 4. Fixing ASN.1 parsing issues by proper PEM format enforcement
 */

/**
 * Fix common issues with Firebase private keys
 * 
 * @param privateKey The private key string to fix
 * @returns The fixed private key string
 */
export function fixPrivateKey(privateKey: string): string {
  if (!privateKey) {
    throw new Error('Private key is empty or undefined');
  }

  // Step 1: Clean the key of any potential formatting issues
  let fixedKey = privateKey.trim();
  
  // Step 2: Remove surrounding quotes if present
  if (fixedKey.startsWith('"') && fixedKey.endsWith('"')) {
    fixedKey = fixedKey.slice(1, -1).trim();
  }
  
  // Step 3: Handle escaped newlines
  if (fixedKey.includes('\\n')) {
    fixedKey = fixedKey.replace(/\\n/g, '\n');
  }
  
  // Step 4: Check if we need to add the PEM header/footer
  const hasHeader = fixedKey.includes('-----BEGIN PRIVATE KEY-----');
  const hasFooter = fixedKey.includes('-----END PRIVATE KEY-----');
  
  // Step 5: Extract just the base64 content for proper reformatting
  let base64Content = fixedKey;
  
  if (hasHeader && hasFooter) {
    // Extract content between header and footer
    const headerIndex = fixedKey.indexOf('-----BEGIN PRIVATE KEY-----');
    const footerIndex = fixedKey.indexOf('-----END PRIVATE KEY-----');
    
    if (headerIndex !== -1 && footerIndex !== -1 && footerIndex > headerIndex) {
      base64Content = fixedKey.substring(
        headerIndex + '-----BEGIN PRIVATE KEY-----'.length,
        footerIndex
      ).trim();
    }
  } else if (!hasHeader && !hasFooter) {
    // No header/footer, assume the whole string is base64 content
    base64Content = fixedKey;
  }
  
  // Step 6: Clean the base64 content
  base64Content = base64Content.replace(/\s/g, '');
  
  // Step 7: Format the key properly with correct line breaks
  // PEM format requires ~64 character lines
  const formattedContent = base64Content.match(/.{1,64}/g)?.join('\n') || '';
  
  // Step 8: Assemble the final key with proper header/footer
  return `-----BEGIN PRIVATE KEY-----\n${formattedContent}\n-----END PRIVATE KEY-----`;
}

/**
 * Diagnose issues with a private key
 * 
 * @param privateKey The private key to diagnose
 * @returns An object with diagnostic information
 */
export function diagnosePrivateKey(privateKey: string): Record<string, boolean | number> {
  const diagnosis = {
    isEmpty: false,
    hasEscapedNewlines: false,
    hasQuotes: false,
    hasHeader: false,
    hasFooter: false,
    length: 0,
    contentLength: 0,
    isValid: false
  };
  
  if (!privateKey || privateKey.trim() === '') {
    diagnosis.isEmpty = true;
    return diagnosis;
  }
  
  let cleanKey = privateKey.trim();
  diagnosis.length = cleanKey.length;
  
  // Check for quotes
  diagnosis.hasQuotes = cleanKey.startsWith('"') && cleanKey.endsWith('"');
  
  // Check for escaped newlines
  diagnosis.hasEscapedNewlines = cleanKey.includes('\\n');
  
  // Check for header/footer
  diagnosis.hasHeader = cleanKey.includes('-----BEGIN PRIVATE KEY-----');
  diagnosis.hasFooter = cleanKey.includes('-----END PRIVATE KEY-----');
  
  // Calculate content length
  if (diagnosis.hasHeader && diagnosis.hasFooter) {
    const content = cleanKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    diagnosis.contentLength = content.length;
  }
  
  // Check validity
  diagnosis.isValid = isValidPrivateKey(privateKey);
  
  return diagnosis;
}

/**
 * Validate that a private key has the correct format
 * 
 * @param privateKey The private key to validate
 * @returns True if the key is valid, false otherwise
 */
export function isValidPrivateKey(privateKey: string): boolean {
  if (!privateKey) return false;
  
  const fixed = fixPrivateKey(privateKey);
  
  // Check for minimum length
  if (fixed.length < 100) return false;
  
  // Check for required markers
  if (!fixed.includes('-----BEGIN PRIVATE KEY-----')) return false;
  if (!fixed.includes('-----END PRIVATE KEY-----')) return false;
  
  // Check if there's content between markers
  const content = fixed
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  return content.length > 0;
}

export default {
  fixPrivateKey,
  diagnosePrivateKey,
  isValidPrivateKey
};
