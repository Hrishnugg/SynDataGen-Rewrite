/**
 * Tests to verify the test environment setup
 * These tests ensure that the Firebase emulators or mocks are correctly initialized and running
 */

import { initializeAuthEmulator } from './auth-emulator';
import { initializeFirestoreEmulator } from './firestore-emulator';

// Set environment to use mocks for tests
process.env.USE_FIREBASE_MOCKS = 'true';

describe('Test Environment Setup', () => {
  test('Firebase Auth Emulator or mock is running', async () => {
    try {
      const auth = initializeAuthEmulator();
      expect(auth).toBeDefined();
      
      // Verify we can list users (this would fail if emulator is not running)
      const listUsersResult = await auth.listUsers(10);
      expect(listUsersResult).toBeDefined();
      expect(listUsersResult.users).toBeDefined();
      
      console.log('Auth emulator or mock is running correctly');
    } catch (error) {
      console.error('Auth emulator or mock test failed:', error);
      throw error;
    }
  });

  test('Firestore Emulator or mock is running', async () => {
    try {
      const firestore = initializeFirestoreEmulator();
      expect(firestore).toBeDefined();
      
      // Verify we can perform basic operations
      const testDoc = firestore.collection('test-collection').doc('test-doc');
      await testDoc.set({ testField: 'test-value' });
      const snapshot = await testDoc.get();
      expect(snapshot.exists).toBe(true);
      expect(snapshot.data()?.testField).toBe('test-value');
      
      // Clean up
      await testDoc.delete();
      
      console.log('Firestore emulator or mock is running correctly');
    } catch (error) {
      console.error('Firestore emulator or mock test failed:', error);
      throw error;
    }
  });
}); 