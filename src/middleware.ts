import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is not defined in middleware');
}

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(request: NextRequest) {
  try {
    console.log('Middleware - Processing request for path:', request.nextUrl.pathname);
    console.log('Middleware - NEXTAUTH_SECRET exists:', !!secret);
    console.log('Middleware - NEXTAUTH_SECRET length:', secret?.length);
    
    const token = await getToken({ 
      req: request,
      secret: secret,
    });

    console.log('Middleware - Token:', token);

    // Protect /dashboard routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!token) {
        console.log('Middleware - No token for dashboard access, redirecting to login');
        const url = new URL('/auth/login', request.url);
        url.searchParams.set('callbackUrl', encodeURI(request.nextUrl.pathname));
        return NextResponse.redirect(url);
      }
      console.log('Middleware - Token found, allowing dashboard access for user:', token.email);
    }

    // Redirect to dashboard if user is already logged in and trying to access auth pages
    if (request.nextUrl.pathname.startsWith('/auth/') && token) {
      console.log('Middleware - User already logged in, redirecting to dashboard:', token.email);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to proceed
    return NextResponse.next();
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