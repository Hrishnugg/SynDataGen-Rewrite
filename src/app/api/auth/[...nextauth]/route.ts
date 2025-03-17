import NextAuth from 'next-auth';
import { authOptions } from '@/lib/firebase/auth';

// Export the handler using the centralized auth options
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };