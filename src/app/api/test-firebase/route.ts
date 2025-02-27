/**
 * Firebase/Firestore Test API
 * 
 * This endpoint provides a simple way to test the Firestore connection
 * and verify that credentials are working properly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreService } from '@/lib/services/firestore-service';
import { withRetry } from '@/lib/utils/retry';

/**
 * Test Firestore connection and credentials
 */
export async function GET(req: NextRequest) {
  try {
    // Get the Firestore service with retry logic
    const firestoreService = await withRetry(
      async () => await getFirestoreService(true),
      {
        maxRetries: 3,
        initialDelayMs: 200,
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
    await firestoreService.setDocument(`${testCollection}/${testDocId}`, testData);
    
    // Try to read from Firestore
    const readResult = await firestoreService.getDocumentData(`${testCollection}/${testDocId}`);
    
    // Clean up test document
    await firestoreService.deleteDocument(`${testCollection}/${testDocId}`);
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Firestore connection test successful',
      writeTest: 'passed',
      readTest: 'passed',
      readResult,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('Firestore test failed:', error);
    
    // Determine error type and provide helpful message
    let errorType = 'unknown';
    let errorMessage = 'An unknown error occurred';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (errorMessage.includes('credential')) {
        errorType = 'credentials';
      } else if (errorMessage.includes('permission')) {
        errorType = 'permissions';
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        errorType = 'network';
      } else if (errorMessage.includes('not initialized') || errorMessage.includes('configuration')) {
        errorType = 'initialization';
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'Firestore connection test failed',
      error: errorMessage,
      errorType,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 