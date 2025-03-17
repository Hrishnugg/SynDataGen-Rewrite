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
    const db = await getFirestoreInstance();
    
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
        
        console.log('Service account created successfully:', serviceAccountResult.email);
      } catch (error) {
        console.error('Error creating service account:', error);
        console.log('Continuing without service account...');
      }
    }
    
    // Create customer document
    console.log(`Creating customer document with ID: ${customerId}`);
    await db.collection(CUSTOMER_COLLECTION).doc(customerId).set(customerData);
    console.log('Customer document created successfully');
    
    // Create sample waitlist submission
    console.log('\nCreating sample waitlist submission...');
    const waitlistId = 'test-waitlist-1';
    const waitlistData: Omit<WaitlistSubmission, 'id'> = {
      email: 'waitlist@example.com',
      name: 'Waitlist User',
      company: 'Test Company',
      useCase: 'Testing the application',
      createdAt: new Date(),
      status: 'pending',
      metadata: {
        source: 'test-script'
      }
    };
    
    // Create waitlist document
    console.log(`Creating waitlist document with ID: ${waitlistId}`);
    await db.collection(WAITLIST_COLLECTION).doc(waitlistId).set(waitlistData);
    console.log('Waitlist document created successfully');
    
    // Verify data was created
    console.log('\nVerifying customer document...');
    const customerDoc = await db.collection(CUSTOMER_COLLECTION).doc(customerId).get();
    
    if (customerDoc.exists) {
      console.log('Customer document exists:', customerDoc.data());
    } else {
      console.error('Customer document was not created successfully');
    }
    
    console.log('\nVerifying waitlist document...');
    const waitlistDoc = await db.collection(WAITLIST_COLLECTION).doc(waitlistId).get();
    
    if (waitlistDoc.exists) {
      console.log('Waitlist document exists:', waitlistDoc.data());
    } else {
      console.error('Waitlist document was not created successfully');
    }
    
    console.log('\nTest data creation completed successfully');
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

// Run the script
createTestData().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 