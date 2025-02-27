import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  CUSTOMER_COLLECTION,
  Customer, 
  CustomerAuditLogEntry,
  CUSTOMER_AUDIT_LOG_COLLECTION,
  auditLogToFirestore
} from '@/lib/models/firestore/customer';
import { getFirestore } from '@/lib/services/db-service';

// Define the IdParams type for Promise-based parameters
type IdParams = Promise<{ id: string }>;

/**
 * GET - Retrieve customer subscription details
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

    // Admin check - in the future, customers could also view their own subscription
    const isAdmin = !!(session.user as any)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get customer ID from params
    const { id: customerId } = await params;
    
    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // Get customer from Firestore
    const customer = await firestoreService.getById<Customer>(CUSTOMER_COLLECTION, customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get subscription details
    const subscriptionDetails = customer.subscriptionDetails || {
      planId: 'free-tier',
      startDate: customer.createdAt,
      renewalDate: null,
      autoRenew: false,
      paymentMethod: null
    };

    // Calculate subscription status
    const now = new Date();
    const renewalDate = subscriptionDetails.renewalDate 
      ? subscriptionDetails.renewalDate instanceof Date 
        ? subscriptionDetails.renewalDate 
        : new Date(subscriptionDetails.renewalDate) 
      : null;
    
    const subscriptionStatus = !renewalDate ? 'inactive' :
      renewalDate < now ? 'expired' : 
      customer.status !== 'active' ? 'suspended' : 'active';

    // Calculate days remaining in subscription
    const daysRemaining = renewalDate 
      ? Math.max(0, Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) 
      : 0;

    // Build enhanced subscription information
    const enhancedSubscription = {
      ...subscriptionDetails,
      status: subscriptionStatus,
      daysRemaining,
      billingTier: customer.billingTier || 'free',
      resources: {
        maxProjects: customer.settings.maxProjects,
        storageQuotaGB: customer.settings.storageQuota
      }
    };

    return NextResponse.json(enhancedSubscription);
  } catch (error) {
    console.error('Error fetching customer subscription details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer subscription details' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update customer subscription information
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
    const isAdmin = !!(session.user as any)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get customer ID from params
    const { id: customerId } = await params;
    
    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // Get customer from Firestore
    const customer = await firestoreService.getById<Customer>(CUSTOMER_COLLECTION, customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Parse request body
    const updateData = await request.json();
    
    // Validate the request data
    if (updateData.planId && typeof updateData.planId !== 'string') {
      return NextResponse.json(
        { error: "planId must be a string" },
        { status: 400 }
      );
    }

    if (updateData.startDate && isNaN(new Date(updateData.startDate).getTime())) {
      return NextResponse.json(
        { error: "startDate must be a valid date" },
        { status: 400 }
      );
    }

    if (updateData.renewalDate && isNaN(new Date(updateData.renewalDate).getTime())) {
      return NextResponse.json(
        { error: "renewalDate must be a valid date" },
        { status: 400 }
      );
    }

    if (updateData.autoRenew !== undefined && typeof updateData.autoRenew !== 'boolean') {
      return NextResponse.json(
        { error: "autoRenew must be a boolean" },
        { status: 400 }
      );
    }

    // Prepare subscription update
    const currentSubscription = customer.subscriptionDetails || {};
    
    const subscriptionUpdate = {
      subscriptionDetails: {
        ...currentSubscription,
        ...updateData
      }
    };

    // If billing tier is provided, update that as well
    if (updateData.billingTier) {
      subscriptionUpdate.billingTier = updateData.billingTier;
      
      // Update resource limits based on billing tier
      const settings = { ...customer.settings };
      
      switch (updateData.billingTier) {
        case 'free':
          settings.maxProjects = 5;
          settings.storageQuota = 100;
          break;
        case 'basic':
          settings.maxProjects = 10;
          settings.storageQuota = 500;
          break;
        case 'professional':
          settings.maxProjects = 25;
          settings.storageQuota = 2000;
          break;
        case 'enterprise':
          settings.maxProjects = 100;
          settings.storageQuota = 10000;
          break;
      }
      
      subscriptionUpdate.settings = settings;
    }

    // Track changes for audit log
    const changes = {
      subscriptionDetails: {
        old: currentSubscription,
        new: subscriptionUpdate.subscriptionDetails
      }
    };
    
    if (subscriptionUpdate.billingTier) {
      changes.billingTier = {
        old: customer.billingTier,
        new: subscriptionUpdate.billingTier
      };
      
      changes.settings = {
        old: customer.settings,
        new: subscriptionUpdate.settings
      };
    }

    // Update customer subscription in Firestore
    await firestoreService.update(
      CUSTOMER_COLLECTION, 
      customerId, 
      subscriptionUpdate
    );

    // Create audit log entry
    const auditEntry: CustomerAuditLogEntry = {
      customerId,
      timestamp: new Date(),
      action: 'billing_change',
      performedBy: session.user.id || 'system',
      details: { 
        changes,
        message: 'Subscription updated'
      }
    };

    // Add audit log entry to Firestore
    await firestoreService.create(
      `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
      auditLogToFirestore(auditEntry)
    );

    // Get updated customer
    const updatedCustomer = await firestoreService.getById<Customer>(CUSTOMER_COLLECTION, customerId);
    
    // Return the updated subscription details
    return NextResponse.json({
      subscriptionDetails: updatedCustomer?.subscriptionDetails,
      billingTier: updatedCustomer?.billingTier,
      settings: updatedCustomer?.settings
    });
  } catch (error) {
    console.error('Error updating customer subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update customer subscription' },
      { status: 500 }
    );
  }
} 