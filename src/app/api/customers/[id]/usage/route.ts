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
import { PROJECT_COLLECTION } from '@/lib/models/firestore/project';
import { DATA_GENERATION_JOB_COLLECTION } from '@/lib/models/firestore/dataGenerationJob';

// Define the IdParams type for Promise-based parameters
type IdParams = Promise<{ id: string }>;

/**
 * GET - Retrieve customer usage statistics
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

    // Admin check - in the future, customers could also view their own usage
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

    // Get current usage statistics
    const usageStats = customer.usageStatistics || {
      lastLoginDate: null,
      totalProjects: 0,
      totalDataGenerated: 0,
      apiRequestsThisMonth: 0,
      lastAccessedAt: null
    };

    // Get real-time project count
    const projects = await firestoreService.query(
      PROJECT_COLLECTION,
      {
        where: [
          { field: 'customerId', operator: '==', value: customerId },
          { field: 'status', operator: '!=', value: 'deleted' }
        ]
      }
    );

    // Get storage usage from projects
    let totalStorageUsed = 0;
    let activeProjectCount = 0;

    projects.forEach(project => {
      if (project.status === 'active') {
        activeProjectCount++;
      }
      
      if (project.storage && project.storage.usedStorage) {
        totalStorageUsed += project.storage.usedStorage;
      }
    });

    // Get job statistics
    const jobs = await firestoreService.query(
      DATA_GENERATION_JOB_COLLECTION,
      {
        where: [
          { field: 'customerId', operator: '==', value: customerId }
        ]
      }
    );

    // Calculate various metrics
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const failedJobs = jobs.filter(job => job.status === 'failed').length;
    const queuedJobs = jobs.filter(job => job.status === 'queued').length;
    const runningJobs = jobs.filter(job => job.status === 'running').length;

    // Calculate total data generated (from job parameters)
    let dataGeneratedFromJobs = 0;
    jobs.forEach(job => {
      if (job.status === 'completed' && job.config?.parameters?.recordCount) {
        dataGeneratedFromJobs += job.config.parameters.recordCount;
      }
    });

    // Build enhanced usage statistics
    const enhancedStats = {
      ...usageStats,
      realTimeMetrics: {
        totalProjects: projects.length,
        activeProjects: activeProjectCount,
        storageUsedBytes: totalStorageUsed,
        storageUsedGB: totalStorageUsed / (1024 * 1024 * 1024),
        jobMetrics: {
          totalJobs: jobs.length,
          completedJobs,
          failedJobs,
          queuedJobs,
          runningJobs,
          recordsGenerated: dataGeneratedFromJobs
        }
      },
      quotaUsage: {
        projectsQuota: {
          used: projects.length,
          total: customer.settings.maxProjects,
          percentUsed: (projects.length / customer.settings.maxProjects) * 100
        },
        storageQuota: {
          used: totalStorageUsed / (1024 * 1024 * 1024), // Convert to GB
          total: customer.settings.storageQuota,
          percentUsed: (totalStorageUsed / (1024 * 1024 * 1024) / customer.settings.storageQuota) * 100
        }
      },
      billingMetrics: {
        tier: customer.billingTier || 'free',
        currentMonthJobCount: jobs.filter(job => {
          const jobDate = job.createdAt instanceof Date ? job.createdAt : new Date(job.createdAt);
          const now = new Date();
          return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
        }).length
      }
    };

    return NextResponse.json(enhancedStats);
  } catch (error) {
    console.error('Error fetching customer usage statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer usage statistics' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update customer usage statistics
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    // Authorize request (admin only)
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
    
    // Extract only the usage statistics from the update data
    const usageUpdate = {
      usageStatistics: {
        ...customer.usageStatistics,
        ...updateData
      }
    };

    // Track changes for audit log
    const oldUsageStats = customer.usageStatistics || {};
    
    // Update customer usage statistics in Firestore
    await firestoreService.update(
      CUSTOMER_COLLECTION, 
      customerId, 
      usageUpdate
    );

    // Create audit log entry
    const auditEntry: CustomerAuditLogEntry = {
      customerId,
      timestamp: new Date(),
      action: 'update',
      performedBy: session.user.id || 'system',
      details: { 
        changes: {
          usageStatistics: {
            old: oldUsageStats,
            new: usageUpdate.usageStatistics
          }
        },
        message: 'Usage statistics updated'
      }
    };

    // Add audit log entry to Firestore
    await firestoreService.create(
      `${CUSTOMER_COLLECTION}/${customerId}/${CUSTOMER_AUDIT_LOG_COLLECTION}`,
      auditLogToFirestore(auditEntry)
    );

    // Return updated usage statistics
    return NextResponse.json(usageUpdate.usageStatistics);
  } catch (error) {
    console.error('Error updating customer usage statistics:', error);
    return NextResponse.json(
      { error: 'Failed to update customer usage statistics' },
      { status: 500 }
    );
  }
} 