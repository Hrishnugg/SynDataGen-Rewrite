/**
 * Diagnostic API for Firebase key format
 * 
 * This API allows checking the format of the Firebase private key
 * without exposing the key itself.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get the key from environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!privateKey) {
      return NextResponse.json({
        status: 'error',
        message: 'FIREBASE_PRIVATE_KEY not found in environment variables'
      });
    }
    
    // Analyze the key format
    const analysis = {
      length: privateKey.length,
      containsEscapedNewlines: privateKey.includes('\\n'),
      containsActualNewlines: privateKey.includes('\n'),
      startsWithBeginMarker: privateKey.startsWith('-----BEGIN PRIVATE KEY-----'),
      endsWithEndMarker: privateKey.endsWith('-----END PRIVATE KEY-----'),
      firstFewChars: privateKey.substring(0, 20) + '...',
      lastFewChars: '...' + privateKey.substring(privateKey.length - 20),
    };
    
    // Format check
    const isProperlyFormatted = 
      privateKey.startsWith('-----BEGIN PRIVATE KEY-----') && 
      privateKey.endsWith('-----END PRIVATE KEY-----') &&
      privateKey.includes('\n');
    
    // Return the analysis
    return NextResponse.json({
      status: 'success',
      keyAnalysis: analysis,
      isProperlyFormatted
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error analyzing private key'
    });
  }
}