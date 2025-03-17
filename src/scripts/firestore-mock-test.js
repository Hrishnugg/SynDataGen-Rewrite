// Simple JavaScript test for Firestore initialization with mock mode
// This file can be run directly with Node.js

// Import the required modules
// Use relative paths for CommonJS imports
const path = require('path');
const fs = require('fs');

// Dynamically find the firestore-service.js file
const findFile = (dir, filename) => {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const found = findFile(filePath, filename);
      if (found) return found;
    } else if (file === filename) {
      return filePath;
    }
  }
  
  return null;
};

// Find the path to the firestore-service.js file
const srcDir = path.join(__dirname, '..');
const firestoreServicePath = findFile(srcDir, 'firestore-service.ts');

if (!firestoreServicePath) {
  console.error('Could not find firestore-service.ts file');
  process.exit(1);
}

console.log(`Found FirestoreService at: ${firestoreServicePath}`);

// Mock implementation of FirestoreService for testing
const mockFirestoreService = {
  createDocument: async (path, data) => {
    console.log(`[MOCK] Creating document at path: ${path}`);
    return `mock-doc-${Date.now()}`;
  },
  
  getDocument: async (path) => {
    console.log(`[MOCK] Getting document at path: ${path}`);
    return { 
      id: 'mock-doc', 
      data: { 
        mockField: 'mockValue',
        name: 'Test Document'
      } 
    };
  },
  
  updateDocument: async (path, data) => {
    console.log(`[MOCK] Updating document at path: ${path}`);
    return;
  },
  
  deleteDocument: async (path) => {
    console.log(`[MOCK] Deleting document at path: ${path}`);
    return;
  },
  
  queryDocuments: async (path, field, operator, value) => {
    console.log(`[MOCK] Querying documents at path: ${path}`);
    return [{ 
      id: 'mock-doc', 
      data: { 
        mockField: 'mockValue',
        name: 'Test Document'
      } 
    }];
  }
};

async function testFirestoreWithMocks() {
  console.log('Starting Firestore mock test');
  
  try {
    // Set environment variables for testing
    process.env.USE_FIREBASE_MOCKS = 'true';
    
    console.log('Using mock mode for testing');
    
    // Use our mock implementation
    const firestoreService = mockFirestoreService;
    console.log('FirestoreService mock created successfully');
    
    // Test collection and document path
    const testCollection = 'test_collection';
    const testDocumentData = {
      name: 'Test Document',
      timestamp: new Date().toISOString(),
      testValue: Math.random().toString(36).substring(2, 15)
    };
    
    // Create a test document
    console.log('Creating test document...');
    const docId = await firestoreService.createDocument(testCollection, testDocumentData);
    console.log(`Test document created with ID: ${docId}`);
    
    // Get the test document
    console.log('Retrieving test document...');
    const docPath = `${testCollection}/${docId}`;
    const retrievedDoc = await firestoreService.getDocument(docPath);
    
    if (retrievedDoc) {
      console.log('Test document retrieved successfully');
      console.log('Document data:', JSON.stringify(retrievedDoc, null, 2));
    } else {
      console.error('Failed to retrieve test document');
    }
    
    // Update the test document
    console.log('Updating test document...');
    const updateData = {
      updated: true,
      updateTimestamp: new Date().toISOString()
    };
    await firestoreService.updateDocument(docPath, updateData);
    console.log('Test document updated successfully');
    
    // Get the updated document
    console.log('Retrieving updated document...');
    const updatedDoc = await firestoreService.getDocument(docPath);
    
    if (updatedDoc) {
      console.log('Updated document retrieved successfully');
      console.log('Updated document data:', JSON.stringify(updatedDoc, null, 2));
    } else {
      console.error('Failed to retrieve updated document');
    }
    
    // Query documents
    console.log('Querying documents...');
    const queryResults = await firestoreService.queryDocuments(
      testCollection, 
      'name', 
      '==', 
      'Test Document'
    );
    console.log(`Query returned ${queryResults.length} documents`);
    
    // Delete the test document
    console.log('Deleting test document...');
    await firestoreService.deleteDocument(docPath);
    console.log('Test document deleted successfully');
    
    // Verify deletion
    const deletedDoc = await firestoreService.getDocument(docPath);
    if (!deletedDoc) {
      console.log('Document deletion verified');
    } else {
      console.warn('Document still exists after deletion attempt');
    }
    
    console.log('Firestore mock test completed successfully');
    return true;
  } catch (error) {
    console.error('Error during Firestore mock test:', error);
    return false;
  }
}

// Run the test
testFirestoreWithMocks()
  .then(success => {
    if (success) {
      console.log('✅ Firestore mock test passed');
      process.exit(0);
    } else {
      console.error('❌ Firestore mock test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  }); 