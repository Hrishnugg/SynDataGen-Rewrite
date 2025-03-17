/**
 * Test file for Firestore initialization
 * 
 * These tests verify that our new Firestore initialization implementation
 * works correctly in various scenarios.
 */

import { getFirestoreService, FirestoreService } from '../../lib/api/services/firestore-service';
import { jest } from '@jest/globals';

// Mock the Firestore instance
jest.mock('../../lib/gcp/firestore', () => ({
  getFirestoreInstance: jest.fn().mockImplementation(() => {
    throw new Error('Mocked error');
  })
}));

// Mock the Firebase Firestore
jest.mock('../../lib/firebase/firebase', () => ({
  getFirebaseFirestore: jest.fn().mockImplementation(() => {
    throw new Error('Mocked error');
  })
}));

describe('Firestore Initialization', () => {
  let firestoreService: FirestoreService;
  
  beforeEach(() => {
    // Set environment variables for testing
    process.env.USE_FIREBASE_MOCKS = 'true';
    process.env.NODE_ENV = 'test';
    
    // Get a fresh instance for each test with mock mode enabled
    firestoreService = getFirestoreService(true);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('FirestoreService initializes successfully in mock mode', () => {
    expect(firestoreService).toBeDefined();
  });
  
  test('FirestoreService can perform basic CRUD operations', async () => {
    // Test collection and document path
    const testCollection = 'test_collection';
    const testDocumentData = {
      name: 'Test Document',
      timestamp: new Date().toISOString(),
      testValue: 'test-value'
    };
    
    // Create a test document
    const docId = await firestoreService.createDocument(testCollection, testDocumentData);
    expect(docId).toBeDefined();
    expect(typeof docId).toBe('string');
    
    // Get the test document
    const docPath = `${testCollection}/${docId}`;
    const retrievedDoc = await firestoreService.getDocument(docPath);
    expect(retrievedDoc).toBeDefined();
    
    // Update the test document
    const updateData = {
      updated: true,
      updateTimestamp: new Date().toISOString()
    };
    await expect(firestoreService.updateDocument(docPath, updateData)).resolves.not.toThrow();
    
    // Query documents
    const queryResults = await firestoreService.queryDocuments(
      testCollection, 
      'name', 
      '==', 
      'Test Document'
    );
    expect(queryResults).toBeDefined();
    expect(Array.isArray(queryResults)).toBe(true);
    
    // Delete the test document
    await expect(firestoreService.deleteDocument(docPath)).resolves.not.toThrow();
  });
}); 