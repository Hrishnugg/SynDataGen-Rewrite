/**
 * Firestore/Firebase Diagnostic API
 * 
 * This endpoint provides detailed diagnostics for Firestore/Firebase configuration
 * and connection status to help troubleshoot authentication issues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getFirebaseInitStatus, 
  areFirebaseCredentialsAvailable, 
  initializeFirebaseAdmin 
} from '@/lib/firebase';
import { areFirebaseCredentialsAvailable as areCredentialsAvailable } from '@/lib/services/credential-manager';
import { getFirestore } from '@/lib/services/db-service';
import { getFirestoreInstance } from '@/lib/gcp/firestore/initFirestore';
import * as os from 'os';

/**
 * GET handler for Firebase diagnostic endpoint
 * 
 * This endpoint provides detailed diagnostic information about Firebase initialization
 * and is only accessible to admin users.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = session.user.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Collect environment information
    const environment = {
      nodeEnv: process.env.NODE_ENV || 'not set',
      vercelEnv: process.env.VERCEL_ENV || 'not set',
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      }
    };

    // Check Firebase initialization status
    const firebaseStatus = getFirebaseInitStatus();
    
    // Check credential availability
    const credentialsAvailable = {
      firebase: areFirebaseCredentialsAvailable(),
      credentialManager: areCredentialsAvailable()
    };

    // Check environment variables (redacted for security)
    const envVars = {
      FIREBASE_SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT ? 'set' : 'not set',
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'set' : 'not set',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'set' : 'not set',
      FIREBASE_EMULATOR_HOST: process.env.FIREBASE_EMULATOR_HOST || 'not set',
      FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || 'not set',
    };

    // Attempt to initialize Firebase if not already initialized
    let initAttempt = null;
    if (!firebaseStatus.initialized) {
      try {
        await initializeFirebaseAdmin();
        initAttempt = { success: true };
      } catch (error: any) {
        initAttempt = { 
          success: false, 
          error: {
            message: error.message,
            name: error.name,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        };
      }
    }

    // Attempt to get Firestore instance
    let firestoreStatus = null;
    try {
      const db = await getFirestore(false);
      firestoreStatus = { 
        success: !!db,
        mock: db && 'getMockData' in db
      };
    } catch (error: any) {
      firestoreStatus = { 
        success: false, 
        error: {
          message: error.message,
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      };
    }

    // Attempt to get direct Firestore instance
    let directFirestoreStatus = null;
    try {
      const directDb = await getFirestoreInstance();
      directFirestoreStatus = { 
        success: !!directDb
      };
    } catch (error: any) {
      directFirestoreStatus = { 
        success: false, 
        error: {
          message: error.message,
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      };
    }

    // Return diagnostic information
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment,
      firebase: {
        status: firebaseStatus,
        credentialsAvailable,
        envVars,
        initAttempt: initAttempt || 'not attempted',
      },
      firestore: {
        dbService: firestoreStatus,
        directInstance: directFirestoreStatus
      }
    });
  } catch (error: any) {
    console.error('Firebase diagnostic error:', error);
    return NextResponse.json({
      error: 'Diagnostic error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 