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
import { authOptions } from '@/lib/auth';
import { 
  getFirebaseInitStatus, 
  areFirebaseCredentialsAvailable, 
  initializeFirebaseAdmin,
  getFirebaseAuth
} from '@/lib/firebase';
import { 
  areFirebaseCredentialsAvailable as areCredentialsAvailable,
  getCredentialManager,
  getFirebaseCredentials
} from '@/lib/services/credential-manager';
import { getFirestore } from '@/lib/services/db-service';
import { getFirestoreInstance, getFirestoreStatus } from '@/lib/gcp/firestore/initFirestore';
import * as os from 'os';
import { validateFirebaseCredentials } from '@/lib/gcp/firestore/initFirestore';

/**
 * GET handler for Firebase diagnostic endpoint
 * 
 * This enhanced endpoint provides comprehensive diagnostic information 
 * about the entire Firebase authentication stack.
 * 
 * For security, two levels of access are provided:
 * 1. Basic diagnostics - Available to all authenticated users
 * 2. Full diagnostics - Only available to admin users
 */
export async function GET(request: NextRequest) {
  // Start timing the diagnostic process
  const startTime = Date.now();
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const isAuthenticated = !!session?.user;
    const isAdmin = isAuthenticated && (session.user.role === 'admin' || session.user.isAdmin);
    
    // Security check - limit detailed information for non-admins
    if (!isAuthenticated) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to access diagnostic information'
      }, { status: 401 });
    }

    // Collect environment information
    const environment = {
      nodeEnv: process.env.NODE_ENV || 'not set',
      vercelEnv: process.env.VERCEL_ENV || 'not set',
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      processUptime: process.uptime(),
      systemUptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usage: Math.round((1 - os.freemem() / os.totalmem()) * 100) + '%'
      }
    };

    // Configuration check - examine environment variables
    const envVars = {
      // Firebase Core
      FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT ? 
        `set (${process.env.FIREBASE_SERVICE_ACCOUNT.length} chars)` : 'not set',
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'not set',
      // Firebase Services
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'not set',
      // Emulator Configuration
      FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || 'not set',
      FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || 'not set',
      FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'not set',
      // Development Settings
      MOCK_FIREBASE: process.env.MOCK_FIREBASE || 'not set',
      // Auth Configuration
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 
        `set (${process.env.NEXTAUTH_SECRET.length} chars)` : 'not set',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
    };

    // Check Firebase initialization status
    const firebaseStatus = getFirebaseInitStatus();
    
    // Get credential status from credential manager
    const credentialManager = getCredentialManager();
    const credentialStatus = await credentialManager.getCredentialStatus();
    
    // Check if credentials are available through various methods
    const credentialsAvailable = {
      firebase: areFirebaseCredentialsAvailable(),
      credentialManager: areCredentialsAvailable(),
      validationResult: validateFirebaseCredentials()
    };

    // Perform live service checks
    const serviceChecks: Record<string, any> = {};

    // 1. Attempt to initialize Firebase if not already initialized
    try {
      const wasInitialized = firebaseStatus.initialized;
      const initSuccess = initializeFirebaseAdmin();
      serviceChecks.firebaseInit = { 
        success: initSuccess,
        wasAlreadyInitialized: wasInitialized
      };
    } catch (error: any) {
      serviceChecks.firebaseInit = { 
        success: false, 
        error: {
          message: error.message,
          code: error.code,
          name: error.name
        }
      };
    }

    // 2. Check Firebase Auth
    try {
      const auth = getFirebaseAuth();
      serviceChecks.firebaseAuth = { 
        success: !!auth,
        available: !!auth
      };
    } catch (error: any) {
      serviceChecks.firebaseAuth = { 
        success: false, 
        error: {
          message: error.message,
          code: error.code,
          name: error.name
        }
      };
    }

    // 3. Check Firestore through service
    try {
      const db = await getFirestore(false);
      serviceChecks.firestoreService = { 
        success: !!db,
        mock: db && 'getMockData' in db
      };
    } catch (error: any) {
      serviceChecks.firestoreService = { 
        success: false, 
        error: {
          message: error.message,
          code: error.code,
          name: error.name
        }
      };
    }

    // 4. Check Firestore direct instance
    try {
      const firestoreInstance = await getFirestoreInstance();
      const firestoreDetailedStatus = getFirestoreStatus();
      serviceChecks.firestoreDirect = { 
        success: !!firestoreInstance,
        status: firestoreDetailedStatus
      };
    } catch (error: any) {
      serviceChecks.firestoreDirect = { 
        success: false, 
        error: {
          message: error.message,
          code: error.code,
          name: error.name
        }
      };
    }

    // 5. Test connection to Firestore with actual query if admin
    if (isAdmin) {
      try {
        const db = await getFirestore(false);
        // Attempt to query a simple system collection
        const testCollection = '_diagnostic_test';
        const testDocId = 'connection_test';
        const testDoc = await db.getDocument(testCollection, testDocId, false);
        
        // If test document doesn't exist, create it
        if (!testDoc) {
          await db.createDocument(testCollection, {
            id: testDocId,
            timestamp: new Date().toISOString(),
            testType: 'connection',
            environment: process.env.NODE_ENV
          });
          serviceChecks.firestoreWrite = { success: true };
        } else {
          // Update the existing document
          await db.updateDocument(testCollection, testDocId, {
            timestamp: new Date().toISOString(),
            lastChecked: new Date().toISOString()
          });
          serviceChecks.firestoreWrite = { success: true };
        }
        
        // Read back the document
        const updatedDoc = await db.getDocument(testCollection, testDocId, false);
        serviceChecks.firestoreRead = { 
          success: true,
          document: updatedDoc
        };
      } catch (error: any) {
        serviceChecks.firestoreQuery = { 
          success: false, 
          error: {
            message: error.message,
            code: error.code,
            name: error.name
          }
        };
      }
    }
    
    // Calculate total diagnostic run time
    const endTime = Date.now();
    const diagnosticTime = endTime - startTime;

    // Determine overall health status
    const isHealthy = serviceChecks.firebaseInit?.success && 
                     (serviceChecks.firestoreService?.success || serviceChecks.firestoreDirect?.success);
    
    // Return comprehensive diagnostic information
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      diagnosticTimeMs: diagnosticTime,
      overall: {
        healthy: isHealthy,
        environment: process.env.NODE_ENV,
        authProvider: 'firebase',
        firestoreAvailable: serviceChecks.firestoreService?.success || serviceChecks.firestoreDirect?.success,
        authAvailable: serviceChecks.firebaseAuth?.success
      },
      user: {
        authenticated: isAuthenticated,
        isAdmin,
        userId: session?.user?.id || null,
        email: session?.user?.email || null
      },
      environment,
      configuration: {
        envVars,
        nextAuthConfigured: envVars.NEXTAUTH_SECRET !== 'not set' && envVars.NEXTAUTH_URL !== 'not set',
        firebaseConfigured: credentialsAvailable.firebase || credentialsAvailable.credentialManager
      },
      firebase: {
        status: firebaseStatus,
        credentials: {
          available: credentialsAvailable,
          status: credentialStatus
        }
      },
      services: serviceChecks,
      // For admin users only, include detailed debug info
      ...(isAdmin ? {
        debug: {
          detailedFirestoreStatus: getFirestoreStatus(),
          initializationError: firebaseStatus.error,
          userSession: {
            expires: session?.expires,
            authenticated: !!session?.user,
            userId: session?.user?.id,
            userEmail: session?.user?.email
          }
        }
      } : {})
    });
  } catch (error: any) {
    console.error('Firebase diagnostic error:', error);
    return NextResponse.json({
      error: 'Diagnostic error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 