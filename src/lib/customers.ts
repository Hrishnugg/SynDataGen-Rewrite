import { getFirebaseFirestore } from './firebase';
import { logger } from './logger';

export interface Customer {
  id?: string;
  name: string;
  email: string;
  organization: string;
  planId: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt?: string;
  updatedAt?: string;
  serviceAccount?: {
    email: string;
    keyReference: string;
    created: string;
    lastRotated: string;
  };
  usage?: {
    credits: number;
    dataProcessed: number;
    lastUpdated: string;
  };
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Helper function to get Firestore instance
async function getDb() {
  const db = getFirebaseFirestore();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
}

/**
 * Creates a new customer in the database
 * @param customerData The customer data to create
 * @returns The created customer with ID
 */
export async function createCustomer(customerData: Omit<Customer, 'id'>): Promise<Customer> {
  try {
    const db = await getDb();
    const customerRef = await db.collection('customers').add({
      ...customerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return {
      id: customerRef.id,
      ...customerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error creating customer:', error);
    throw error;
  }
}

/**
 * Gets a customer by ID
 * @param id The customer ID
 * @returns The customer data or null if not found
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const db = await getDb();
    const doc = await db.collection('customers').doc(id).get();
    
    if (!doc.exists) {
      return null;
    }
    
    return {
      ...doc.data() as Customer,
      id: doc.id,
    };
  } catch (error) {
    logger.error(`Error getting customer with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Updates a customer by ID
 * @param id The customer ID
 * @param updateData The data to update
 * @returns The updated customer
 */
export async function updateCustomer(
  id: string, 
  updateData: Partial<Customer>
): Promise<Customer> {
  try {
    const db = await getDb();
    // Update the timestamp
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    
    // Update in Firestore
    await db.collection('customers').doc(id).update(dataToUpdate);
    
    logger.info(`Updated customer: ${id}`);
    
    // Get the updated customer
    const updatedCustomer = await getCustomerById(id);
    if (!updatedCustomer) {
      throw new Error(`Customer with ID ${id} not found after update`);
    }
    
    return updatedCustomer;
  } catch (error) {
    logger.error(`Error updating customer with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Deletes a customer by ID
 * @param id The customer ID
 * @returns True if successful
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  try {
    const db = await getDb();
    await db.collection('customers').doc(id).delete();
    
    logger.info(`Deleted customer: ${id}`);
    
    return true;
  } catch (error) {
    logger.error(`Error deleting customer with ID ${id}:`, error);
    throw error;
  }
}

/**
 * Lists all customers with optional filtering and pagination
 * @param options Optional filtering and pagination options
 * @returns Array of customers
 */
export async function listCustomers(options?: {
  limit?: number;
  offset?: number;
  status?: Customer['status'];
  planId?: string;
}): Promise<Customer[]> {
  try {
    const db = await getDb();
    let query = db.collection('customers');
    
    // Apply filters if provided
    if (options?.status) {
      query = query.where('status', '==', options.status);
    }
    
    if (options?.planId) {
      query = query.where('planId', '==', options.planId);
    }
    
    // Order by created date
    query = query.orderBy('createdAt', 'desc');
    
    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.offset(options.offset);
    }
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({
      ...doc.data() as Customer,
      id: doc.id,
    }));
  } catch (error) {
    logger.error('Error listing customers:', error);
    throw error;
  }
}

/**
 * Searches customers by name, email, or organization
 * @param searchTerm The search term
 * @param limit Maximum number of results
 * @returns Array of matching customers
 */
export async function searchCustomers(
  searchTerm: string,
  limit: number = 10
): Promise<Customer[]> {
  try {
    const db = await getDb();
    // Normalize search term
    const normalizedTerm = searchTerm.toLowerCase().trim();
    
    // Get all customers (Firestore doesn't support text search directly)
    const snapshot = await db.collection('customers').get();
    
    // Filter customers based on search term
    const matchingCustomers = snapshot.docs
      .map(doc => ({
        ...doc.data() as Customer,
        id: doc.id,
      }))
      .filter(customer => 
        customer.name.toLowerCase().includes(normalizedTerm) ||
        customer.email.toLowerCase().includes(normalizedTerm) ||
        customer.organization.toLowerCase().includes(normalizedTerm)
      )
      .slice(0, limit);
    
    return matchingCustomers;
  } catch (error) {
    logger.error('Error searching customers:', error);
    throw error;
  }
} 