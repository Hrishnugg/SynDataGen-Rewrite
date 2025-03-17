import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  CUSTOMER_COLLECTION,
  Customer, 
  CustomerAuditLogEntry,
  CUSTOMER_AUDIT_LOG_COLLECTION
} from '@/lib/models/firestore/customer';
import { getFirestore } from '@/lib/api/services/db-service';
import { FirestoreQueryOptions } from '@/lib/api/services/firestore-service';

// Specify dynamism
export const dynamic = 'force-dynamic';

// Define the params type as a Promise
type IdParams = Promise<{ id: string }>;

/**
 * GET - Retrieve customer audit log entries
 */
export async function GET(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    // Authorize request
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const isAdmin = (session.user as any)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Await the params to get the ID
    const { id: customerId } = await params;
    
    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // First check if the customer exists
    const customer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Parse query parameters for filtering and pagination
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 50;
    const cursor = url.searchParams.get('cursor');
    const action = url.searchParams.get('action');
    const performedBy = url.searchParams.get('performedBy');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');

    // Build query options
    const queryOptions: FirestoreQueryOptions = {
      orderBy: [
        { field: 'timestamp', direction: 'desc' }
      ],
      limit
    };

    // Build query where conditions
    const whereConditions: {
      field: string;
      operator: '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
      value: any;
    }[] = [
      { 
        field: 'customerId', 
        operator: '==', 
        value: customerId 
      }
    ];
    
    if (action) {
      whereConditions.push({ 
        field: 'action', 
        operator: '==', 
        value: action 
      });
    }
    
    if (performedBy) {
      whereConditions.push({ 
        field: 'userId', 
        operator: '==', 
        value: performedBy 
      });
    }
    
    if (fromDate) {
      whereConditions.push({ 
        field: 'timestamp', 
        operator: '>=' as '>=', 
        value: new Date(fromDate) 
      });
    }
    
    if (toDate) {
      whereConditions.push({ 
        field: 'timestamp', 
        operator: '<=' as '<=', 
        value: new Date(toDate) 
      });
    }

    if (whereConditions.length > 0) {
      queryOptions.where = whereConditions;
    }

    // If cursor provided, use it for pagination
    if (cursor) {
      const cursorDoc = await firestoreService.getById(
        `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
        cursor
      );
      
      if (cursorDoc) {
        queryOptions.startAfter = cursorDoc;
      }
    }

    // Query the audit logs
    const auditLogs = await firestoreService.query(
      `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
      queryOptions
    );

    // Add type assertion to the audit logs
    const typedAuditLogs = auditLogs as Array<{ id: string }>;

    // Return paginated results
    return NextResponse.json({
      auditLogs,
      pagination: {
        hasMore: auditLogs.length >= limit,
        nextCursor: auditLogs.length >= limit ? typedAuditLogs[typedAuditLogs.length - 1].id : null,
        count: auditLogs.length
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a manual audit log entry (for custom events)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authorize request
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const isAdmin = (session.user as any)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get customer ID from params
    const { id: customerId } = params;
    
    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // First check if the customer exists
    const customer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.action || !body.details) {
      return NextResponse.json(
        { error: 'action and details are required fields' },
        { status: 400 }
      );
    }

    // Create audit log entry
    const auditEntry: CustomerAuditLogEntry = {
      customerId,
      timestamp: new Date(),
      action: body.action,
      performedBy: session.user.id || 'system',
      details: body.details
    };

    // Add audit log entry to Firestore
    const entryId = await firestoreService.create(
      `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
      auditEntry
    );

    return NextResponse.json({
      id: entryId,
      ...auditEntry
    });
  } catch (error) {
    console.error('Error creating audit log entry:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log entry' },
      { status: 500 }
    );
  }
} 