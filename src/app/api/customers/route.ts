import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  CUSTOMER_COLLECTION, 
  Customer, 
  CreateCustomerInput, 
  DEFAULT_CUSTOMER_SETTINGS,
  DEFAULT_BILLING_TIER,
  firestoreToCustomer
} from '@/lib/models/firestore/customer';
import { getFirestore } from '@/lib/api/services/db-service';
import { FirestoreQueryOptions } from '@/lib/api/services/firestore-service';

/**
 * GET - List customers with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authorize request (only admins should access this)
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check (in a real app, you'd want to verify if the user is an admin)
    // For now we're just checking if a role property exists on the user
    const userRole = (session.user as any)?.role;
    const isAdmin = userRole === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const billingTier = url.searchParams.get('billingTier');
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;
    const cursor = url.searchParams.get('cursor');
    const sort = url.searchParams.get('sort') || 'createdAt';
    const order = url.searchParams.get('order') || 'desc';

    // Build query options
    const queryOptions: FirestoreQueryOptions = {
      orderBy: [
        { field: sort, direction: order === 'asc' ? 'asc' : 'desc' }
      ],
      limit,
      select: [
        'id', 'name', 'email', 'status', 'billingTier', 
        'createdAt', 'updatedAt', 'usageStatistics', 'settings'
      ]
    };

    // Add filters
    const whereConditions = [];
    if (status) {
      whereConditions.push({
        field: 'status',
        operator: '==' as const,
        value: status
      });
    }
    
    if (billingTier) {
      whereConditions.push({
        field: 'billingTier',
        operator: '==' as const,
        value: billingTier
      });
    }
    
    if (whereConditions.length > 0) {
      queryOptions.where = whereConditions;
    }

    // If cursor provided, use it for pagination
    if (cursor) {
      const firestoreService = await getFirestore();
      const cursorDoc = await firestoreService.getById(CUSTOMER_COLLECTION, cursor);
      if (cursorDoc) {
        queryOptions.startAfter = cursorDoc;
      }
    }

    // Execute the query
    const firestoreService = await getFirestore();
    const paginationResult = await firestoreService.queryWithPagination(
      CUSTOMER_COLLECTION,
      queryOptions
    );

    // Return paginated results
    return NextResponse.json({
      customers: paginationResult.items,
      pagination: {
        hasMore: paginationResult.hasMore,
        nextCursor: paginationResult.hasMore && paginationResult.items.length > 0 
          ? paginationResult.items[paginationResult.items.length - 1].id 
          : null,
        count: paginationResult.items.length
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    // Authorize request (admin only)
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const userRole = (session.user as any)?.role;
    const isAdmin = userRole === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Customer name and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // Check if a customer with the same email already exists
    const existingCustomers = await firestoreService.query(
      CUSTOMER_COLLECTION, 
      { 
        where: [{ field: 'email', operator: '==' as const, value: body.email }],
        limit: 1
      }
    );
    
    if (existingCustomers && existingCustomers.length > 0) {
      return NextResponse.json(
        { error: "A customer with this email already exists" },
        { status: 409 }
      );
    }

    // Prepare customer data
    const now = new Date();
    const customerData = {
      name: body.name,
      email: body.email,
      createdAt: now,
      updatedAt: now,
      status: body.status || 'active',
      billingTier: body.billingTier || DEFAULT_BILLING_TIER,
      settings: body.settings || DEFAULT_CUSTOMER_SETTINGS,
      usageStatistics: {
        lastLoginDate: null,
        totalProjects: 0,
        totalDataGenerated: 0,
        apiRequestsThisMonth: 0,
        lastAccessedAt: now,
      },
      contactInfo: body.contactInfo || {
        primary: {
          name: body.name,
          email: body.email
        }
      },
      subscriptionDetails: body.subscriptionDetails || {
        planId: 'free-tier',
        startDate: now,
        renewalDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
        autoRenew: true
      },
      metadata: body.metadata || {}
    };

    // Create customer in Firestore
    const customerId = await firestoreService.create(
      CUSTOMER_COLLECTION,
      customerData
    );

    // Return the created customer with ID
    return NextResponse.json({
      id: customerId,
      ...customerData
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
} 