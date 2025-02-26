/**
 * Create Test Data Script
 * 
 * This script creates sample test data in Firestore to verify the setup
 * and ensure that the application can work with Firestore data.
 */

import { getFirestoreInstance } from '../lib/gcp/firestore/initFirestore';
import { Customer, CUSTOMER_COLLECTION, DEFAULT_CUSTOMER_SETTINGS } from '../lib/models/firestore/customer';
import { WaitlistSubmission, WAITLIST_COLLECTION } from '../lib/models/firestore/waitlist';
import { createCustomerServiceAccount } from '../lib/gcp/serviceAccount';

// Set to true to create a real service account (costs GCP resources)
const CREATE_SERVICE_ACCOUNT = false;

async function createTestData() {
  try {
    console.log('Initializing Firestore...');
    const db = getFirestoreInstance();
    
    // Create sample customer
    console.log('\nCreating sample customer...');
    const customerId = 'test-customer-1';
    const customerData: Omit<Customer, 'id'> = {
      name: 'Test Customer',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      gcpConfig: {},
      settings: DEFAULT_CUSTOMER_SETTINGS,
      metadata: {
        source: 'test-script',
        createdBy: 'admin'
      }
    };
    
    // Create service account if requested
    if (CREATE_SERVICE_ACCOUNT) {
      console.log('Creating service account for test customer...');
      try {
        const serviceAccountResult = await createCustomerServiceAccount({
          customerId,
          customerName: customerData.name
        });
        
        customerData.gcpConfig = {
          serviceAccountId: serviceAccountResult.accountId,
          serviceAccountEmail: serviceAccountResult.email,
          serviceAccountKeyRef: serviceAccountResult.keySecretName
        };
        
        console.log(`Service account created: ${serviceAccountResult.email}`);
      } catch (error) {
        console.error('Failed to create service account:', error);
        console.log('Continuing without service account...');
      }
    }
    
    // Write customer to Firestore
    await db.collection(CUSTOMER_COLLECTION).doc(customerId).set(customerData);
    console.log(`Created customer with ID: ${customerId}`);
    
    // Create sample waitlist submission
    console.log('\nCreating sample waitlist submission...');
    const waitlistId = 'test-waitlist-1';
    const waitlistData: Omit<WaitlistSubmission, 'id'> = {
      email: 'waitlist@example.com',
      name: 'Wait List User',
      company: 'Example Corp',
      jobTitle: 'Data Engineer',
      useCase: 'We need synthetic data for testing our machine learning models.',
      dataVolume: '10-100GB',
      industry: 'Technology',
      createdAt: new Date(),
      status: 'pending',
      notes: 'Created via test script',
      metadata: {
        referralSource: 'website',
        priority: 'high'
      }
    };
    
    // Write waitlist submission to Firestore
    await db.collection(WAITLIST_COLLECTION).doc(waitlistId).set(waitlistData);
    console.log(`Created waitlist submission with ID: ${waitlistId}`);
    
    // Verify data by reading it back
    console.log('\nVerifying data by reading it back...');
    
    const customerDoc = await db.collection(CUSTOMER_COLLECTION).doc(customerId).get();
    if (customerDoc.exists) {
      console.log('Customer data verification successful');
    } else {
      console.error('Failed to verify customer data!');
    }
    
    const waitlistDoc = await db.collection(WAITLIST_COLLECTION).doc(waitlistId).get();
    if (waitlistDoc.exists) {
      console.log('Waitlist data verification successful');
    } else {
      console.error('Failed to verify waitlist data!');
    }
    
    console.log('\n✅ Test data created successfully!');
    
  } catch (error) {
    console.error('\n❌ Failed to create test data:', error);
    process.exit(1);
  }
}

// Run the script
createTestData(); 