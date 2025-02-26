import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { getRateLimitConfig, updateRateLimit } from '@/lib/rate-limit';
import { sendWaitlistNotification, sendWaitlistConfirmation } from '@/lib/email';
import { Resend } from 'resend';
import { 
  shouldUseFirestore, 
  shouldUseMongoDB 
} from '@/lib/services/db-service';
import { getFirestoreService } from '@/lib/services/firestore-service';
import { 
  WAITLIST_COLLECTION, 
  WaitlistSubmission, 
  CreateWaitlistInput 
} from '@/lib/models/firestore/waitlist';

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
    
    // Determine which database backend to use
    const useFirestore = shouldUseFirestore('waitlist');
    const useMongoDB = shouldUseMongoDB('waitlist'); 
    const isWritingToBoth = useFirestore && useMongoDB;

    // Entry already exists check
    const existingUser = await checkExistingWaitlistUser(email, useFirestore, useMongoDB);
    if (existingUser) {
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

    // Track the document ID for response
    let documentId: string | null = null;

    // Add new entry to Firestore if enabled
    if (useFirestore) {
      try {
        const firestoreService = getFirestoreService();
        await firestoreService.init();
        
        documentId = await firestoreService.create(
          WAITLIST_COLLECTION, 
          submissionData
        );
        
        console.log('Added to Firestore waitlist:', email, 'with ID:', documentId);
      } catch (error) {
        console.error('Error saving to Firestore waitlist:', error);
        if (!isWritingToBoth) {
          return NextResponse.json(
            { error: "Failed to save your information. Please try again later." },
            { status: 500 }
          );
        }
        // If both databases are being used, continue to MongoDB
      }
    }

    // Add new entry to MongoDB if enabled
    if (useMongoDB) {
      try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || "syndatagen");
        
        const result = await db.collection("waitlist").insertOne({
          ...submissionData,
          // MongoDB specific fields if needed
        });
        
        // Set documentId if not already set from Firestore
        if (!documentId) {
          documentId = result.insertedId.toString();
        }
        
        console.log('Added to MongoDB waitlist:', email, 'with ID:', result.insertedId);
      } catch (error) {
        console.error('Error saving to MongoDB waitlist:', error);
        
        // If Firestore was successful but MongoDB failed and we're writing to both,
        // we can still continue if we have a documentId
        if (!useFirestore || !documentId) {
          return NextResponse.json(
            { error: "Failed to save your information. Please try again later." },
            { status: 500 }
          );
        }
      }
    }

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

/**
 * Check if a user already exists in the waitlist
 * 
 * @param email User's email
 * @param useFirestore Whether to check Firestore
 * @param useMongoDB Whether to check MongoDB
 * @returns True if user exists in any of the active backends
 */
async function checkExistingWaitlistUser(
  email: string, 
  useFirestore: boolean, 
  useMongoDB: boolean
): Promise<boolean> {
  // Check Firestore first if enabled
  if (useFirestore) {
    try {
      const firestoreService = getFirestoreService();
      await firestoreService.init();
      
      const results = await firestoreService.query<WaitlistSubmission>(
        WAITLIST_COLLECTION,
        (collection) => collection.where('email', '==', email).limit(1)
      );
      
      if (results && results.length > 0) {
        return true;
      }
    } catch (error) {
      console.error('Error checking existing user in Firestore:', error);
      // Continue to MongoDB if enabled
    }
  }
  
  // Check MongoDB if enabled
  if (useMongoDB) {
    try {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME || "syndatagen");
      
      const existingUser = await db.collection("waitlist").findOne({ email });
      if (existingUser) {
        return true;
      }
    } catch (error) {
      console.error('Error checking existing user in MongoDB:', error);
    }
  }
  
  // User does not exist in any active backend
  return false;
}