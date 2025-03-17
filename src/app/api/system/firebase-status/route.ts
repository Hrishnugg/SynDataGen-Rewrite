/**
 * Firebase Status API Endpoint
 * 
 * This endpoint provides diagnostic information about Firebase credentials
 * and the current connection status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/firebase/auth';
import { getFirestoreService } from '@/lib/api/services/firestore-service';
import { getFirebaseCredentials } from '@/lib/api/services/credential-manager';
import { areFirebaseCredentialsAvailable } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  // Check for admin authorization
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Authentication required' 
      },
      { status: 401 }
    );
  }
  
  try {
    // Build diagnostic information
    const diagnosticInfo: Record<string, any> = {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      credentialSources: {}
    };
    
    // Check for credential availability
    const hasCredentials = areFirebaseCredentialsAvailable();
    diagnosticInfo.credentialsAvailable = hasCredentials;
    
    // Check available env vars (redact sensitive values)
    const relevantEnvVars = Object.keys(process.env)
      .filter(key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('GCP'))
      .reduce((obj, key) => {
        if (key.toLowerCase().includes('key')) {
          obj[key] = process.env[key] ? `[PRESENT, ${process.env[key].length} chars]` : '[MISSING]';
        } else {
          obj[key] = process.env[key] || '[MISSING]';
        }
        return obj;
      }, {} as Record<string, string>);
    
    diagnosticInfo.environmentVariables = relevantEnvVars;
    
    // Try to get credential information
    let credentialError = null;
    let credentials = null;
    
    try {
      credentials = await getFirebaseCredentials();
      diagnosticInfo.credentialSources.credentials = {
        source: credentials?.source || 'unknown',
        projectId: credentials?.project_id || '[MISSING]',
        hasClientEmail: !!credentials?.client_email,
        hasPrivateKey: !!credentials?.private_key,
        usingAppDefault: !!credentials?.useAppDefault
      };
    } catch (error) {
      credentialError = error;
      diagnosticInfo.credentialSources.error = error instanceof Error ? 
        { message: error.message, name: error.name } : 
        String(error);
    }
    
    // Try to connect to Firestore
    let firestoreService = null;
    let firestoreError = null;
    let connectionStatus = 'error';
    let message = 'Firebase credentials not configured correctly';
    
    if (credentials) {
      try {
        // Try to initialize Firestore service
        firestoreService = await getFirestoreService({
          enabled: false, // Disable cache for the test
          defaultTtlSeconds: 0 // Required by CacheConfig interface
        }, true);
        
        // Try a quick operation to verify connection
        if (firestoreService) {
          // Perform a small test operation
          const testCollection = '_firebase_status_check';
          const testDocId = `test-${Date.now()}`;
          const testData = { timestamp: Date.now(), test: true };
          
          await firestoreService.createWithId(testCollection, testDocId, testData);
          const retrievedDoc = await firestoreService.getById(testCollection, testDocId);
          
          if (retrievedDoc) {
            await firestoreService.delete(testCollection, testDocId);
            
            connectionStatus = 'success';
            message = 'Connected to Firebase successfully';
            diagnosticInfo.connectionTest = { success: true };
          } else {
            connectionStatus = 'warning';
            message = 'Connected to Firebase but test operation failed';
            diagnosticInfo.connectionTest = { 
              success: false, 
              error: 'Could not retrieve test document' 
            };
          }
        }
      } catch (error) {
        firestoreError = error;
        connectionStatus = 'error';
        message = `Failed to connect to Firebase: ${error instanceof Error ? error.message : String(error)}`;
        diagnosticInfo.firestoreError = error instanceof Error ? 
          { message: error.message, name: error.name, stack: error.stack } : 
          String(error);
      }
    }
    
    // Return the diagnostic information
    return NextResponse.json({
      status: connectionStatus,
      message: message,
      details: diagnosticInfo
    });
    
  } catch (error) {
    console.error('Error checking Firebase status:', error);
    
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to check Firebase status',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
} 