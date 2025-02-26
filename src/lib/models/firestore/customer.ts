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
 * Firestore collection name for customers
 */
export const CUSTOMER_COLLECTION = 'customers';

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
  return {
    name: customer.name,
    email: customer.email,
    createdAt: customer.createdAt,
    updatedAt: new Date(), // Always update the timestamp
    status: customer.status,
    gcpConfig: customer.gcpConfig || {},
    settings: customer.settings,
    metadata: customer.metadata || {}
  };
} 