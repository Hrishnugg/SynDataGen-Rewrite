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
import {
  createCustomerServiceAccount,
  rotateServiceAccountKey,
  deleteServiceAccount,
  auditServiceAccountPermissions
} from '@/lib/gcp/serviceAccount';
import { getSecret } from '@/lib/gcp/secrets';

// Define the params type as a Promise
type IdParams = Promise<{ id: string }>;

/**
 * GET - Retrieve service account information for a customer
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

    // Check if customer has a service account
    if (!customer.gcpConfig?.serviceAccountEmail) {
      return NextResponse.json({ 
        hasServiceAccount: false,
        message: 'No service account has been created for this customer'
      });
    }

    // Get service account details
    const serviceAccountInfo = {
      hasServiceAccount: true,
      serviceAccountId: customer.gcpConfig.serviceAccountId,
      serviceAccountEmail: customer.gcpConfig.serviceAccountEmail,
      keySecretName: customer.gcpConfig.serviceAccountKeyRef,
      createdAt: customer.createdAt, // This is an approximation
      // Don't return the actual key
    };

    // Get permission audit if URL param audit=true
    const url = new URL(request.url);
    const shouldAudit = url.searchParams.get('audit') === 'true';
    
    if (shouldAudit) {
      try {
        const auditResults = await auditServiceAccountPermissions(customerId);
        return NextResponse.json({
          ...serviceAccountInfo,
          permissions: auditResults
        });
      } catch (error) {
        console.error('Error auditing service account permissions:', error);
        return NextResponse.json({
          ...serviceAccountInfo,
          auditError: 'Failed to audit permissions'
        });
      }
    }

    return NextResponse.json(serviceAccountInfo);
  } catch (error) {
    console.error('Error fetching service account info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service account information' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new service account for a customer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    // Authorize request (admin only)
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const isAdmin = (session.user as any)?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Await the params to get the ID
    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Get the customer to verify it exists and get needed info
    const firestoreService = await getFirestore();
    const customerData = await firestoreService.getById(CUSTOMER_COLLECTION, customerId) as Customer | null;

    if (!customerData) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer already has a service account
    if (customerData.gcpConfig?.serviceAccountId) {
      return NextResponse.json(
        { error: "Customer already has a service account" },
        { status: 409 }
      );
    }

    // Parse request body for additional parameters
    const body = await request.json();

    // Create the service account
    const serviceAccountResult = await createCustomerServiceAccount({
      customerId,
      customerName: customerData.name,
      billingTier: body.billingTier || customerData.billingTier,
      customRoles: body.customRoles
    });

    // Update the customer record with the service account info
    await firestoreService.update(
      CUSTOMER_COLLECTION,
      customerId,
      {
        gcpConfig: {
          serviceAccountId: serviceAccountResult.accountId,
          serviceAccountEmail: serviceAccountResult.email,
          serviceAccountKeyRef: serviceAccountResult.keySecretName,
        },
        updatedAt: new Date(),
      }
    );

    // Create audit log entry
    await firestoreService.create(
      `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
      auditLogToFirestore({
        customerId,
        timestamp: new Date(),
        action: "service_account_action",
        performedBy: (session.user as any).id || session.user.email!,
        details: {
          serviceAccountAction: "create",
          message: `Service account created with ID ${serviceAccountResult.accountId}`,
        },
      })
    );

    // Return success response with service account info
    return NextResponse.json({
      accountId: serviceAccountResult.accountId,
      email: serviceAccountResult.email,
      keySecretName: serviceAccountResult.keySecretName,
      roles: serviceAccountResult.roles,
    });
  } catch (error: any) {
    console.error("Error creating service account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create service account" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Rotate service account key or update permissions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    // Verify user is authenticated and has admin role
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = (session.user as any)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get customer ID from params
    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // Get customer from Firestore
    const customer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId) as Customer | null;
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if customer has a service account
    if (!customer.gcpConfig?.serviceAccountEmail) {
      return NextResponse.json({ 
        error: 'Customer does not have a service account'
      }, { status: 404 });
    }

    // Parse request body to determine operation
    const body = await request.json();
    const operation = body.operation || 'rotate'; // Default to key rotation
    
    if (operation === 'rotate') {
      // Rotate service account key
      try {
        const keySecretName = await rotateServiceAccountKey(customerId);
        
        // Create audit log entry
        const auditEntry: CustomerAuditLogEntry = {
          customerId,
          timestamp: new Date(),
          action: 'service_account_action',
          performedBy: session.user.id || 'system',
          details: {
            serviceAccountAction: 'rotate',
            message: `Service account key rotated for ${customer.gcpConfig.serviceAccountEmail}`
          }
        };
        
        // Add audit log entry
        await firestoreService.create(
          `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
          auditLogToFirestore(auditEntry)
        );
        
        return NextResponse.json({
          success: true,
          message: 'Service account key rotated successfully',
          keySecretName
        });
      } catch (error: any) {
        console.error('Error rotating service account key:', error);
        return NextResponse.json(
          { error: `Failed to rotate service account key: ${error.message}` },
          { status: 500 }
        );
      }
    } else if (operation === 'update_roles') {
      // Future enhancement: Update IAM roles for the service account
      return NextResponse.json(
        { error: 'Role updates not yet implemented' },
        { status: 501 }
      );
    } else {
      return NextResponse.json(
        { error: `Unknown operation: ${operation}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error handling service account update:', error);
    return NextResponse.json(
      { error: 'Failed to process service account update' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a customer's service account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    // Authorize request (admin only)
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const isAdmin = (session.user as any)?.role === "admin";
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Get customer ID from params
    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Get the customer to verify it exists and has a service account
    const firestoreService = await getFirestore();
    const customerData = await firestoreService.getById(CUSTOMER_COLLECTION, customerId) as Customer | null;

    if (!customerData) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer has a service account
    if (!customerData.gcpConfig?.serviceAccountId) {
      return NextResponse.json(
        { error: "Customer doesn't have a service account" },
        { status: 404 }
      );
    }

    // Delete the service account
    await deleteServiceAccount(customerId);

    // Update the customer record to remove service account info
    await firestoreService.update(
      CUSTOMER_COLLECTION,
      customerId,
      {
        gcpConfig: {},
        updatedAt: new Date(),
      }
    );

    // Create audit log entry
    await firestoreService.create(
      `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
      auditLogToFirestore({
        customerId,
        timestamp: new Date(),
        action: "service_account_action",
        performedBy: (session.user as any).id || session.user.email!,
        details: {
          serviceAccountAction: "delete",
          message: `Service account ${customerData.gcpConfig.serviceAccountId} deleted`,
        },
      })
    );

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Service account deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting service account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete service account" },
      { status: 500 }
    );
  }
} 