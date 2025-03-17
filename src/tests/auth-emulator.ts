/**
 * Auth Emulator Helpers
 * 
 * This file contains utility functions to set up and interact with
 * the Firebase Auth Emulator for testing purposes.
 * 
 * It provides a mock implementation for when the emulator is not available.
 */

import * as admin from 'firebase-admin/app';
import { getAuth, Auth, UserRecord, ListUsersResult } from 'firebase-admin/auth';

// Auth emulator configuration
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
const TEST_PROJECT_ID = 'syndatagen-test';

// Check if we're using mocks
const useMocks = process.env.USE_FIREBASE_MOCKS === 'true';

// Mock user database for testing
const mockUsers: Record<string, UserRecord> = {};
let mockUserIdCounter = 1;

/**
 * Initialize the Auth emulator
 * @returns A Firebase Auth instance connected to the emulator
 */
export function initializeAuthEmulator(): Auth {
  // Set up emulator environment variable
  process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;
  
  // Use mocks if specified
  if (useMocks) {
    console.log('Using mock Auth implementation');
    return createMockAuth();
  }
  
  // Otherwise try to use the real emulator
  try {
    // Initialize Firebase app if not already done
    let app: admin.App;
    const apps = admin.getApps();
    if (apps.length === 0) {
      try {
        app = admin.initializeApp({
          projectId: TEST_PROJECT_ID,
          credential: admin.applicationDefault()
        });
      } catch (error) {
        console.log('Error initializing with applicationDefault, falling back to basic config', error);
        app = admin.initializeApp({
          projectId: TEST_PROJECT_ID
        });
      }
    } else {
      app = apps[0];
    }
    
    console.log(`Connecting to Auth emulator at ${AUTH_EMULATOR_HOST}`);
    return getAuth(app);
  } catch (error) {
    console.warn('Failed to initialize Auth emulator, using mock implementation:', error);
    return createMockAuth();
  }
}

/**
 * Create a fully-mocked Auth service for testing
 */
function createMockAuth(): Auth {
  return {
    createCustomToken: jest.fn().mockImplementation((uid: string) => {
      if (!uid || typeof uid !== 'string' || uid.trim() === '') {
        return Promise.reject(new Error('`uid` argument must be a non-empty string uid.'));
      }
      
      // Check if user exists
      if (!mockUsers[uid]) {
        // In mock mode, we'll just create a token anyway
        console.log(`Creating token for non-existent user: ${uid}`);
      }
      
      return Promise.resolve(`mock-custom-token-${uid}-${Date.now()}`);
    }),
    
    verifyIdToken: jest.fn().mockImplementation((idToken: string) => {
      if (!idToken || typeof idToken !== 'string' || !idToken.startsWith('mock-id-token-')) {
        return Promise.reject(new Error('Decoding Firebase ID token failed. Make sure you passed the entire string JWT which represents an ID token.'));
      }
      
      // Extract user ID from token
      const parts = idToken.split('-');
      if (parts.length < 4) {
        return Promise.reject(new Error('Invalid token format'));
      }
      
      // Get user ID and timestamp parts
      const uid = parts[3];
      
      return Promise.resolve({
        uid,
        email: mockUsers[uid]?.email || `user-${uid}@example.com`,
        email_verified: true,
        auth_time: Math.floor(Date.now() / 1000),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });
    }),
    
    getUserByEmail: jest.fn().mockImplementation((email: string) => {
      // Find user by email
      const user = Object.values(mockUsers).find(u => u.email === email);
      
      if (!user) {
        return Promise.reject({
          code: 'auth/user-not-found',
          message: `There is no user record corresponding to the provided email: ${email}`
        });
      }
      
      return Promise.resolve(user);
    }),
    
    getUser: jest.fn().mockImplementation((uid: string) => {
      const user = mockUsers[uid];
      
      if (!user) {
        return Promise.reject({
          code: 'auth/user-not-found',
          message: `There is no user record corresponding to the provided identifier: ${uid}`
        });
      }
      
      return Promise.resolve(user);
    }),
    
    createUser: jest.fn().mockImplementation((properties) => {
      const uid = `mock-user-${mockUserIdCounter++}`;
      
      const user: UserRecord = {
        uid,
        email: properties.email || `user-${uid}@example.com`,
        emailVerified: properties.emailVerified || false,
        displayName: properties.displayName || null,
        photoURL: properties.photoURL || null,
        phoneNumber: properties.phoneNumber || null,
        disabled: properties.disabled || false,
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
          toJSON: () => ({
            creationTime: new Date().toISOString(),
            lastSignInTime: new Date().toISOString()
          })
        },
        providerData: [],
        toJSON: () => ({ uid, ...properties })
      } as UserRecord;
      
      mockUsers[uid] = user;
      return Promise.resolve(user);
    }),
    
    deleteUser: jest.fn().mockImplementation((uid: string) => {
      if (!mockUsers[uid]) {
        return Promise.reject({
          code: 'auth/user-not-found',
          message: `There is no user record corresponding to the provided identifier: ${uid}`
        });
      }
      
      delete mockUsers[uid];
      return Promise.resolve();
    }),
    
    listUsers: jest.fn().mockImplementation((maxResults?: number): Promise<ListUsersResult> => {
      const userList = Object.values(mockUsers);
      const limitedUsers = maxResults ? userList.slice(0, maxResults) : userList;
      
      return Promise.resolve({
        users: limitedUsers,
        pageToken: undefined,
        // Add required properties to match ListUsersResult
        toJSON: () => ({ users: limitedUsers, pageToken: undefined }),
      } as ListUsersResult);
    }),
    
    // Add other auth methods as needed for tests
    app: null as any,
    projectId: TEST_PROJECT_ID,
    tenantManager: null as any,
    sessionCookieVerifier: null as any,
    signInWithProviderCredential: null as any
  } as unknown as Auth;
}

/**
 * Create a test user in the Auth emulator
 * @param email User email
 * @param password User password
 * @param displayName Optional display name
 * @returns The ID of the created user
 */
export const createTestUser = async (
  email: string,
  password: string,
  displayName?: string
): Promise<string> => {
  const auth = initializeAuthEmulator();
  
  try {
    // Check if user already exists and delete it
    try {
      const existingUser = await auth.getUserByEmail(email);
      await auth.deleteUser(existingUser.uid);
    } catch (error) {
      // Ignore - user doesn't exist
    }
    
    // Create new user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || 'Test User',
      emailVerified: true
    });
    
    return userRecord.uid;
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
};

/**
 * Generate a test ID token for a user
 * @param uid User ID
 * @returns A mock ID token
 */
export const generateTestIdToken = async (uid: string): Promise<string> => {
  // In mock mode, we just generate a token with a predictable format
  return `mock-id-token-user-${uid}-${Date.now()}`;
};

/**
 * Delete a test user
 * @param uid User ID to delete
 */
export const deleteTestUser = async (uid: string): Promise<void> => {
  const auth = initializeAuthEmulator();
  
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    // Ignore errors if user doesn't exist
    console.log(`Warning: Could not delete user ${uid}:`, error);
  }
};

/**
 * Clear all users from the Auth emulator
 */
export const clearAuthEmulator = async (): Promise<void> => {
  // In mock mode, just clear the mock user database
  if (useMocks) {
    for (const uid in mockUsers) {
      delete mockUsers[uid];
    }
    mockUserIdCounter = 1;
    return;
  }
  
  // With the real emulator, try to delete all users
  try {
    const auth = initializeAuthEmulator();
    const listUsersResult = await auth.listUsers();
    
    // Delete each user
    for (const userRecord of listUsersResult.users) {
      try {
        await auth.deleteUser(userRecord.uid);
      } catch (error) {
        console.warn(`Failed to delete user ${userRecord.uid}:`, error);
      }
    }
  } catch (error) {
    console.warn('Error clearing Auth emulator:', error);
  }
}; 