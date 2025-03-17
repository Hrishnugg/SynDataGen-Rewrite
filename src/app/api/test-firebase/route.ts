/**
 * Firebase/Firestore Test API
 * 
 * This endpoint provides a simple way to test the Firestore connection
 * and verify that credentials are working properly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreService } from '@/lib/api/services/firestore-service';
import { withRetry } from '@/lib/utils/retry';

/**
 * Test Firestore connection and credentials
 */
export async function GET(req: NextRequest) {
  try {
    // Get the Firestore service with retry logic
    const firestoreService = await withRetry(
      async () => await getFirestoreService({
        enabled: true,
        defaultTtlSeconds: 60,
        maxEntries: 100
      }),
      { 
        maxRetries: 3, 
        initialDelayMs: 500,
        onRetry: (attempt, delay, error) => {
          console.log(`Retrying Firestore service initialization (attempt ${attempt})...`);
        }
      }
    );
    
    // Create a test document with timestamp
    const testCollection = '_test_connection';
    const testDocId = `test_${Date.now()}`;
    const testData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      testId: testDocId
    };
    
    // Try to write to Firestore
    await firestoreService.create(`${testCollection}`, testData);
    
    // Try to read from Firestore
    const readResult = await firestoreService.getById(testCollection, testDocId);
    
    // Clean up test document
    await firestoreService.delete(testCollection, testDocId);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Firestore connection test successful',
      writeTest: 'passed',
      readTest: 'passed',
      readResult: readResult,
      cleanupTest: 'passed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Firebase test error:', error);
    
    // Format the error for the response
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error instanceof Error && (error as any).code 
      ? (error as any).code 
      : 'unknown';
    
    return NextResponse.json({
      success: false,
      message: 'Firestore connection test failed',
      error: errorMessage,
      errorCode: errorCode,
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
}