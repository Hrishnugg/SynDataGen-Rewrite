import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  CUSTOMER_COLLECTION,
  Customer, 
  customerToFirestore,
  CustomerAuditLogEntry,
  CUSTOMER_AUDIT_LOG_COLLECTION,
  auditLogToFirestore
} from '@/lib/models/firestore/customer';
import { getFirestore } from '@/lib/api/services/db-service';

// Define the params type as a Promise
type IdParams = Promise<{ id: string }>;

/**
 * GET - Retrieve a specific customer by ID
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
    
    // Get customer from Firestore
    const customer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId) as Customer | null;
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a specific customer
 */
export async function PATCH(
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
    
    // Get current customer data for audit log and validation
    const existingCustomer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId) as Customer | null;
    
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Parse request body
    const updateData = await request.json();
    
    // Validate data
    if (updateData.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
      
      // Check if email is already in use by another customer
      if (updateData.email !== existingCustomer.email) {
        const existingCustomers = await firestoreService.query(
          CUSTOMER_COLLECTION, 
          { 
            where: [{ field: 'email', operator: '==', value: updateData.email }],
            limit: 1
          }
        ) as Customer[];
        
        if (existingCustomers && existingCustomers.length > 0) {
          return NextResponse.json(
            { error: "Email is already in use by another customer" },
            { status: 409 }
          );
        }
      }
    }

    // Track changes for audit log
    const changes: Record<string, { old: any; new: any }> = {};
    
    // Check which fields are being updated
    Object.keys(updateData).forEach(key => {
      if (
        key !== 'id' && 
        key !== 'createdAt' && 
        JSON.stringify(existingCustomer[key as keyof Customer]) !== JSON.stringify(updateData[key])
      ) {
        changes[key] = {
          old: existingCustomer[key as keyof Customer],
          new: updateData[key]
        };
      }
    });

    // Update customer in Firestore
    await firestoreService.update(
      CUSTOMER_COLLECTION, 
      customerId, 
      updateData
    );

    // Create audit log entry
    const auditEntry: CustomerAuditLogEntry = {
      customerId,
      timestamp: new Date(),
      action: Object.keys(changes).includes('status') ? 'status_change' : 'update',
      performedBy: session.user.id || 'system',
      details: { changes }
    };

    // Add audit log entry to Firestore subcollection
    await firestoreService.create(
      `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
      auditLogToFirestore(auditEntry)
    );

    // Get updated customer
    const updatedCustomer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId) as Customer | null;

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Soft delete a customer
 */
export async function DELETE(
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
    
    // Get current customer data
    const existingCustomer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId) as Customer | null;
    
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Soft delete by setting status to 'suspended'
    await firestoreService.update(
      CUSTOMER_COLLECTION, 
      customerId, 
      { status: 'suspended' }
    );

    // Create audit log entry
    const auditEntry: CustomerAuditLogEntry = {
      customerId,
      timestamp: new Date(),
      action: 'delete',
      performedBy: session.user.id || 'system',
      details: { 
        changes: {
          status: {
            old: existingCustomer.status,
            new: 'suspended'
          }
        },
        message: 'Customer account suspended/deleted'
      }
    };

    // Add audit log entry to Firestore
    await firestoreService.create(
      `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
      auditLogToFirestore(auditEntry)
    );

    return NextResponse.json({ 
      message: 'Customer successfully deleted (suspended)', 
      status: 'suspended' 
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    );
  }
} 