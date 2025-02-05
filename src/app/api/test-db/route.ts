import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("waitlist-serverless");
    
    // Test the connection
    await db.command({ ping: 1 });
    
    // Create the waitlist collection if it doesn't exist
    if (!(await db.listCollections({ name: "waitlist" }).hasNext())) {
      await db.createCollection("waitlist");
    }

    return NextResponse.json({ 
      message: "Database connection successful",
      status: "ok" 
    });

  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { error: "Failed to connect to database" },
      { status: 500 }
    );
  }
} 