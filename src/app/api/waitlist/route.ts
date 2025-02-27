import { NextResponse, NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { getRateLimitConfig, updateRateLimit } from '@/lib/rate-limit';
import { sendWaitlistNotification, sendWaitlistConfirmation } from '@/lib/email';
import { Resend } from 'resend';
import { getFirestore } from '@/lib/services/db-service';
import { 
  WAITLIST_COLLECTION, 
  WaitlistSubmission, 
  CreateWaitlistInput 
} from '@/lib/models/firestore/waitlist';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
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
    const { name, email, company, industry, dataVolume, useCase, jobTitle } = body;

    // Validate required fields
    if (!name || !email || !company || !useCase) {
      return NextResponse.json(
        { error: "Required fields: name, email, company, and use case" },
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

    // Update rate limit counter
    updateRateLimit(ip);
    
    // Get Firestore service
    const firestoreService = getFirestore();
    await firestoreService.init();
    
    // Check if entry already exists
    const existingSubmissions = await firestoreService.query<WaitlistSubmission>(
      WAITLIST_COLLECTION,
      (collection) => collection.where('email', '==', email).limit(1)
    );
    
    if (existingSubmissions && existingSubmissions.length > 0) {
      return NextResponse.json(
        { error: "You're already on the waitlist!" },
        { status: 400 }
      );
    }

    // Prepare submission data
    const submissionData = {
      email,
      name,
      company,
      industry: industry || '',
      jobTitle: jobTitle || '',
      useCase,
      dataVolume: dataVolume || '',
      createdAt: new Date(),
      status: 'pending',
      metadata: { ipAddress: ip }
    };

    // Add new entry to Firestore
    const documentId = await firestoreService.create(
      WAITLIST_COLLECTION, 
      submissionData
    );
    
    console.log('Added to Firestore waitlist:', email, 'with ID:', documentId);

    // Send emails in parallel
    try {
      await Promise.all([
        sendWaitlistNotification({
          email,
          name,
          company,
          industry: industry || '',
          dataVolume: dataVolume || '',
          useCase
        }),
        sendWaitlistConfirmation({
          email,
          name,
          company,
          industry: industry || '',
          dataVolume: dataVolume || '',
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
        id: documentId,
        remainingRequests: rateLimitConfig.remainingRequests - 1
      });
    }

    return NextResponse.json({ 
      message: "Successfully joined the waitlist!",
      success: true,
      id: documentId,
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