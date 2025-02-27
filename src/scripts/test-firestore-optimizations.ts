/**
 * Firestore Optimization Test Script
 * 
 * This script verifies the Firestore optimizations, particularly:
 * - Enhanced caching system
 * - Cursor-based pagination
 * - Query performance
 * - Batch operations
 */

import { getFirestore, preloadCommonData, clearDatabaseCache } from '../lib/services/db-service';
import { PROJECT_COLLECTION } from '../lib/models/firestore/project';
import { CUSTOMER_COLLECTION } from '../lib/models/firestore/customer';
import { WAITLIST_COLLECTION } from '../lib/models/firestore/waitlist';

// Test configuration
const TEST_CONFIG = {
  iterations: 5,                  // Number of test iterations
  documentsPerCollection: 50,     // Test with this many documents
  pageSize: 10,                   // Page size for pagination tests
  sleepBetweenTests: 500,         // Wait time between tests (ms)
  collectionsToTest: [
    PROJECT_COLLECTION,
    CUSTOMER_COLLECTION,
    WAITLIST_COLLECTION
  ]
};

// Wait for a specified amount of time
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format timing in milliseconds
function formatTiming(ms: number): string {
  return `${ms.toFixed(2)}ms`;
}

/**
 * Test caching effectiveness
 */
async function testCaching(collectionPath: string): Promise<void> {
  console.log(`\nTesting caching for ${collectionPath}...`);
  
  try {
    const firestoreService = await getFirestore();
    
    // Clear cache to start fresh
    clearDatabaseCache();
    
    // First query - should be a cache miss
    console.log('Running first query (cache miss expected)...');
    const startTime1 = performance.now();
    const results1 = await firestoreService.query<Record<string, any>>(collectionPath, {
      limit: TEST_CONFIG.documentsPerCollection,
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
    const duration1 = performance.now() - startTime1;
    
    console.log(`First query returned ${results1.length} documents in ${formatTiming(duration1)}`);
    
    // Sleep briefly
    await sleep(TEST_CONFIG.sleepBetweenTests);
    
    // Second query - should be a cache hit
    console.log('Running second query (cache hit expected)...');
    const startTime2 = performance.now();
    const results2 = await firestoreService.query<Record<string, any>>(collectionPath, {
      limit: TEST_CONFIG.documentsPerCollection,
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
    const duration2 = performance.now() - startTime2;
    
    console.log(`Second query returned ${results2.length} documents in ${formatTiming(duration2)}`);
    
    // Calculate improvement
    const improvement = duration1 > 0 ? ((duration1 - duration2) / duration1) * 100 : 0;
    console.log(`Cache performance improvement: ${improvement.toFixed(2)}%`);
    
    // Third query with cache bypass
    console.log('Running third query with cache bypass...');
    const startTime3 = performance.now();
    const results3 = await firestoreService.query<Record<string, any>>(collectionPath, {
      limit: TEST_CONFIG.documentsPerCollection,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      skipCache: true
    });
    const duration3 = performance.now() - startTime3;
    
    console.log(`Third query (cache bypass) returned ${results3.length} documents in ${formatTiming(duration3)}`);
    
  } catch (error) {
    console.error(`Error testing caching for ${collectionPath}:`, error);
  }
}

/**
 * Test cursor-based pagination
 */
async function testPagination(collectionPath: string): Promise<void> {
  console.log(`\nTesting cursor-based pagination for ${collectionPath}...`);
  
  try {
    const firestoreService = await getFirestore();
    const pageSize = TEST_CONFIG.pageSize;
    
    // Get first page
    console.log(`Fetching first page (size: ${pageSize})...`);
    const page1Start = performance.now();
    const page1Result = await firestoreService.queryWithPagination<{id: string}>(collectionPath, {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      pageSize
    });
    const page1Duration = performance.now() - page1Start;
    
    console.log(`First page: ${page1Result.items.length} items, hasMore: ${page1Result.hasMore}, duration: ${formatTiming(page1Duration)}`);
    
    if (!page1Result.hasMore || !page1Result.lastDoc) {
      console.log('Not enough data for pagination test');
      return;
    }
    
    // Get second page
    console.log('Fetching second page...');
    const page2Start = performance.now();
    const page2Result = await firestoreService.queryWithPagination<{id: string}>(collectionPath, {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      pageSize,
      startAfter: page1Result.lastDoc
    });
    const page2Duration = performance.now() - page2Start;
    
    console.log(`Second page: ${page2Result.items.length} items, hasMore: ${page2Result.hasMore}, duration: ${formatTiming(page2Duration)}`);
    
    // Verify no overlap between pages
    const page1Ids = new Set(page1Result.items.map(item => item.id));
    const page2Ids = new Set(page2Result.items.map(item => item.id));
    
    let overlap = false;
    for (const id of page2Ids) {
      if (page1Ids.has(id)) {
        overlap = true;
        console.error(`Overlap detected: item ${id} appears on both pages`);
      }
    }
    
    if (!overlap) {
      console.log('✅ Pagination working correctly - no overlap between pages');
    }
    
  } catch (error) {
    console.error(`Error testing pagination for ${collectionPath}:`, error);
  }
}

/**
 * Test the effect of field selection (projection)
 */
async function testFieldSelection(collectionPath: string): Promise<void> {
  console.log(`\nTesting field selection for ${collectionPath}...`);
  
  try {
    const firestoreService = await getFirestore();
    
    // Clear cache
    clearDatabaseCache();
    
    // Full document query
    console.log('Fetching full documents...');
    const fullStart = performance.now();
    const fullResults = await firestoreService.query<Record<string, any>>(collectionPath, {
      limit: TEST_CONFIG.documentsPerCollection,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      skipCache: true
    });
    const fullDuration = performance.now() - fullStart;
    
    if (fullResults.length === 0) {
      console.log('No data available for test');
      return;
    }
    
    // Calculate full document size
    const fullSize = JSON.stringify(fullResults).length;
    console.log(`Full query: ${fullResults.length} documents, size: ${(fullSize / 1024).toFixed(2)} KB, duration: ${formatTiming(fullDuration)}`);
    
    // Clear cache again
    clearDatabaseCache();
    
    // Selected fields query - just id and name
    console.log('Fetching selected fields only...');
    const selectStart = performance.now();
    const selectResults = await firestoreService.query<{id: string; name: string; createdAt: any}>(collectionPath, {
      limit: TEST_CONFIG.documentsPerCollection,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      select: ['id', 'name', 'createdAt'],
      skipCache: true
    });
    const selectDuration = performance.now() - selectStart;
    
    // Calculate selected fields size
    const selectSize = JSON.stringify(selectResults).length;
    console.log(`Select query: ${selectResults.length} documents, size: ${(selectSize / 1024).toFixed(2)} KB, duration: ${formatTiming(selectDuration)}`);
    
    // Calculate savings
    const sizeSavings = fullSize > 0 ? ((fullSize - selectSize) / fullSize) * 100 : 0;
    const timeSavings = fullDuration > 0 ? ((fullDuration - selectDuration) / fullDuration) * 100 : 0;
    
    console.log(`Size reduction: ${sizeSavings.toFixed(2)}%, Time savings: ${timeSavings.toFixed(2)}%`);
    
  } catch (error) {
    console.error(`Error testing field selection for ${collectionPath}:`, error);
  }
}

/**
 * Test preloading functionality
 */
async function testPreloading(): Promise<void> {
  console.log('\nTesting data preloading...');
  
  try {
    // Clear cache
    clearDatabaseCache();
    
    // Time how long preloading takes
    const preloadStart = performance.now();
    await preloadCommonData();
    const preloadDuration = performance.now() - preloadStart;
    
    console.log(`Preloaded common data in ${formatTiming(preloadDuration)}`);
    
    // Test query after preloading
    const firestoreService = await getFirestore();
    
    for (const collection of TEST_CONFIG.collectionsToTest) {
      console.log(`Testing query on ${collection} after preloading...`);
      
      const queryStart = performance.now();
      const results = await firestoreService.query(collection, {
        limit: 5,
        orderBy: [{ field: 'createdAt', direction: 'desc' }]
      });
      const queryDuration = performance.now() - queryStart;
      
      console.log(`Query returned ${results.length} documents in ${formatTiming(queryDuration)}`);
    }
    
  } catch (error) {
    console.error('Error testing preloading:', error);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('=== FIRESTORE OPTIMIZATION TESTS ===');
  console.log(`Running with config: ${JSON.stringify(TEST_CONFIG, null, 2)}`);
  
  // Initialize Firestore
  const firestoreService = await getFirestore();
  await firestoreService.init();
  
  // Test preloading
  await testPreloading();
  
  // Run tests for each collection
  for (const collection of TEST_CONFIG.collectionsToTest) {
    // Test caching
    await testCaching(collection);
    
    // Test pagination
    await testPagination(collection);
    
    // Test field selection
    await testFieldSelection(collection);
  }
  
  console.log('\n=== TESTS COMPLETED ===');
}

// Run tests
runAllTests().catch(console.error); 