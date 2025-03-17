/// <reference path="../../../@types/firebase-admin-extensions.d.ts" />
/**
 * Firebase Credentials Middleware
 * 
 * This middleware verifies Firebase credentials for protected routes.
 * It provides detailed diagnostics for troubleshooting authentication issues
 * while ensuring the application can still function with proper error handling.
 */

import { NextResponse, NextRequest } from 'next/server';
import { getCredentialManager } from '@/lib/services/credential-manager';

// Routes that require Firebase authentication
const PROTECTED_API_ROUTES = [
  '/api/auth',
  '/api/data-generation',
  '/api/customers',
  '/api/projects',
  '/api/waitlist'
];

// Define logger for Firebase middleware
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[FirebaseMiddleware] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[FirebaseMiddleware] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[FirebaseMiddleware] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.log(`[FirebaseMiddleware:DEBUG] ${message}`, ...args);
    }
  }
};

/**
 * Verify Firebase credentials for protected routes
 */
export async function middleware(request: NextRequest) {
  // Allow normal requests to proceed
  const response = NextResponse.next();
  
  try {
    const url = request.nextUrl.pathname;
    
    // Check if this is a protected API route
    const isProtectedApiRoute = PROTECTED_API_ROUTES.some(route => url.startsWith(route));
    
    // Only proceed with credential check for protected routes
    if (isProtectedApiRoute) {
      // Get credential status from credential manager
      const manager = getCredentialManager();
      const status = await manager.getCredentialStatus();
      
      if ((status as FirebaseConfig.Status).firebase?.available) {
        // Credentials are valid
        logger.debug('Firebase credentials verified for protected route', { 
          url, 
          source: (status as FirebaseConfig.Status).firebase?.source || 'unknown' 
        });
        
        // Add header to indicate valid credentials
        response.headers.set('X-Firebase-Credentials', 'valid');
        response.headers.set('X-Firebase-Source', (status as FirebaseConfig.Status).firebase?.source || 'unknown');
      } else {
        // Handle environment-specific behavior for missing credentials
        const isDev = process.env.NODE_ENV === 'development';
        
        if (isDev) {
          // In development, allow requests to proceed even without credentials
          logger.warn('Firebase credentials missing in development mode', { url });
          response.headers.set('X-Firebase-Credentials', 'development-mode');
          
          // Don't force mock mode automatically - let the application code handle it
        } else {
          // In production, log detailed error but still allow requests to proceed
          // The actual API handlers will reject requests if credentials are invalid
          logger.error('Firebase credentials are missing or invalid in production environment', {
            url,
            environment: process.env.NODE_ENV,
            error: (status as FirebaseConfig.Status).firebase?.error || 'No credentials available'
          });
          
          response.headers.set('X-Firebase-Credentials', 'invalid');
          response.headers.set('X-Firebase-Error', (status as FirebaseConfig.Status).firebase?.error || 'missing-credentials');
        }
      }
    }
    
    return response;
  } catch (error) {
    // Log error but let request proceed
    logger.error('Unexpected error verifying Firebase credentials', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Mark the response with error information
    response.headers.set('X-Firebase-Credentials', 'error');
    response.headers.set('X-Firebase-Error', error instanceof Error ? error.message : 'unknown-error');
    
    return response;
  }
}

/**
 * Configure which routes should trigger this middleware
 */
export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/data-generation/:path*',
    '/api/diagnostic/:path*',
    '/api/customers/:path*',
    '/api/projects/:path*',
    '/api/waitlist/:path*',
    '/api/monitoring/:path*'
  ],
}; 