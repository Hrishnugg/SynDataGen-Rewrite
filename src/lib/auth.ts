/**
 * Central export of NextAuth configuration options
 * This file allows reusing the same configuration across the application
 */

import { validateFirebaseCredentials } from './gcp/firestore/initFirestore';
import { CreateUserInput, USER_COLLECTION, firestoreToUser } from './models/firestore/user';
import { FirestoreServiceError } from './services/firestore-service';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getFirestore } from './services/db-service';

// Define auth options to be shared across the application
export const authOptions: NextAuthOptions = {
  // Configure JWT for session management
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Configure specific pages for auth flows
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  
  // Configure authentication providers
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'email@example.com' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('[NextAuth:ERROR] Missing credentials');
          throw new Error('Email and password are required');
        }

        try {
          console.log(`[NextAuth:DEBUG] Authorizing user: ${credentials.email}`);
          
          // Ensure Firestore is properly initialized
          if (!validateFirebaseCredentials()) {
            throw new FirestoreServiceError(
              'firestore/invalid-credentials',
              'Firebase credentials are invalid or missing'
            );
          }
          
          // Query Firestore for user with this email
          const firestoreService = await getFirestore();
          const users = await firestoreService.queryDocuments(
            USER_COLLECTION,
            query => query.where('email', '==', credentials.email.toLowerCase())
          );
          
          // Check if user exists
          if (!users || users.length === 0) {
            console.log(`[NextAuth:DEBUG] User not found: ${credentials.email}`);
            throw new Error('No user found with this email');
          }
          
          // Get first matching user
          const user = firestoreToUser(users[0]);
          
          // Verify password
          const passwordMatch = await compare(credentials.password, user.password);
          if (!passwordMatch) {
            console.log(`[NextAuth:DEBUG] Invalid password for: ${credentials.email}`);
            throw new Error('Invalid password');
          }
          
          // User authenticated successfully - return user without password
          const { password, ...userWithoutPassword } = user;
          
          // Make sure we have a valid ID
          const userId = user._id || user.id || user.__id;
          if (!userId) {
            console.error(`[NextAuth:ERROR] User has no ID: ${credentials.email}`);
            throw new Error('User has no ID');
          }
          
          // Return standardized user object
          return {
            id: userId,
            ...userWithoutPassword,
          };
        } catch (error) {
          console.error('[NextAuth:ERROR] Authorization error:', error);
          throw new Error(error instanceof Error ? error.message : 'Authentication failed');
        }
      }
    })
  ],
  
  // JWT configuration
  callbacks: {
    // Set up the JWT token with user info
    async jwt({ token, user, account }) {
      console.log(`[NextAuth:DEBUG] JWT Callback - Token exists: ${!!token}`);
      if (token) {
        console.log(`[NextAuth:DEBUG] JWT Callback - Token keys: ${Object.keys(token)}`);
        console.log(`[NextAuth:DEBUG] JWT Callback - Token ID: ${token.id || 'not set'}`);
        console.log(`[NextAuth:DEBUG] JWT Callback - Token sub: ${token.sub || 'not set'}`);
      }
      
      if (user) {
        console.log(`[NextAuth:DEBUG] JWT Callback - User exists with ID: ${user.id || 'not set'}`);
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.company = user.company;
      }
      
      return token;
    },
    
    // Set up the session with user info from the token
    async session({ session, token }) {
      console.log(`[NextAuth:DEBUG] Session Callback - Session exists: ${!!session}`);
      console.log(`[NextAuth:DEBUG] Session Callback - Token exists: ${!!token}`);
      
      if (token && session.user) {
        console.log(`[NextAuth:DEBUG] Session Callback - Token ID: ${token.id || 'not set'}`);
        session.user.id = token.id;
        console.log(`[NextAuth:DEBUG] Session Callback - ID set from token { id: '${session.user.id}' }`);
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.company = token.company;
      }
      
      // Log final session state for debugging
      if (session.user) {
        console.log(`[NextAuth:DEBUG] Session Callback - Final session user state {
          sessionUserId: '${session.user.id || 'not set'}',
          sessionUserEmail: '${session.user.email || 'not set'}'
        }`);
      }
      
      return session;
    }
  }
}; 