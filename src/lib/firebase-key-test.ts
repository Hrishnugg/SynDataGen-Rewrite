/**
 * Firebase Private Key Test Utility
 * 
 * This script helps diagnose issues with Firebase private key formatting.
 */

// Check if private key is properly formatted
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log('=== FIREBASE PRIVATE KEY TEST ===');
console.log('Key length:', privateKey?.length || 'undefined');
console.log('Key starts with:', privateKey?.substring(0, 30));
console.log('Key ends with:', privateKey?.substring(privateKey?.length - 30));
console.log('Contains BEGIN marker:', privateKey?.includes('BEGIN PRIVATE KEY'));
console.log('Contains END marker:', privateKey?.includes('END PRIVATE KEY'));
console.log('Contains newlines (\\n):', privateKey?.includes('\\n'));
console.log('Contains actual newlines:', privateKey?.includes('\n'));

// Try processing the key
console.log('\n=== PROCESSING TEST ===');
if (privateKey) {
  try {
    let processedKey = privateKey;
    
    // Check if surrounded by quotes and remove them
    if (processedKey.startsWith('"') && processedKey.endsWith('"')) {
      console.log('Removing surrounding quotes');
      processedKey = processedKey.slice(1, -1);
    }
    
    // Replace escaped newlines with actual newlines
    if (processedKey.includes('\\n')) {
      console.log('Replacing \\n with actual newlines');
      processedKey = processedKey.replace(/\\n/g, '\n');
    }
    
    // Verify the processed key
    console.log('Processed key length:', processedKey.length);
    console.log('Processed key contains BEGIN marker:', processedKey.includes('-----BEGIN PRIVATE KEY-----'));
    console.log('Processed key contains END marker:', processedKey.includes('-----END PRIVATE KEY-----'));
    console.log('Processed key contains actual newlines:', processedKey.includes('\n'));
    
    // Count the number of newlines
    const newlineCount = (processedKey.match(/\n/g) || []).length;
    console.log('Number of newlines in processed key:', newlineCount);
    
    // Check if the key has proper structure with BEGIN/END markers on separate lines
    const lines = processedKey.split('\n');
    console.log('Number of lines after split:', lines.length);
    console.log('First line:', lines[0]);
    console.log('Last line:', lines[lines.length - 1]);
    
    // Check if the key is formatted correctly for Firebase Admin
    const isFormatted = processedKey.startsWith('-----BEGIN PRIVATE KEY-----') && 
                      processedKey.endsWith('-----END PRIVATE KEY-----') &&
                      processedKey.includes('\n');
    console.log('Key is properly formatted:', isFormatted);
    
    // If the key is still not formatted correctly, try another approach
    if (!isFormatted) {
      console.log('\n=== LAST RESORT FORMATTING ===');
      
      // Extract just the base64 content between the markers
      const base64Content = processedKey.replace(/[^A-Za-z0-9+/=]/g, '');
      
      // Reformat with proper BEGIN/END markers and newlines
      const reformattedKey = `-----BEGIN PRIVATE KEY-----\n${base64Content}\n-----END PRIVATE KEY-----`;
      
      console.log('Reformatted key length:', reformattedKey.length);
      console.log('Reformatted key contains BEGIN marker:', reformattedKey.includes('-----BEGIN PRIVATE KEY-----'));
      console.log('Reformatted key contains END marker:', reformattedKey.includes('-----END PRIVATE KEY-----'));
      console.log('Reformatted key starts with:', reformattedKey.substring(0, 30));
      console.log('Reformatted key ends with:', reformattedKey.substring(reformattedKey.length - 30));
    }
  } catch (error) {
    console.error('Error processing key:', error);
  }
} else {
  console.log('No private key found in environment');
}

console.log('\n=== ENVIRONMENT TEST ===');
// Check for all Firebase-related environment variables
const envKeys = Object.keys(process.env).filter(
  key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP')
);

console.log('Firebase-related environment variables:', 
  envKeys.map(k => k.includes('KEY') ? `${k}: [REDACTED]` : `${k}: ${process.env[k]}`));

console.log('=== END TEST ===');