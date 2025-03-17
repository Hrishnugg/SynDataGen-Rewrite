import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  CUSTOMER_COLLECTION,
  Customer, 
  CustomerAuditLogEntry,
  CUSTOMER_AUDIT_LOG_COLLECTION,
  auditLogToFirestore
} from '@/lib/models/firestore/customer';
import { getFirestore } from '@/lib/api/services/db-service';
import { getSecret } from '@/lib/gcp/secrets';

// Define the params type as a Promise
type IdParams = Promise<{ id: string }>;

/**
 * GET - Securely retrieve a service account key (admin only)
 * This endpoint has additional security checks as it returns sensitive information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    // Authorize request with session
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check - only admins can access keys
    const isAdmin = (session.user as any)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Await the params to get the ID
    const { id: customerId } = await params;
    
    // Additional security: Get IP address for audit logs
    const headersList = request.headers;
    const clientIp = headersList.get('x-forwarded-for') || 'unknown';
    
    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // Get customer from Firestore
    const customer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId) as Customer | null;
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if customer has a service account and key reference
    if (!customer.gcpConfig?.serviceAccountKeyRef) {
      return NextResponse.json({ 
        error: 'No service account key found for this customer'
      }, { status: 404 });
    }

    // URL parameters for validation
    const url = new URL(request.url);
    
    // Check for confirmation parameter - admin must explicitly confirm they want the key
    const confirmed = url.searchParams.get('confirmed') === 'true';
    if (!confirmed) {
      return NextResponse.json({ 
        error: 'Retrieving service account keys requires explicit confirmation',
        message: 'Add ?confirmed=true to your request to retrieve the key'
      }, { status: 400 });
    }
    
    // Check for reason parameter - admin must provide a reason for audit purposes
    const reason = url.searchParams.get('reason');
    if (!reason) {
      return NextResponse.json({ 
        error: 'Retrieving service account keys requires a reason',
        message: 'Add &reason=YOUR_REASON to your request to retrieve the key'
      }, { status: 400 });
    }

    try {
      // Retrieve the secret from Secret Manager
      const keyData = await getSecret(customer.gcpConfig.serviceAccountKeyRef);
      
      // Log the access for security auditing
      await firestoreService.create(
        `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
        auditLogToFirestore({
          customerId,
          action: 'service_account_action',
          performedBy: session.user.id || '',
          timestamp: new Date(),
          details: {
            message: 'Key access for admin support or debugging',
            serviceAccountAction: 'create'
          }
        })
      );
      
      // Return the key data
      return NextResponse.json({
        success: true,
        keyData: JSON.parse(keyData),
        serviceAccountEmail: customer.gcpConfig.serviceAccountEmail,
        retrieved: new Date().toISOString(),
        retrievedBy: session.user.id || 'system'
      });
    } catch (error) {
      console.error('Error retrieving service account key:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve service account key' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error handling service account key retrieval:', error);
    return NextResponse.json(
      { error: 'Failed to process service account key retrieval' },
      { status: 500 }
    );
  }
}

/**
 * This endpoint intentionally only supports GET for key retrieval.
 * Key management operations (creation, rotation, deletion) are handled 
 * by the parent service-account endpoint.
 */ 