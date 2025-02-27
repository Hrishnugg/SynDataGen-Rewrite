/**
 * Service Account API Test Script
 * 
 * This script tests the Service Account Management APIs by creating a test customer,
 * then creating, rotating, retrieving, and deleting a service account for that customer.
 */

import { getFirestore } from '@/lib/services/db-service';
import { Customer, CUSTOMER_COLLECTION } from '@/lib/models/firestore/customer';
import { randomUUID } from 'crypto';
import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const API_KEY = process.env.TEST_API_KEY || 'test-admin-api-key'; // This would be a real admin API key in production
const API_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
};

// Test customer data
let TEST_CUSTOMER_ID: string;
let TEST_CUSTOMER: any;

// Test results
const testResults: {
  name: string;
  success: boolean;
  duration: number;
  error?: any;
}[] = [];

/**
 * Run a test and record the result
 */
async function runTest(
  name: string,
  testFn: () => Promise<any>
): Promise<any> {
  console.log(`\n🔍 Running test: ${name}`);
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ Test passed: ${name} (${duration}ms)`);
    testResults.push({
      name,
      success: true,
      duration
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Test failed: ${name} (${duration}ms)`);
    console.error(error);
    testResults.push({
      name,
      success: false,
      duration,
      error
    });
    throw error;
  }
}

/**
 * Create a test customer
 */
async function createTestCustomer(): Promise<string> {
  console.log('\n📝 Creating test customer...');
  
  const firestoreService = await getFirestore(true);
  
  // Generate unique ID and data for test customer
  const customerId = `test-sa-${randomUUID().substring(0, 8)}`;
  const customerData: Omit<Customer, 'id'> = {
    name: `Service Account Test Customer ${customerId}`,
    email: `sa-test-${customerId}@example.com`,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    billingTier: 'basic', // Use the basic tier for testing
    settings: {
      storageQuota: 100,
      maxProjects: 5
    },
    metadata: {
      isTestCustomer: true,
      createdBy: 'test-service-account-script'
    }
  };
  
  // Create customer in Firestore
  await firestoreService.createWithId(CUSTOMER_COLLECTION, customerId, customerData);
  console.log(`Created test customer with ID: ${customerId}`);
  
  // Store the test customer ID for later cleanup
  TEST_CUSTOMER_ID = customerId;
  TEST_CUSTOMER = { id: customerId, ...customerData };
  
  return customerId;
}

/**
 * Clean up test customer
 */
async function cleanupTestCustomer(): Promise<void> {
  if (!TEST_CUSTOMER_ID) {
    console.log('No test customer to clean up');
    return;
  }
  
  console.log(`\n🧹 Cleaning up test customer ${TEST_CUSTOMER_ID}...`);
  
  try {
    const firestoreService = await getFirestore(true);
    await firestoreService.delete(CUSTOMER_COLLECTION, TEST_CUSTOMER_ID);
    console.log(`Deleted test customer ${TEST_CUSTOMER_ID}`);
  } catch (error) {
    console.error(`Error deleting test customer: ${error}`);
  }
}

/**
 * Test creating a service account
 */
async function testCreateServiceAccount(): Promise<any> {
  return runTest('Create Service Account', async () => {
    const response = await fetch(`${API_BASE_URL}/customers/${TEST_CUSTOMER_ID}/service-account`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({
        customRoles: [] // No custom roles for this test
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create service account: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Service account created:', data.serviceAccountEmail);
    return data;
  });
}

/**
 * Test getting service account info
 */
async function testGetServiceAccountInfo(): Promise<any> {
  return runTest('Get Service Account Info', async () => {
    const response = await fetch(`${API_BASE_URL}/customers/${TEST_CUSTOMER_ID}/service-account`, {
      method: 'GET',
      headers: API_HEADERS
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to get service account info: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Service account info:', data.serviceAccountEmail);
    return data;
  });
}

/**
 * Test getting service account permissions audit
 */
async function testServiceAccountPermissionsAudit(): Promise<any> {
  return runTest('Audit Service Account Permissions', async () => {
    const response = await fetch(`${API_BASE_URL}/customers/${TEST_CUSTOMER_ID}/service-account?audit=true`, {
      method: 'GET',
      headers: API_HEADERS
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to audit service account permissions: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Service account permissions:', data.permissions);
    return data;
  });
}

/**
 * Test rotating a service account key
 */
async function testRotateServiceAccountKey(): Promise<any> {
  return runTest('Rotate Service Account Key', async () => {
    const response = await fetch(`${API_BASE_URL}/customers/${TEST_CUSTOMER_ID}/service-account`, {
      method: 'PATCH',
      headers: API_HEADERS,
      body: JSON.stringify({
        operation: 'rotate'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to rotate service account key: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Service account key rotated:', data.keySecretName);
    return data;
  });
}

/**
 * Test retrieving a service account key
 */
async function testRetrieveServiceAccountKey(): Promise<any> {
  return runTest('Retrieve Service Account Key', async () => {
    const response = await fetch(
      `${API_BASE_URL}/customers/${TEST_CUSTOMER_ID}/service-account/key?confirmed=true&reason=Testing+service+account+key+retrieval`,
      {
        method: 'GET',
        headers: API_HEADERS
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to retrieve service account key: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Service account key retrieved successfully');
    // Don't log the key for security reasons
    return data;
  });
}

/**
 * Test deleting a service account
 */
async function testDeleteServiceAccount(): Promise<any> {
  return runTest('Delete Service Account', async () => {
    const response = await fetch(`${API_BASE_URL}/customers/${TEST_CUSTOMER_ID}/service-account?operation=delete`, {
      method: 'DELETE',
      headers: API_HEADERS
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to delete service account: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Service account deleted:', data.message);
    return data;
  });
}

/**
 * Run all tests in sequence
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Service Account API Tests');
  console.log('=====================================');

  try {
    // Create test customer
    await createTestCustomer();
    
    // Run service account tests
    await testCreateServiceAccount();
    await testGetServiceAccountInfo();
    await testServiceAccountPermissionsAudit();
    await testRotateServiceAccountKey();
    await testRetrieveServiceAccountKey();
    await testDeleteServiceAccount();

    // Print test summary
    console.log('\n📊 Test Summary');
    console.log('=====================================');
    const passed = testResults.filter(r => r.success).length;
    const failed = testResults.filter(r => !r.success).length;
    console.log(`Total tests: ${testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed tests:');
      testResults.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.name}: ${result.error}`);
      });
    }
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    // Clean up
    await cleanupTestCustomer();
  }
}

// Run the tests
runAllTests().catch(console.error); 