import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/services/db-service';

export async function GET() {
  try {
    // Get Firestore service
    const firestoreService = getFirestore();
    await firestoreService.init();
    
    // Test the connection by listing collections
    const collections = await firestoreService.query(
      '_connection_test',
      (collection) => collection.limit(1)
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
    return NextResponse.json(
      { error: "Failed to connect to Firestore database" },
      { status: 500 }
    );
  }
} 