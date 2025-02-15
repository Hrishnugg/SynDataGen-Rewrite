import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import clientPromise, { ensureConnection } from '@/lib/mongodb';
import { USER_COLLECTION } from '@/lib/models/user';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

// Extend the built-in types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      company?: string;
    }
  }
  interface User {
    id: string;
    name: string;
    email: string;
    company: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    company: string;
  }
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is not defined');
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('Missing credentials in authorize function');
          throw new Error('Missing credentials');
        }

        try {
          // Use the enhanced connection handling
          const client = await ensureConnection();
          
          // List all databases
          const adminDb = client.db().admin();
          const dbList = await adminDb.listDatabases();
          console.log('Available databases:', dbList.databases.map(db => db.name));
          
          // Connect to test database
          const db = client.db('test');
          
          console.log('DB Connection successful');
          console.log('Using database:', 'test');
          console.log('Attempting to authenticate user:', credentials.email);
          console.log('Searching in collection:', USER_COLLECTION);
          
          // Log the collections in all databases
          for (const dbInfo of dbList.databases) {
            const currentDb = client.db(dbInfo.name);
            const collections = await currentDb.listCollections().toArray();
            console.log(`Collections in ${dbInfo.name}:`, collections.map(c => c.name));
          }
          
          // First, try to find the user
          const user = await db.collection(USER_COLLECTION).findOne({ 
            email: credentials.email.toLowerCase() // Ensure case-insensitive comparison
          });

          console.log('Database query completed');
          
          if (!user) {
            console.log('No user found with email:', credentials.email);
            // Try to find any users in the collection
            const userCount = await db.collection(USER_COLLECTION).countDocuments();
            console.log('Total users in collection:', userCount);
            
            // Log all users in the collection (without passwords)
            const allUsers = await db.collection(USER_COLLECTION)
              .find({}, { projection: { password: 0 } })
              .toArray();
            console.log('All users in collection:', allUsers);
            
            throw new Error('No user found with this email');
          }

          console.log('User found, verifying password');

          const isValid = await compare(credentials.password, user.password);

          if (!isValid) {
            console.log('Invalid password for user:', credentials.email);
            throw new Error('Invalid password');
          }

          console.log('User authenticated successfully:', credentials.email);
          
          // Return a standardized user object
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            company: user.company
          };
        } catch (error) {
          console.error('Auth error details:', {
            message: error instanceof Error ? error.message : 'An unknown error occurred',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
          });
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('JWT Callback - Token:', token);
      console.log('JWT Callback - User:', user);
      console.log('JWT Callback - Account:', account);
      
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.company = user.company;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback - Session:', session);
      console.log('Session Callback - Token:', token);
      
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.company = token.company as string;
      }
      return session;
    },
  },
  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST }; 