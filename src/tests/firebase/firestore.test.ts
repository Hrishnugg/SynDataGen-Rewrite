/**
 * Firestore Emulator Tests
 * 
 * This file tests the Firestore emulator functionality to ensure that
 * both real emulators and mock implementations work correctly.
 */

import * as admin from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FirestoreService } from '../../lib/api/services/firestore-service';
import { 
  initializeFirestoreEmulator, 
  clearFirestoreEmulator, 
  seedFirestoreEmulator,
  resetMockFirestoreData
} from '../firestore-emulator';

// Set environment to use mocks for tests
process.env.USE_FIREBASE_MOCKS = 'true';

// Test data to be used across tests
const TEST_COLLECTION = 'test-collection';
const TEST_DOC_ID = 'test-doc';
const TEST_DATA = { testField: 'test-value' };
const TEST_BATCH_DATA = {
  [TEST_COLLECTION]: [
    { id: TEST_DOC_ID, ...TEST_DATA },
    { id: 'doc1', name: 'Test Document 1', value: 100 },
    { id: 'doc2', name: 'Test Document 2', value: 200 }
  ]
};

let firestore: any;

// Setup and teardown for each test
beforeEach(async () => {
  // Initialize Firestore for each test
  firestore = initializeFirestoreEmulator();
  
  // Clear the emulator before each test to ensure clean state
  await clearFirestoreEmulator(firestore);
  
  // Seed with test data
  await seedFirestoreEmulator(firestore, TEST_BATCH_DATA);
});

afterAll(async () => {
  // Clear all data after tests are complete
  if (firestore) {
    await clearFirestoreEmulator(firestore);
  }
});

describe('Firestore Emulator Tests', () => {
  test('Firestore emulator or mock is initialized correctly', () => {
    expect(firestore).toBeDefined();
  });
  
  test('Can write and read data from Firestore emulator', async () => {
    // Write data
    const docRef = firestore.collection('test-write').doc('doc1');
    await docRef.set({ field1: 'value1', field2: 123 });
    
    // Read data
    const snapshot = await docRef.get();
    expect(snapshot.exists).toBe(true);
    
    const data = snapshot.data();
    // Account for ID being included in the data with mock implementation
    expect(data).toMatchObject({ field1: 'value1', field2: 123 });
  });
  
  test('Can retrieve all documents from a collection', async () => {
    // Get all documents from the test collection
    const snapshot = await firestore.collection(TEST_COLLECTION).get();
    
    // Verify collection has the right number of documents
    expect(snapshot.empty).toBe(false);
    expect(snapshot.size).toBe(3); // We seeded 3 documents
    
    // Verify all documents have expected fields
    const docs = snapshot.docs.map(doc => doc.data());
    expect(docs).toContainEqual(expect.objectContaining({ testField: 'test-value' }));
    expect(docs).toContainEqual(expect.objectContaining({ name: 'Test Document 1', value: 100 }));
    expect(docs).toContainEqual(expect.objectContaining({ name: 'Test Document 2', value: 200 }));
  });
  
  test('Can query documents with where clause', async () => {
    // Query for documents with value > 150
    const query = firestore.collection(TEST_COLLECTION).where('value', '>', 150);
    const snapshot = await query.get();
    
    // Verify query returns the expected document
    expect(snapshot.empty).toBe(false);
    expect(snapshot.size).toBe(1);
    
    // Get the document that matches our query
    const doc = snapshot.docs[0];
    
    // Verify the specific document has the right data
    expect(doc).toBeDefined();
    expect(doc.data()).toMatchObject({ 
      name: 'Test Document 2', 
      value: 200 
    });
  });
  
  test('Can update document fields', async () => {
    // Get reference to document we want to update
    const docRef = firestore.collection(TEST_COLLECTION).doc('doc1');
    
    // Update the document
    await docRef.update({ value: 150, updated: true });
    
    // Verify the update was applied
    const snapshot = await docRef.get();
    const data = snapshot.data();
    
    // Verify update was applied correctly
    expect(data).toMatchObject({ 
      name: 'Test Document 1', 
      value: 150,
      updated: true 
    });
  });
  
  test('Can delete documents', async () => {
    // Delete a document
    const docRef = firestore.collection(TEST_COLLECTION).doc('doc1');
    await docRef.delete();
    
    // Verify document was deleted
    const snapshot = await docRef.get();
    expect(snapshot.exists).toBe(false);
    
    // Check the collection size reduced by 1
    const collSnapshot = await firestore.collection(TEST_COLLECTION).get();
    expect(collSnapshot.size).toBe(2); // 3 - 1 = 2
  });
});

describe('FirestoreService tests', () => {
  let firestoreService: FirestoreService;
  
  beforeEach(async () => {
    firestoreService = new FirestoreService(firestore);
  });
  
  test('getDocument should retrieve a document', async () => {
    // Get a document using the service
    const doc = await firestoreService.getDocument(`${TEST_COLLECTION}/doc1`);
    
    // Verify document content
    expect(doc).toBeDefined();
    expect(doc).toMatchObject({
      id: 'doc1',
      name: 'Test Document 1',
      value: 100
    });
  });
  
  test('getDocument should return null for non-existent document', async () => {
    // Try to get a document that doesn't exist
    const doc = await firestoreService.getDocument(`${TEST_COLLECTION}/non-existent`);
    
    // Verify null is returned
    expect(doc).toBeNull();
  });
  
  test('createDocument should create a new document', async () => {
    // Create a new document
    const newDoc = {
      name: 'New Test Document',
      value: 300
    };
    
    const docId = await firestoreService.createDocument(TEST_COLLECTION, newDoc);
    
    // Verify document was created
    expect(docId).toBeDefined();
    
    // Retrieve the document to verify its content
    const doc = await firestoreService.getDocument(`${TEST_COLLECTION}/${docId}`);
    expect(doc).toMatchObject({
      id: docId,
      ...newDoc
    });
  });
  
  test('updateDocument should update an existing document', async () => {
    // Update an existing document
    const updateData = {
      value: 999,
      updated: true
    };
    
    await firestoreService.updateDocument(`${TEST_COLLECTION}/doc1`, updateData);
    
    // Retrieve the document to verify it was updated
    const updatedDoc = await firestoreService.getDocument(`${TEST_COLLECTION}/doc1`);
    
    // Verify document was updated
    expect(updatedDoc).toMatchObject({
      id: 'doc1',
      name: 'Test Document 1',
      value: 999,
      updated: true
    });
  });
  
  test('deleteDocument should remove a document', async () => {
    // Delete a document
    await firestoreService.deleteDocument(`${TEST_COLLECTION}/doc1`);
    
    // Verify document was deleted
    const doc = await firestoreService.getDocument(`${TEST_COLLECTION}/doc1`);
    expect(doc).toBeNull();
  });
  
  test('queryDocuments should retrieve filtered documents', async () => {
    // Query for documents with value > 150
    const results = await firestoreService.queryDocuments(TEST_COLLECTION, [
      { field: 'value', op: '>', value: 150 }
    ]);
    
    // Verify results
    expect(results.length).toBeGreaterThan(0);
    expect(results.find(doc => doc.id === 'doc2')).toMatchObject({
      id: 'doc2',
      name: 'Test Document 2',
      value: 200
    });
  });
}); 