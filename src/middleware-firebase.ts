/**
 * Firebase Credentials Middleware
 * 
 * This middleware runs at application startup to verify Firebase credentials
 * and warn about potential configuration issues.
 * 
 * It does not block the application from starting, but logs detailed diagnostics
 * to help troubleshoot authentication issues.
 */

import { NextResponse, NextRequest } from 'next/server';
import { getCredentialManager } from './lib/services/credential-manager';

// Routes that require Firebase authentication
const PROTECTED_API_ROUTES = [
  '/api/auth',
  '/api/data',
  '/api/generator'
];

// Logging utility
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[FirebaseMiddleware] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[FirebaseMiddleware] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[FirebaseMiddleware] ${message}`, ...args)
};

/**
 * Verify Firebase credentials on startup and for protected routes
 */
export async function middleware(request: NextRequest) {
  // Allow normal requests to proceed
  const response = NextResponse.next();
  
  try {
    const url = request.nextUrl.pathname;
    
    // Check if this is a protected API route
    const isProtectedApiRoute = PROTECTED_API_ROUTES.some(route => url.startsWith(route));
    
    if (isProtectedApiRoute) {
      // Only check credentials for protected API routes
      const manager = getCredentialManager();
      const status = await manager.getCredentialStatus();
      
      if (!status.hasValidCredentials) {
        logger.error('Firebase credentials are missing or invalid', {
          url, 
          credentialStatus: {
            hasEnvCredentials: status.hasEnvCredentials,
            hasFileCredentials: status.hasFileCredentials,
            hasAppDefaultCredentials: status.hasAppDefaultCredentials
          }
        });
        
        // Add warning header but allow request to proceed
        // The actual API handler will return proper error
        response.headers.set('X-Firebase-Credentials', 'invalid');
      } else {
        logger.info('Firebase credentials verified for protected route', { 
          url, 
          source: status.primarySource 
        });
        
        response.headers.set('X-Firebase-Credentials', 'valid');
      }
    }
    
    return response;
  } catch (error) {
    // Log error but let request proceed
    logger.error('Error checking Firebase credentials', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return response;
  }
}

/**
 * Configure which routes should trigger this middleware
 */
export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/data/:path*',
    '/api/generator/:path*',
    '/api/diagnostic/:path*'
  ],
}; 