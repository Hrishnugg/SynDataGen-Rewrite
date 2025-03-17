/**
 * Firebase Status API
 * 
 * This API provides a simple status check for Firebase credentials
 * without requiring authentication and without exposing sensitive details.
 */

import { NextResponse } from 'next/server';
import { validateFirebaseCredentials } from '@/lib/gcp/firestore/initFirestore';
import { getCredentialManager } from '@/lib/api/services/credential-manager';

export async function GET() {
  try {
    // Get Firebase credentials from environment
    const firebaseCredentials = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };

    // Basic validation check
    const validationResult = validateFirebaseCredentials(firebaseCredentials);
    
    // Get credential status from credential manager
    const manager = getCredentialManager();
    const credStatus = await manager.getCredentialStatus();
    
    // Simplified status response without sensitive details
    return NextResponse.json({
      status: 'success',
      environment: process.env.NODE_ENV,
      mockFirebase: process.env.MOCK_FIREBASE,
      credentialsAvailable: validationResult.valid,
      credentialsError: validationResult.error,
      firebase: {
        available: 'available' in credStatus ? credStatus.available : false,
        source: 'source' in credStatus ? credStatus.source : 'error-fallback',
        error: 'error' in credStatus ? credStatus.error : undefined,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID || 'not set',
        clientEmailAvailable: !!process.env.FIREBASE_CLIENT_EMAIL,
        privateKeyAvailable: !!process.env.FIREBASE_PRIVATE_KEY,
        privateKeyFormat: process.env.FIREBASE_PRIVATE_KEY ? {
          length: process.env.FIREBASE_PRIVATE_KEY.length,
          properFormat: process.env.FIREBASE_PRIVATE_KEY.startsWith('-----BEGIN PRIVATE KEY-----') && 
                       process.env.FIREBASE_PRIVATE_KEY.endsWith('-----END PRIVATE KEY-----')
        } : 'not available'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error checking Firebase status'
    });
  }
}