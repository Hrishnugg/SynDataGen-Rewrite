import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { 
  CUSTOMER_COLLECTION,
  Customer, 
  CustomerAuditLogEntry,
  CUSTOMER_AUDIT_LOG_COLLECTION,
  auditLogToFirestore
} from '@/lib/models/firestore/customer';
import { getFirestore } from '@/lib/api/services/db-service';
import { PROJECT_COLLECTION } from '@/lib/models/firestore/project';
import { DATA_GENERATION_JOB_COLLECTION } from '@/lib/models/firestore/dataGenerationJob';

// Define the CustomerType interface for better type safety
interface CustomerType {
  usageStatistics?: {
    lastLoginDate: Date | null;
    totalProjects: number;
    totalDataGenerated: number;
    apiRequestsThisMonth: number;
    lastAccessedAt: Date | null;
  };
  settings?: {
    billingTier?: string;
    maxProjects?: number;
    maxStorage?: number;
  };
  billingTier?: string;
}

// Define the IdParams type for non-Promise-based parameters
type IdParams = { id: string };

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
    const isAdmin = (session.user as any)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get customer ID from params
    const { id: customerId } = params;
    
    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // Get customer from Firestore
    const customer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get current usage statistics
    const typedCustomer = customer as CustomerType;
    const usageStats = typedCustomer.usageStatistics || {
      lastLoginDate: null,
      totalProjects: 0,
      totalDataGenerated: 0,
      apiRequestsThisMonth: 0,
      lastAccessedAt: null
    };

    // Get projects associated with this customer
    const projectsRef = `${CUSTOMER_COLLECTION}/${customerId}/${PROJECT_COLLECTION}`;
    // Fix: Use query instead of getAll and provide required options parameter
    const projects = await firestoreService.query(projectsRef, {}) || [];
    
    // Define project type for clarity
    interface ProjectType {
      id: string;
      name?: string;
      createdAt: Date;
      status: string;
      usageStatistics?: any;
      storage?: { 
        usedStorage: number 
      };
      config?: {
        parameters?: {
          recordCount?: number;
        };
      };
    }
    
    // Get usage statistics by project with proper type cast
    const projectStats = projects.map((project: unknown) => {
      const typedProject = project as ProjectType;
      return {
        id: typedProject.id,
        name: typedProject.name || 'Unnamed Project',
        createdAt: typedProject.createdAt,
        status: typedProject.status || 'active',
        usage: typedProject.usageStatistics || {
          dataGenerated: 0,
          lastGenerationDate: null,
          apiCalls: 0
        }
      };
    });

    // Get real-time project count
    const projectsQuery = await firestoreService.query(
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

    projectsQuery.forEach((project: unknown) => {
      const typedProject = project as ProjectType;
      if (typedProject.status === 'active') {
        activeProjectCount++;
      }
      
      if (typedProject.storage && typedProject.storage.usedStorage) {
        totalStorageUsed += typedProject.storage.usedStorage;
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

    // Helper function to count records by status
    const countByStatus = (jobs: unknown[], status: string) => {
      return jobs.filter((job: unknown) => {
        const typedJob = job as { status: string };
        return typedJob.status === status;
      }).length;
    };
    
    // Helper function to summarize job statistics
    const summarizeJobStats = (jobs: unknown[]) => {
      return {
        totalRecordsGenerated: jobs.reduce((sum: number, job: unknown) => {
          const typedJob = job as { recordCount?: number };
          return sum + (typedJob.recordCount || 0);
        }, 0),
        totalJobs: jobs.length,
        completedJobs: countByStatus(jobs, 'completed'),
        failedJobs: countByStatus(jobs, 'failed'),
        processingJobs: countByStatus(jobs, 'processing'),
        queuedJobs: countByStatus(jobs, 'queued'),
        averageJobTime: jobs.length > 0 ? 
          jobs.reduce((sum: number, job: unknown) => {
            const typedJob = job as { completed?: Date; started?: Date };
            if (typedJob.completed && typedJob.started) {
              return sum + (new Date(typedJob.completed).getTime() - new Date(typedJob.started).getTime());
            }
            return sum;
          }, 0) / Math.max(1, jobs.filter((job: unknown) => {
            const typedJob = job as { completed?: Date; started?: Date };
            return typedJob.completed && typedJob.started;
          }).length) : 0
      };
    };

    // Calculate various metrics
    const completedJobs = jobs.filter((job: unknown) => {
      const typedJob = job as { status: string };
      return typedJob.status === 'completed';
    }).length;
    const failedJobs = jobs.filter((job: unknown) => {
      const typedJob = job as { status: string };
      return typedJob.status === 'failed';
    }).length;
    const queuedJobs = jobs.filter((job: unknown) => {
      const typedJob = job as { status: string };
      return typedJob.status === 'queued';
    }).length;
    const runningJobs = jobs.filter((job: unknown) => {
      const typedJob = job as { status: string };
      return typedJob.status === 'running';
    }).length;

    // Calculate total data generated (from job parameters)
    let dataGeneratedFromJobs = 0;
    jobs.forEach((job: unknown) => {
      const typedJob = job as { status: string; config?: { parameters?: { recordCount?: number } } };
      if (typedJob.status === 'completed' && typedJob.config?.parameters?.recordCount) {
        dataGeneratedFromJobs += typedJob.config.parameters.recordCount;
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
          total: typedCustomer.settings?.maxProjects || 0,
          percentUsed: typedCustomer.settings?.maxProjects ? (projects.length / typedCustomer.settings.maxProjects) * 100 : 0
        },
        storageQuota: {
          used: totalStorageUsed / (1024 * 1024 * 1024), // Convert to GB
          total: typedCustomer.settings?.maxStorage || 0,
          percentUsed: typedCustomer.settings?.maxStorage ? (totalStorageUsed / (1024 * 1024 * 1024) / typedCustomer.settings.maxStorage) * 100 : 0
        }
      },
      billingMetrics: {
        tier: typedCustomer.billingTier || 'free',
        currentMonthJobCount: jobs.filter((job: unknown) => {
          const typedJob = job as { createdAt: string | Date };
          const jobDate = typedJob.createdAt instanceof Date ? typedJob.createdAt : new Date(typedJob.createdAt);
          const now = new Date();
          return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
        }).length
      }
    };

    // Update usage statistics
    try {
      if (true) {
        // Add type for saveCustomer
        const customerToUpdate = customer as CustomerType & { 
          usageStatistics?: {
            totalProjects?: number;
            activeProjects?: number; 
            totalDataGenerated?: number;
            lastAccessedAt?: Date;
            lastLoginDate?: Date | null;
            apiRequestsThisMonth?: number;
          }
        };
        
        // Create or update usage statistics
        if (!customerToUpdate.usageStatistics) {
          customerToUpdate.usageStatistics = {
            lastLoginDate: new Date(),
            totalProjects: 0,
            totalDataGenerated: 0,
            apiRequestsThisMonth: 0,
            lastAccessedAt: new Date()
          };
        }
        
        // Use non-null assertion since we ensure it exists above
        customerToUpdate.usageStatistics!.totalProjects = projects.length;
        customerToUpdate.usageStatistics!.activeProjects = activeProjectCount;
        customerToUpdate.usageStatistics!.totalDataGenerated = dataGeneratedFromJobs;
        customerToUpdate.usageStatistics!.lastAccessedAt = new Date();
        
        // Update customer usage statistics in Firestore
        await firestoreService.update(
          CUSTOMER_COLLECTION, 
          customerId, 
          customerToUpdate
        );
      }
    } catch (error) {
      console.error('Error updating customer usage statistics:', error);
    }

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
    const isAdmin = (session.user as any)?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get customer ID from params
    const { id: customerId } = params;
    
    // Get Firestore service
    const firestoreService = await getFirestore();
    
    // Get customer from Firestore
    const customer = await firestoreService.getById(CUSTOMER_COLLECTION, customerId);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Add proper type assertion for customer
    const typedCustomer = customer as CustomerType & { 
      usageStatistics?: Record<string, any> 
    };

    // Parse request body
    const updateData = await request.json();
    
    // Extract only the usage statistics from the update data
    const usageUpdate = {
      usageStatistics: {
        ...typedCustomer.usageStatistics,
        ...updateData
      }
    };

    // Track changes for audit log
    const oldUsageStats = typedCustomer.usageStatistics || {};
    
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