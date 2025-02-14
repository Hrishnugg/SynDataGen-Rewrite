import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { USER_COLLECTION, type User } from '@/lib/models/user';

export async function POST(request: Request) {
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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Check if user already exists
    const existingUser = await db.collection(USER_COLLECTION).findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user: User = {
      email,
      password: hashedPassword,
      name,
      company,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(USER_COLLECTION).insertOne(user);

    return NextResponse.json({
      message: "User registered successfully",
      success: true
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 