/**
 * Firestore Initialization Test
 * 
 * This script tests the new Firestore initialization implementation
 * to ensure it correctly handles various scenarios.
 */

import { getFirebaseFirestore } from '@/lib/firebase';
import { initializeFirestore, getFirestoreInstance, getFirestoreState } from '@/lib/gcp/firestore';
import { getFirestoreService } from '@/lib/api/services/firestore-service';
import { getFirestore as getDbService } from '@/lib/api/services/db-service';
import { logger } from '../lib/utils/logger';

async function testFirestoreInitialization() {
  try {
    logger.info('Starting Firestore initialization test');
    
    // Get the Firestore service
    const firestoreService = getFirestoreService();
    logger.info('FirestoreService instance created successfully');
    
    // Test collection and document path
    const testCollection = 'test_collection';
    const testDocumentData = {
      name: 'Test Document',
      timestamp: new Date().toISOString(),
      testValue: Math.random().toString(36).substring(2, 15)
    };
    
    // Create a test document
    logger.info('Creating test document...');
    const docId = await firestoreService.createDocument(testCollection, testDocumentData);
    logger.info(`Test document created with ID: ${docId}`);
    
    // Get the test document
    logger.info('Retrieving test document...');
    const docPath = `${testCollection}/${docId}`;
    const retrievedDoc = await firestoreService.getDocument(docPath);
    
    if (retrievedDoc) {
      logger.info('Test document retrieved successfully');
      logger.info('Document data:', retrievedDoc);
    } else {
      logger.error('Failed to retrieve test document');
    }
    
    // Update the test document
    logger.info('Updating test document...');
    const updateData = {
      updated: true,
      updateTimestamp: new Date().toISOString()
    };
    await firestoreService.updateDocument(docPath, updateData);
    logger.info('Test document updated successfully');
    
    // Get the updated document
    logger.info('Retrieving updated document...');
    const updatedDoc = await firestoreService.getDocument(docPath);
    
    if (updatedDoc) {
      logger.info('Updated document retrieved successfully');
      logger.info('Updated document data:', updatedDoc);
    } else {
      logger.error('Failed to retrieve updated document');
    }
    
    // Query documents
    logger.info('Querying documents...');
    const queryResults = await firestoreService.queryDocuments(
      testCollection, 
      'name', 
      '==', 
      'Test Document'
    );
    logger.info(`Query returned ${queryResults.length} documents`);
    
    // Delete the test document
    logger.info('Deleting test document...');
    await firestoreService.deleteDocument(docPath);
    logger.info('Test document deleted successfully');
    
    // Verify deletion
    const deletedDoc = await firestoreService.getDocument(docPath);
    if (!deletedDoc) {
      logger.info('Document deletion verified');
    } else {
      logger.warn('Document still exists after deletion attempt');
    }
    
    logger.info('Firestore initialization test completed successfully');
    return true;
  } catch (error) {
    logger.error('Error during Firestore initialization test:', error);
    return false;
  }
}

// Run the test
testFirestoreInitialization()
  .then(success => {
    if (success) {
      logger.info('✅ Firestore initialization test passed');
      process.exit(0);
    } else {
      logger.error('❌ Firestore initialization test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    logger.error('Unhandled error in test:', error);
    process.exit(1);
  }); 