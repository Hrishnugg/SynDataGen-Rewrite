import { NextResponse, NextRequest } from 'next/server';
import { hash } from 'bcryptjs';
import { USER_COLLECTION } from '@/lib/models/firestore/user';
import { getFirestore } from '@/lib/api/services/db-service';
import { Firestore, CollectionReference } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, company } = body;

    // Validate required fields
    if (!email || !password || !name || !company) {
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

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // Check if user already exists
    const existingUsers = await firestoreService.query(
      USER_COLLECTION,
      {
        where: [{
          field: 'email',
          operator: '==',
          value: email.toLowerCase()
        }]
      }
    );
    
    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const userData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      company,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add user to Firestore
    const userId = await firestoreService.create(USER_COLLECTION, userData);

    return NextResponse.json({
      message: "User registered successfully",
      success: true,
      userId
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}