import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/firebase/auth';

// Utility to check for undefined/null values safely
const safeStringify = (obj: unknown) => {
  return JSON.stringify(obj, (key, value) => {
    if (value === undefined) return '[undefined]';
    if (typeof value === 'function') return '[function]';
    return value;
  });
};

export async function GET(request: NextRequest) {
  try {
    console.log("Auth debug endpoint called");
    
    // Check existence of environment variables (without revealing values)
    const envCheck = {
      nextAuthUrl: process.env.NEXTAUTH_URL ? 'set' : 'missing',
      nextAuthSecret: process.env.NEXTAUTH_SECRET ? 'set' : 'missing',
      nodeEnv: process.env.NODE_ENV || 'not set',
      apiUrl: request.nextUrl.origin,
      headers: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
      }
    };
    
    // Try to get the session
    let sessionStatus = 'not attempted';
    let session = null;
    let sessionError = null;
    
    try {
      sessionStatus = 'attempting';
      session = await getServerSession(authOptions);
      sessionStatus = session ? 'success' : 'no session found';
    } catch (error) {
      sessionStatus = 'error';
      sessionError = error instanceof Error ? 
        { message: error.message, name: error.name, stack: error.stack } : 
        String(error);
    }
    
    // Return diagnostic info
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      auth: {
        sessionStatus,
        hasSession: !!session,
        sessionKeys: session ? Object.keys(session) : null,
        userKeys: session?.user ? Object.keys(session.user) : null,
        error: sessionError
      }
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 