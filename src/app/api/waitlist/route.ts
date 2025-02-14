import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { getRateLimitConfig, updateRateLimit } from '@/lib/rate-limit';
import { sendWaitlistNotification, sendWaitlistConfirmation } from '@/lib/email';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const body = await request.json();
    const { name, email, company, industry, dataVolume, useCase } = body;

    // Validate required fields
    if (!name || !email || !company || !industry || !dataVolume || !useCase) {
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
        dataVolume,
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
          dataVolume,
          useCase
        }),
        sendWaitlistConfirmation({
          email,
          name,
          company,
          industry,
          dataVolume,
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

    // Send confirmation email
    await resend.emails.send({
      from: `${process.env.SENDER_NAME} <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to the Synoptic Waitlist',
      html: `
        <h1>Welcome to Synoptic!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for joining our waitlist. We're excited to have you on board!</p>
        <p>We'll keep you updated on our progress and let you know when we're ready to launch.</p>
        <br>
        <p>Best regards,</p>
        <p>The Synoptic Team</p>
      `
    });

    // Send notification to admin
    await resend.emails.send({
      from: `${process.env.SENDER_NAME} <${process.env.FROM_EMAIL}>`,
      to: process.env.ADMIN_EMAIL!,
      subject: 'New Waitlist Signup',
      html: `
        <h2>New Waitlist Signup</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Industry:</strong> ${industry}</p>
        <p><strong>Data Volume:</strong> ${dataVolume}</p>
        <p><strong>Use Case:</strong> ${useCase}</p>
      `
    });

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