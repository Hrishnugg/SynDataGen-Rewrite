import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/api/services/db-service';

export async function GET() {
  try {
    // Get Firestore service - await the Promise to get the actual service
    const firestoreService = await getFirestore();
    
    // Test the connection by listing collections
    const collections = await firestoreService.query(
      '_connection_test',
      { limit: 1 }
    );
    
    // Create a test document to verify write access
    const testId = await firestoreService.create('_connection_test', {
      timestamp: new Date(),
      message: 'Connection test successful'
    });
    
    // Clean up the test document
    await firestoreService.delete('_connection_test', testId);

    return NextResponse.json({ 
      message: "Firestore database connection successful",
      status: "ok" 
    });

  } catch (error) {
    console.error('Database connection error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      message: "Database connection failed",
      error: errorMessage,
      status: "error"
    }, {
      status: 500
    });
  }
}