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
      );
    }
  }
  
  // Step 6: Clean the base64 content of any non-base64 characters
  base64Content = base64Content
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');
  
  // Step 7: Format the key in the exact PEM format with correct line breaks
  // The proper format is:
  // - Header
  // - Newline
  // - Base64 content with line breaks every 64 characters
  // - Newline
  // - Footer
  const formattedLines = base64Content.match(/.{1,64}/g) || [];
  const formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedLines.join('\n')}\n-----END PRIVATE KEY-----`;
  
  return formattedKey;
}

/**
 * Diagnose issues with a private key
 * 
 * @param privateKey The private key to diagnose
 * @returns An object with diagnostic information
 */
export function diagnosePrivateKey(privateKey: string): Record<string, boolean | number> {
  if (!privateKey) {
    return {
      isEmpty: true,
      length: 0,
      hasHeader: false,
      hasFooter: false,
      hasEscapedNewlines: false,
      hasActualNewlines: false,
      isDoubleEscaped: false,
      hasWhitespace: false,
    };
  }
  
  return {
    isEmpty: privateKey.trim().length === 0,
    length: privateKey.length,
    hasHeader: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
    hasFooter: privateKey.includes('-----END PRIVATE KEY-----'),
    hasEscapedNewlines: privateKey.includes('\\n'),
    hasActualNewlines: privateKey.includes('\n'),
    isDoubleEscaped: privateKey.includes('\\\\n'),
    hasWhitespace: /\s/.test(privateKey),
    hasSurroundingQuotes: privateKey.startsWith('"') && privateKey.endsWith('"'),
    lineCount: privateKey.split('\n').length,
    base64ContentOnly: privateKey
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\r|\n|\s/g, '')
      .length
  };
}

/**
 * Validate that a private key has the correct format
 * 
 * @param privateKey The private key to validate
 * @returns True if the key is valid, false otherwise
 */
export function isValidPrivateKey(privateKey: string): boolean {
  if (!privateKey) {
    return false;
  }
  
  const hasHeader = privateKey.includes('-----BEGIN PRIVATE KEY-----');
  const hasFooter = privateKey.includes('-----END PRIVATE KEY-----');
  const hasNewlines = privateKey.includes('\n');
  
  return hasHeader && hasFooter && hasNewlines;
}

export default {
  fixPrivateKey,
  diagnosePrivateKey,
  isValidPrivateKey
};