/**
 * Enhanced Firebase/Firestore Diagnostic API
 * 
 * This endpoint provides comprehensive diagnostics for Firebase configuration,
 * Firestore connection status, and authentication setup to help troubleshoot issues.
 * 
 * It performs live testing of credential validity and service availability.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/firebase/auth';
import { 
  getFirebaseInitStatus, 
  areFirebaseCredentialsAvailable,
  initializeFirebaseAdmin,
  getFirebaseAuth,
  getFirebaseFirestore
} from '@/lib/firebase';
import { validateFirebaseCredentials } from '@/lib/gcp/firestore/initFirestore';
import { ServiceAccountCredentials } from '@/lib/gcp/firestore/firestore-utils';
import { getFirestoreStatus } from '@/lib/gcp/firestore/firestore-utils';
import * as os from 'os';
import { getCredentialManager } from '@/features/data-generation/services/credential-manager-service';

/**
 * GET handler for Firebase diagnostic endpoint
 * Provides comprehensive diagnostics for Firebase setup
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Gather system environment info
    const env = process.env.NODE_ENV || 'development';
    const hostname = os.hostname();
    
    // Session information for authentication diagnostics
    let session = null;
    let sessionError = null;
    
    try {
      session = await getServerSession(authOptions);
    } catch (e) {
      sessionError = e instanceof Error ? e.message : String(e);
    }
    
    // Firebase/Firestore status checks
    const firebaseInitStatus = await getFirebaseInitStatus();
    const credentialsAvailable = await areFirebaseCredentialsAvailable();
    
    // Attempt to check credentials if they're available
    let credentialStatus = 'unavailable';
    if (credentialsAvailable) {
      try {
        const credentialManager = await getCredentialManager();
        const credentials = await credentialManager.getFirebaseCredentials();
        
        // Validate the credentials using the proper parameter
        const validationResult = validateFirebaseCredentials(credentials);
        if (validationResult.valid) {
          credentialStatus = 'valid';
        } else {
          credentialStatus = `invalid: ${validationResult.error || 'unknown error'}`;
        }
      } catch (e) {
        credentialStatus = `error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    
    // Check Firestore connection
    let firestoreStatus = 'unknown';
    try {
      firestoreStatus = await getFirestoreStatus();
    } catch (e) {
      firestoreStatus = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
    
    // Build comprehensive response
    const diagnostics = {
      timestamp: new Date().toISOString(),
      requestDuration: Date.now() - startTime,
      environment: {
        node_env: env,
        hostname: hostname,
        platform: os.platform(),
        node_version: process.version
      },
      authentication: {
        session_available: !!session,
        session_error: sessionError,
        auth_options_available: !!authOptions
      },
      firebase: {
        credentials_available: credentialsAvailable,
        credential_status: credentialStatus,
        initialized: firebaseInitStatus.initialized,
        initialization_error: firebaseInitStatus.error
      },
      firestore: {
        status: firestoreStatus
      }
    };
    
    return NextResponse.json(diagnostics);
    
  } catch (e) {
    console.error('Firebase diagnostic endpoint error:', e);
    
    return NextResponse.json({
      error: 'Failed to generate Firebase diagnostics',
      message: e instanceof Error ? e.message : String(e),
      timestamp: new Date().toISOString(),
      requestDuration: Date.now() - startTime
    }, {
      status: 500
    });
  }
}