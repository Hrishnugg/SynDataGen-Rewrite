/**
 * Firestore Customer Model
 * 
 * Defines the structure and types for customer data in Firestore.
 */

/**
 * Customer data model for Firestore
 */
export interface Customer {
  id: string;            // Unique identifier for the customer
  name: string;          // Customer name
  email: string;         // Primary contact email
  createdAt: Date;       // Account creation date
  updatedAt: Date;       // Last update timestamp
  status: 'active' | 'inactive' | 'suspended';
  billingTier?: 'free' | 'basic' | 'professional' | 'enterprise'; // Customer's billing tier
  usageStatistics?: {
    lastLoginDate?: Date;       // Last time customer logged in
    totalProjects?: number;     // Total number of projects created
    totalDataGenerated?: number; // Total data generated in bytes
    apiRequestsThisMonth?: number; // API requests made this month
    lastAccessedAt?: Date;      // Last time customer accessed the platform
  };
  contactInfo?: {
    primary: {
      name: string;
      email: string;
      phone?: string;
    };
    billing?: {
      name: string;
      email: string;
      phone?: string;
    };
    technical?: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  subscriptionDetails?: {
    planId?: string;       // ID of the subscription plan
    startDate?: Date;      // When subscription started
    renewalDate?: Date;    // When subscription renews
    autoRenew?: boolean;   // Whether subscription auto-renews
    paymentMethod?: string; // Payment method reference
  };
  gcpConfig?: {
    serviceAccountId?: string;    // GCP service account ID
    serviceAccountEmail?: string; // GCP service account email
    serviceAccountKeyRef?: string; // Reference to key in Secret Manager (NOT stored directly)
  };
  settings: {
    storageQuota: number;        // Total storage quota in GB
    maxProjects: number;         // Maximum allowed projects
  };
  metadata: Record<string, any>; // Flexible metadata field
}

/**
 * Input type for creating a new customer
 */
export interface CreateCustomerInput {
  name: string;
  email: string;
  status?: 'active' | 'inactive' | 'suspended';
  billingTier?: 'free' | 'basic' | 'professional' | 'enterprise';
  contactInfo?: {
    primary: {
      name: string;
      email: string;
      phone?: string;
    };
    billing?: {
      name: string;
      email: string;
      phone?: string;
    };
    technical?: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  subscriptionDetails?: {
    planId?: string;
    startDate?: Date;
    renewalDate?: Date;
    autoRenew?: boolean;
    paymentMethod?: string;
  };
  settings?: {
    storageQuota?: number;
    maxProjects?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Default settings for new customers
 */
export const DEFAULT_CUSTOMER_SETTINGS = {
  storageQuota: 100, // 100 GB storage by default
  maxProjects: 5     // 5 projects by default
};

/**
 * Default billing tier for new customers
 */
export const DEFAULT_BILLING_TIER = 'free';

/**
 * Firestore collection name for customers
 */
export const CUSTOMER_COLLECTION = 'customers';

/**
 * Firestore subcollection name for customer audit logs
 */
export const CUSTOMER_AUDIT_LOG_COLLECTION = 'auditLog';

/**
 * Convert a Firestore document to a Customer object
 * @param doc Firestore document data
 * @param id Document ID
 * @returns Customer object
 */
export function firestoreToCustomer(doc: FirebaseFirestore.DocumentData, id: string): Customer {
  return {
    id,
    name: doc.name,
    email: doc.email,
    createdAt: doc.createdAt?.toDate() || new Date(),
    updatedAt: doc.updatedAt?.toDate() || new Date(),
    status: doc.status || 'inactive',
    billingTier: doc.billingTier || DEFAULT_BILLING_TIER,
    usageStatistics: doc.usageStatistics ? {
      lastLoginDate: doc.usageStatistics.lastLoginDate?.toDate(),
      totalProjects: doc.usageStatistics.totalProjects || 0,
      totalDataGenerated: doc.usageStatistics.totalDataGenerated || 0,
      apiRequestsThisMonth: doc.usageStatistics.apiRequestsThisMonth || 0,
      lastAccessedAt: doc.usageStatistics.lastAccessedAt?.toDate()
    } : undefined,
    contactInfo: doc.contactInfo || undefined,
    subscriptionDetails: doc.subscriptionDetails ? {
      planId: doc.subscriptionDetails.planId,
      startDate: doc.subscriptionDetails.startDate?.toDate(),
      renewalDate: doc.subscriptionDetails.renewalDate?.toDate(),
      autoRenew: doc.subscriptionDetails.autoRenew || false,
      paymentMethod: doc.subscriptionDetails.paymentMethod
    } : undefined,
    gcpConfig: doc.gcpConfig || {},
    settings: doc.settings || { ...DEFAULT_CUSTOMER_SETTINGS },
    metadata: doc.metadata || {}
  };
}

/**
 * Convert a Customer object to Firestore document data
 * @param customer Customer object
 * @returns Firestore document data
 */
export function customerToFirestore(customer: Customer): FirebaseFirestore.DocumentData {
  const data: FirebaseFirestore.DocumentData = {
    name: customer.name,
    email: customer.email,
    createdAt: customer.createdAt,
    updatedAt: new Date(), // Always update the timestamp
    status: customer.status,
    gcpConfig: customer.gcpConfig || {},
    settings: customer.settings,
    metadata: customer.metadata || {}
  };

  // Add optional fields only if they exist
  if (customer.billingTier) {
    data.billingTier = customer.billingTier;
  }

  if (customer.usageStatistics) {
    data.usageStatistics = { ...customer.usageStatistics };
  }

  if (customer.contactInfo) {
    data.contactInfo = { ...customer.contactInfo };
  }

  if (customer.subscriptionDetails) {
    data.subscriptionDetails = { ...customer.subscriptionDetails };
  }

  return data;
}

/**
 * Customer audit log entry
 */
export interface CustomerAuditLogEntry {
  id?: string;           // Entry ID
  customerId: string;    // Reference to customer
  timestamp: Date;       // When the action occurred
  action: 'create' | 'update' | 'delete' | 'status_change' | 'login' | 'billing_change' | 'service_account_action';
  performedBy: string;   // User ID who performed the action
  details: {
    changes?: Record<string, { old: any; new: any }>;
    message?: string;
    serviceAccountAction?: 'create' | 'rotate' | 'delete' | 'suspend' | 'restore';
  };
}

/**
 * Creates an audit log entry for customer actions
 * @param entry Audit log entry data
 * @returns Firestore document data
 */
export function auditLogToFirestore(entry: CustomerAuditLogEntry): FirebaseFirestore.DocumentData {
  return {
    customerId: entry.customerId,
    timestamp: entry.timestamp || new Date(),
    action: entry.action,
    performedBy: entry.performedBy,
    details: entry.details || {}
  };
} 