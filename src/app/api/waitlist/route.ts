import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, name, email, useCase, dataSize, industry } = body;

    // Validate the input
    if (!companyName || !name || !email || !useCase || !dataSize || !industry) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Here you would typically:
    // 1. Store the data in a database
    // 2. Send a notification email
    // 3. Add to your CRM/mailing list
    
    // For now, we'll just log it (you should implement proper storage)
    console.log('New waitlist submission:', {
      companyName,
      name,
      email,
      useCase,
      dataSize,
      industry,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { message: 'Successfully joined waitlist' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Waitlist submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 