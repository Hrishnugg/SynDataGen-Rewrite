/**
 * Firestore/Firebase Diagnostic API
 * 
 * This endpoint provides detailed diagnostics for Firestore/Firebase configuration
 * and connection status to help troubleshoot authentication issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreService } from '@/lib/services/firestore-service';
import { getFirestoreStatus } from '@/lib/gcp/firestore/initFirestore';
import { getCredentialManager } from '@/lib/services/credential-manager';

/**
 * Returns detailed diagnostics about Firestore credentials and connection
 */
export async function GET(req: NextRequest) {
  try {
    // Get credential manager to check credential status
    const credentialManager = getCredentialManager();
    const credentialStatus = await credentialManager.getCredentialStatus();
    
    // Safely try to get Firestore status
    let firestoreStatus;
    try {
      firestoreStatus = getFirestoreStatus();
    } catch (error) {
      firestoreStatus = {
        error: error instanceof Error ? error.message : 'Unknown error getting Firestore status',
        stack: error instanceof Error ? error.stack : undefined
      };
    }
    
    // Safely try to initialize the Firestore service
    let serviceStatus = { initialized: false, error: null };
    let connectionTestResult = { success: false, error: null };
    
    try {
      // Initialize service but don't throw if it fails
      const firestoreService = await getFirestoreService(false);
      serviceStatus = firestoreService.getStatus();
      
      // Try a simple connection test if initialized
      if (serviceStatus.isInitialized) {
        try {
          // Create a test document
          const testDoc = await firestoreService.getDocumentData('_diagnostics/test');
          connectionTestResult = {
            success: true,
            testDoc: testDoc || null
          };
        } catch (testError) {
          connectionTestResult = {
            success: false,
            error: testError instanceof Error ? testError.message : 'Unknown error during connection test'
          };
        }
      }
    } catch (error) {
      serviceStatus = {
        initialized: false,
        error: error instanceof Error ? error.message : 'Unknown error initializing Firestore service'
      };
    }
    
    // Get environment variables (sanitized)
    const relevantEnvVars = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'set' : 'not set',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'not set',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'set (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'not set',
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set',
      FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || 'not set',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set'
    };
    
    // Format for deployment environment
    const deploymentInfo = {
      environment: process.env.NODE_ENV || 'unknown',
      isVercel: !!process.env.VERCEL,
      isNetlify: !!process.env.NETLIFY,
      runtime: process.env.NEXT_RUNTIME || 'unknown',
      region: process.env.VERCEL_REGION || process.env.AWS_REGION || 'unknown'
    };
    
    // Gather all diagnostic data
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      deploymentInfo,
      environment: relevantEnvVars,
      credentialStatus,
      firestoreStatus,
      serviceStatus,
      connectionTestResult
    };
    
    return NextResponse.json(diagnosticData, { status: 200 });
  } catch (error) {
    console.error('Error in diagnostic endpoint:', error);
    
    return NextResponse.json({
      error: 'Failed to gather diagnostic information',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 