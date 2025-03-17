/**
 * Firebase Authentication Tests
 * 
 * This file tests Firebase Auth functionality using either the emulator
 * or mock implementations.
 */

import * as admin from 'firebase-admin/app';
import { Auth } from 'firebase-admin/auth';
import { 
  initializeAuthEmulator, 
  createTestUser,
  deleteTestUser,
  generateTestIdToken,
  clearAuthEmulator
} from '../auth-emulator';
import { 
  initializeFirebase, 
  getFirebaseAuth,
  verifyFirebaseToken,
  createFirebaseToken,
  getUserByEmail
} from '../../lib/firebase/firebase';

// Set environment to use mocks for tests
process.env.USE_FIREBASE_MOCKS = 'true';

// Test user data
const TEST_USER = {
  email: 'test-user@example.com',
  password: 'Test123!',
  displayName: 'Test User'
};

// Setup and teardown
beforeEach(async () => {
  await clearAuthEmulator();
});

afterAll(async () => {
  await clearAuthEmulator();
});

describe('Firebase Authentication', () => {
  describe('initializeFirebase', () => {
    it('should initialize Firebase correctly with emulator', async () => {
      // Initialize Firebase with emulator settings
      await initializeFirebase();
      
      // Create a test user
      const userId = await createTestUser(
        TEST_USER.email,
        TEST_USER.password,
        TEST_USER.displayName
      );
      
      // Get user by email to verify creation worked
      const userRecord = await getUserByEmail(TEST_USER.email);
      
      // Verify user was created with correct data
      expect(userRecord).toBeDefined();
      expect(userRecord.email).toBe(TEST_USER.email);
      expect(userRecord.displayName).toBe(TEST_USER.displayName);
      
      // Clean up
      await deleteTestUser(userId);
    });
    
    it('should not initialize Firebase twice', async () => {
      // Initialize twice
      await initializeFirebase();
      await initializeFirebase();
      
      // Create a test user to verify everything works
      const userId = await createTestUser(
        'test-user-2@example.com',
        TEST_USER.password,
        'Test User 2'
      );
      
      // Verify we can still interact with Firebase
      const userRecord = await getUserByEmail('test-user-2@example.com');
      expect(userRecord).toBeDefined();
      expect(userRecord.email).toBe('test-user-2@example.com');
      
      // Clean up
      await deleteTestUser(userId);
    });
  });
  
  describe('getFirebaseAuth', () => {
    it('should return a Firebase Auth instance', async () => {
      // Initialize Firebase first
      await initializeFirebase();
      
      // Get Auth instance
      const auth = getFirebaseAuth();
      
      // Verify we got an Auth instance
      expect(auth).toBeDefined();
      
      // Verify we can use the Auth instance to create users
      const userId = await createTestUser(
        'auth-test@example.com',
        TEST_USER.password,
        'Auth Test User'
      );
      
      // Clean up
      await deleteTestUser(userId);
    });
  });
  
  describe('verifyFirebaseToken', () => {
    it('should verify a Firebase token', async () => {
      // Initialize Firebase
      await initializeFirebase();
      
      // Create test user
      const userId = await createTestUser(
        'token-test@example.com',
        TEST_USER.password,
        'Token Test User'
      );
      
      // Generate a token for the user
      const idToken = await generateTestIdToken(userId);
      
      // Verify the token
      const decodedToken = await verifyFirebaseToken(idToken);
      
      // Check the decoded token
      expect(decodedToken).toBeDefined();
      expect(decodedToken.uid).toBe(userId);
      
      // Clean up
      await deleteTestUser(userId);
    });
    
    it('should throw an error for invalid token', async () => {
      // Initialize Firebase
      await initializeFirebase();
      
      // Try to verify an invalid token
      await expect(verifyFirebaseToken('invalid-token')).rejects.toThrow();
    });
  });
  
  describe('createFirebaseToken', () => {
    it('should create a custom Firebase token', async () => {
      // Initialize Firebase
      await initializeFirebase();
      
      // Create test user
      const userId = await createTestUser(
        'custom-token-test@example.com',
        TEST_USER.password,
        'Custom Token Test User'
      );
      
      // Create a custom token
      const customToken = await createFirebaseToken(userId);
      
      // Verify we got a token
      expect(customToken).toBeDefined();
      expect(typeof customToken).toBe('string');
      expect(customToken.length).toBeGreaterThan(0);
      
      // Clean up
      await deleteTestUser(userId);
    });
  });
  
  describe('getUserByEmail', () => {
    it('should retrieve a user by email', async () => {
      // Initialize Firebase
      await initializeFirebase();
      
      // Create test user
      const userId = await createTestUser(
        'get-user-test@example.com',
        TEST_USER.password,
        'Get User Test'
      );
      
      // Get user by email
      const userRecord = await getUserByEmail('get-user-test@example.com');
      
      // Verify user data
      expect(userRecord).toBeDefined();
      expect(userRecord.uid).toBe(userId);
      expect(userRecord.email).toBe('get-user-test@example.com');
      expect(userRecord.displayName).toBe('Get User Test');
      
      // Clean up
      await deleteTestUser(userId);
    });
    
    it('should throw an error for non-existent user', async () => {
      // Initialize Firebase
      await initializeFirebase();
      
      // Try to get a non-existent user
      await expect(getUserByEmail('non-existent@example.com')).rejects.toThrow();
    });
  });
}); 