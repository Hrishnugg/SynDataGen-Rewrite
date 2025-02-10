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

    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { email, name, company, industry, dataSize, useCase } = body;

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

    let client;
    try {
      client = await clientPromise;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      return NextResponse.json(
        { error: "Database connection error. Please try again later." },
        { status: 500 }
      );
    }

    const db = client.db("waitlist-serverless");
    
    // Check if email already exists
    try {
      const existingUser = await db.collection("waitlist").findOne({ email });
      if (existingUser) {
        return NextResponse.json(
          { error: "You're already on the waitlist!" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error checking existing user:', error);
      return NextResponse.json(
        { error: "Database error. Please try again later." },
        { status: 500 }
      );
    }

    // Update rate limit counter
    updateRateLimit(ip);

    // Add new entry with timestamp
    try {
      await db.collection("waitlist").insertOne({
        email,
        name,
        company,
        industry,
        dataSize,
        useCase,
        createdAt: new Date(),
        status: 'pending',
        ipAddress: ip
      });
    } catch (error) {
      console.error('Error inserting new user:', error);
      return NextResponse.json(
        { error: "Failed to save your information. Please try again later." },
        { status: 500 }
      );
    }

    // Send emails in parallel
    try {
      await Promise.all([
        sendWaitlistNotification({
          email,
          name,
          company,
          industry,
          dataSize,
          useCase
        }),
        sendWaitlistConfirmation({
          email,
          name,
          company,
          industry,
          dataSize,
          useCase
        })
      ]);
    } catch (error) {
      console.error('Error sending emails:', error);
      // Continue since the user is already added to the waitlist
      // but notify the client about the email issue
      return NextResponse.json({ 
        message: "Successfully joined the waitlist! However, there was an issue sending the confirmation email. Our team has been notified.",
        success: true,
        emailError: true,
        remainingRequests: rateLimitConfig.remainingRequests - 1
      });
    }

    return NextResponse.json({ 
      message: "Successfully joined the waitlist!",
      success: true,
      remainingRequests: rateLimitConfig.remainingRequests - 1
    });

  } catch (error) {
    console.error('Waitlist submission error:', error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}