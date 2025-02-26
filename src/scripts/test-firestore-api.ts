/**
 * Firestore API Endpoint Testing
 * 
 * This script tests the API endpoints with Firestore enabled
 * to verify that the Firestore integration is working correctly.
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
let authToken: string | null = null;

// Test result tracking
const testResults: {
  name: string;
  success: boolean;
  error?: string;
  response?: any;
  duration: number;
}[] = [];

/**
 * Run a test case
 */
async function runTest(
  name: string,
  testFn: () => Promise<any>
): Promise<void> {
  console.log(`\nRunning test: ${name}`);
  const startTime = Date.now();
  
  try {
    const response = await testFn();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Test passed: ${name} (${duration}ms)`);
    testResults.push({
      name,
      success: true,
      response,
      duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Test failed: ${name} (${duration}ms)`);
    console.error('  Error:', error.message);
    
    testResults.push({
      name,
      success: false,
      error: error.message,
      duration
    });
  }
}

/**
 * Login and get an auth token (if using authentication)
 */
async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.token;
}

/**
 * Make an authenticated API request
 */
async function makeAuthRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${text}`);
  }
  
  return await response.json();
}

/**
 * Test waitlist submission
 */
async function testWaitlistSubmission(): Promise<void> {
  const uniqueEmail = `test-${Date.now()}@example.com`;
  
  await runTest('Waitlist Submission', async () => {
    const response = await fetch(`${API_BASE_URL}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: uniqueEmail,
        company: 'Test Company',
        jobTitle: 'QA Engineer',
        industry: 'Technology',
        dataVolume: '10-100GB',
        useCase: 'Testing Firestore integration'
      })
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Waitlist submission failed: ${response.status} ${response.statusText} - ${text}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Waitlist submission unsuccessful: ${data.error || 'Unknown error'}`);
    }
    
    return data;
  });
  
  // Test duplicate submission (should fail)
  await runTest('Duplicate Waitlist Submission (Expected Failure)', async () => {
    const response = await fetch(`${API_BASE_URL}/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: uniqueEmail, // Same email as above
        company: 'Test Company',
        jobTitle: 'QA Engineer',
        industry: 'Technology',
        dataVolume: '10-100GB',
        useCase: 'Testing Firestore integration'
      })
    });
    
    const data = await response.json();
    
    // Should get a 400 error for duplicate submission
    if (response.status !== 400 || !data.error.includes("already on the waitlist")) {
      throw new Error(`Expected duplicate submission to fail with 400, got ${response.status}`);
    }
    
    return "Duplicate detection working correctly";
  });
}

/**
 * Test project creation and management (requires authentication)
 */
async function testProjectOperations(): Promise<void> {
  let projectId: string | null = null;

  // Create a project
  await runTest('Project Creation', async () => {
    const response = await makeAuthRequest('/projects', 'POST', {
      name: `Test Project ${Date.now()}`,
      description: 'A test project for Firestore integration testing',
      // Include other required fields based on your schema
    });
    
    // Save project ID for subsequent tests
    projectId = response.id;
    return response;
  });

  // Skip subsequent tests if project creation failed
  if (!projectId) {
    console.warn('Skipping project tests because project creation failed');
    return;
  }

  // Get project details
  await runTest('Get Project Details', async () => {
    const response = await makeAuthRequest(`/projects/${projectId}`);
    return response;
  });

  // Update project
  await runTest('Update Project', async () => {
    const response = await makeAuthRequest(`/projects/${projectId}`, 'PATCH', {
      description: `Updated description at ${new Date().toISOString()}`
    });
    return response;
  });

  // List all projects
  await runTest('List All Projects', async () => {
    const response = await makeAuthRequest('/projects');
    return response;
  });

  // Delete (archive) project
  await runTest('Delete Project', async () => {
    const response = await makeAuthRequest(`/projects/${projectId}`, 'DELETE');
    return response;
  });
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<void> {
  console.log('Starting Firestore API endpoint tests...');
  
  // Force using Firestore (if your env allows this control)
  process.env.NEXT_PUBLIC_ENABLE_GCP_FEATURES = 'true';
  
  // Test waitlist submissions (doesn't require auth)
  await testWaitlistSubmission();
  
  // Try to login if testing authenticated endpoints
  try {
    if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
      authToken = await login(
        process.env.TEST_USER_EMAIL,
        process.env.TEST_USER_PASSWORD
      );
      console.log('Successfully logged in');
      
      // Test project operations (requires auth)
      await testProjectOperations();
    } else {
      console.log('Skipping authenticated tests because TEST_USER_EMAIL/PASSWORD not set');
    }
  } catch (error) {
    console.error('Authentication failed, skipping authenticated tests:', error);
  }
  
  // Print summary
  console.log('\n==== TEST SUMMARY ====');
  const passed = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.success).length;
  console.log(`Total tests: ${testResults.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(r => !r.success).forEach(test => {
      console.log(`- ${test.name}: ${test.error}`);
    });
    process.exit(1);
  } else {
    console.log('\nAll tests passed! 🎉');
    process.exit(0);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
}); 