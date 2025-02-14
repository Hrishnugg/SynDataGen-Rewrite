import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    secretExists: !!process.env.NEXTAUTH_SECRET,
    secretFirstChars: process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.substring(0, 5) : null,
    urlExists: !!process.env.NEXTAUTH_URL,
    nodeEnv: process.env.NODE_ENV,
  });
} 