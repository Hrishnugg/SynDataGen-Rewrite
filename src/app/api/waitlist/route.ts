import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { getRateLimitConfig, updateRateLimit } from '@/lib/rate-limit';
import { sendWaitlistNotification, sendWaitlistConfirmation } from '@/lib/email';

export async function POST(request: Request) {
  try {
    // Get IP address for rate limiting
    const forwardedFor = headers().get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0] : 'unknown';
    
    // Check rate limit
    const rateLimitConfig = getRateLimitConfig(ip);
    if (rateLimitConfig.isRateLimited) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please try again later.",
          resetTime: rateLimitConfig.resetTime,
          remainingRequests: rateLimitConfig.remainingRequests
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(5),
            'X-RateLimit-Remaining': String(rateLimitConfig.remainingRequests),
            'X-RateLimit-Reset': rateLimitConfig.resetTime.toISOString()
          }
        }
      );
    }

    const { email, name, company, industry, dataSize, useCase } = await request.json();

    // Validate required fields
    if (!email || !name || !company || !industry || !dataSize || !useCase) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("waitlist-serverless");
    
    // Check if email already exists
    const existingUser = await db.collection("waitlist").findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "You're already on the waitlist!" },
        { status: 400 }
      );
    }

    // Update rate limit counter
    updateRateLimit(ip);

    // Add new entry with timestamp
    const result = await db.collection("waitlist").insertOne({
      email,
      name,
      company,
      industry,
      dataSize,
      useCase,
      createdAt: new Date(),
      status: 'pending',
      ipAddress: ip // Store IP for audit purposes
    });

    // Send emails in parallel
    await Promise.all([
      // Send admin notification
      sendWaitlistNotification({
        email,
        name,
        company,
        industry,
        dataSize,
        useCase
      }),
      // Send user confirmation
      sendWaitlistConfirmation({
        email,
        name,
        company,
        industry,
        dataSize,
        useCase
      })
    ]);

    return NextResponse.json({ 
      message: "Successfully joined the waitlist!",
      success: true,
      remainingRequests: rateLimitConfig.remainingRequests - 1
    });

  } catch (error) {
    console.error('Waitlist submission error:', error);
    return NextResponse.json(
      { error: "Failed to join waitlist. Please try again." },
      { status: 500 }
    );
  }
} 