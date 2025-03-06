/**
 * Private Key Format Fixer
 * 
 * This utility provides a solution for the Firebase private key formatting issues
 * that we're encountering in the project.
 */

/**
 * Ensures a Firebase private key is properly formatted
 * This addresses several common issues that can happen with private keys:
 * 1. Keys with escaped newlines (\n) instead of actual newlines
 * 2. Keys missing proper BEGIN/END markers
 * 3. Keys with incorrect line breaks
 * 4. Keys surrounded by extra quotes
 */
export function fixPrivateKey(key: string | undefined): string {
  if (!key) {
    console.error('[KeyFixer] Key is undefined or empty');
    throw new Error('Cannot fix an undefined or empty private key');
  }
  
  console.log('[KeyFixer] Processing private key of length:', key.length);
  
  // Start with the original key
  let processedKey = key;
  
  // Step 1: Remove surrounding quotes if present
  if (processedKey.startsWith('"') && processedKey.endsWith('"')) {
    console.log('[KeyFixer] Removing surrounding quotes');
    processedKey = processedKey.slice(1, -1);
  }
  
  // Step 2: Replace escaped newlines with actual newlines
  if (processedKey.includes('\\n')) {
    console.log('[KeyFixer] Replacing escaped newlines');
    processedKey = processedKey.replace(/\\n/g, '\n');
  }
  
  // Step 3: Check if the key is properly formatted after the initial processing
  const hasBeginMarker = processedKey.includes('-----BEGIN PRIVATE KEY-----');
  const hasEndMarker = processedKey.includes('-----END PRIVATE KEY-----');
  const hasNewlines = processedKey.includes('\n');
  
  // If already properly formatted, return it
  if (hasBeginMarker && hasEndMarker && hasNewlines) {
    const beginsWithMarker = processedKey.trim().startsWith('-----BEGIN PRIVATE KEY-----');
    const endsWithMarker = processedKey.trim().endsWith('-----END PRIVATE KEY-----');
    
    if (beginsWithMarker && endsWithMarker) {
      console.log('[KeyFixer] Key is already properly formatted');
      return processedKey;
    }
  }
  
  // Step 4: If still not properly formatted, try a more aggressive approach:
  // Extract just the base64 content and reformat completely
  console.log('[KeyFixer] Key still not properly formatted, applying advanced fix');
  
  try {
    // Extract all base64 characters (remove anything that's not valid base64)
    const base64Pattern = /[A-Za-z0-9+/=]+/g;
    const matches = processedKey.match(base64Pattern);
    
    if (!matches || matches.length === 0) {
      console.error('[KeyFixer] Could not extract base64 content from key');
      throw new Error('Invalid private key format - could not extract base64 content');
    }
    
    // Join all base64 parts (in case they were separated by non-base64 chars)
    const base64Content = matches.join('');
    
    // Create a properly formatted PEM key
    const reformattedKey = `-----BEGIN PRIVATE KEY-----\n${base64Content}\n-----END PRIVATE KEY-----`;
    
    console.log('[KeyFixer] Successfully reformatted key:', {
      length: reformattedKey.length,
      startsWithMarker: reformattedKey.startsWith('-----BEGIN PRIVATE KEY-----'),
      endsWithMarker: reformattedKey.endsWith('-----END PRIVATE KEY-----'),
      hasNewlines: reformattedKey.includes('\n')
    });
    
    return reformattedKey;
  } catch (error) {
    console.error('[KeyFixer] Error during advanced key formatting:', error);
    throw new Error(`Failed to fix private key format: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Export a function that can be used in the Firebase initialization
export function getFixedFirebaseKey(): string {
  const originalKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!originalKey) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
  }
  
  try {
    return fixPrivateKey(originalKey);
  } catch (error) {
    console.error('[KeyFixer] Failed to fix Firebase private key:', error);
    throw error;
  }
}