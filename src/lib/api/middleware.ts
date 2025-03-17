import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

// Load secret from environment or use a secure fallback for development
// In production, this should always be set properly
const secret = process.env.NEXTAUTH_SECRET || (
  process.env.NODE_ENV === 'development' 
    ? 'development-secret-not-for-production'
    : undefined // Let it fail in production if not set
);

// Define logger for authentication middleware
const authLogger = {
  info: (message: string, ...args: any[]) => console.log(`[AuthMiddleware] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[AuthMiddleware] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[AuthMiddleware] ${message}`, ...args),
};

export async function middleware(request: NextRequest) {
  try {
    // Check for required auth secret
    if (!secret) {
      authLogger.error('NEXTAUTH_SECRET environment variable is not set in production!');
      // In production, we'll still try to proceed, but auth will likely fail
    }
    
    // Get authentication token
    const token = await getToken({ 
      req: request,
      secret: secret,
    });

    // Protect /dashboard routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!token) {
        authLogger.info('No token for dashboard access, redirecting to login');
        const url = new URL('/auth/login', request.url);
        url.searchParams.set('callbackUrl', encodeURI(request.nextUrl.pathname));
        return NextResponse.redirect(url);
      }
      authLogger.info(`Token found, allowing dashboard access for user: ${token.email}`);
    }

    // Redirect to dashboard if user is already logged in and trying to access auth pages
    if (request.nextUrl.pathname.startsWith('/auth/') && token) {
      authLogger.info(`User already logged in, redirecting to dashboard: ${token.email}`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    authLogger.error('Authentication middleware error:', error);
    // On error, allow the request to proceed but mark the response
    const response = NextResponse.next();
    response.headers.set('X-Auth-Error', 'true');
    return response;
  }
}

// Update matcher to be more specific
export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/auth/login',
    '/auth/register',
  ],
}; 