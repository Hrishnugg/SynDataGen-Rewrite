/**
 * Firebase Admin Auth Mock
 * 
 * This file contains mock implementations of Firebase Admin Auth
 * functionality for testing purposes.
 */

import { Auth, UserRecord } from 'firebase-admin/auth';

// Mock user records
const mockUsers: Record<string, UserRecord> = {
  'test-user-id': {
    uid: 'test-user-id',
    email: 'test@example.com',
    emailVerified: true,
    displayName: 'Test User',
    photoURL: null,
    phoneNumber: null,
    disabled: false,
    metadata: {
      lastSignInTime: new Date().toISOString(),
      creationTime: new Date().toISOString()
    },
    customClaims: {},
    providerData: [],
    toJSON: () => ({
      uid: 'test-user-id',
      email: 'test@example.com',
      emailVerified: true,
      displayName: 'Test User'
    })
  } as unknown as UserRecord
};

/**
 * Creates a mock Firebase Admin Auth instance for testing
 * @returns A mock implementation of the Firebase Admin Auth interface
 */
export const createMockFirebaseAdminAuth = () => {
  return {
    // User management
    createUser: jest.fn().mockImplementation((properties) => {
      const uid = properties.uid || `user-${Date.now()}`;
      const newUser = {
        uid,
        email: properties.email || null,
        emailVerified: properties.emailVerified || false,
        displayName: properties.displayName || null,
        photoURL: properties.photoURL || null,
        phoneNumber: properties.phoneNumber || null,
        disabled: properties.disabled || false,
        metadata: {
          lastSignInTime: null,
          creationTime: new Date().toISOString()
        },
        customClaims: {},
        providerData: [],
        toJSON: () => ({ ...properties, uid })
      } as unknown as UserRecord;
      
      mockUsers[uid] = newUser;
      return Promise.resolve(newUser);
    }),
    
    updateUser: jest.fn().mockImplementation((uid, properties) => {
      if (!mockUsers[uid]) {
        return Promise.reject(new Error(`No user found with UID: ${uid}`));
      }
      
      const updatedUser = {
        ...mockUsers[uid],
        ...properties,
        metadata: {
          ...mockUsers[uid].metadata
        },
        toJSON: () => ({ ...mockUsers[uid], ...properties })
      } as unknown as UserRecord;
      
      mockUsers[uid] = updatedUser;
      return Promise.resolve(updatedUser);
    }),
    
    getUser: jest.fn().mockImplementation((uid) => {
      if (!mockUsers[uid]) {
        return Promise.reject(new Error(`No user found with UID: ${uid}`));
      }
      return Promise.resolve(mockUsers[uid]);
    }),
    
    getUserByEmail: jest.fn().mockImplementation((email) => {
      const user = Object.values(mockUsers).find(u => u.email === email);
      if (!user) {
        return Promise.reject(new Error(`No user found with email: ${email}`));
      }
      return Promise.resolve(user);
    }),
    
    getUserByPhoneNumber: jest.fn().mockImplementation((phoneNumber) => {
      const user = Object.values(mockUsers).find(u => u.phoneNumber === phoneNumber);
      if (!user) {
        return Promise.reject(new Error(`No user found with phone number: ${phoneNumber}`));
      }
      return Promise.resolve(user);
    }),
    
    listUsers: jest.fn().mockImplementation(() => {
      return Promise.resolve({
        users: Object.values(mockUsers),
        pageToken: undefined
      });
    }),
    
    deleteUser: jest.fn().mockImplementation((uid) => {
      if (!mockUsers[uid]) {
        return Promise.reject(new Error(`No user found with UID: ${uid}`));
      }
      
      delete mockUsers[uid];
      return Promise.resolve();
    }),
    
    // Custom token management
    createCustomToken: jest.fn().mockImplementation((uid, claims) => {
      return Promise.resolve(`custom-token-${uid}-${Date.now()}`);
    }),
    
    // ID token verification
    verifyIdToken: jest.fn().mockImplementation((idToken, checkRevoked) => {
      if (idToken.startsWith('valid-token')) {
        return Promise.resolve({
          uid: 'test-user-id',
          email: 'test@example.com',
          auth_time: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        });
      }
      return Promise.reject(new Error('Invalid token'));
    }),
    
    // User session management
    revokeRefreshTokens: jest.fn().mockImplementation((uid) => {
      if (!mockUsers[uid]) {
        return Promise.reject(new Error(`No user found with UID: ${uid}`));
      }
      return Promise.resolve();
    }),
    
    // User claims management
    setCustomUserClaims: jest.fn().mockImplementation((uid, claims) => {
      if (!mockUsers[uid]) {
        return Promise.reject(new Error(`No user found with UID: ${uid}`));
      }
      
      // Use a different approach to update claims since customClaims is read-only
      mockUsers[uid] = {
        ...mockUsers[uid],
        customClaims: claims || {},
        toJSON: function() {
          return {
            uid: this.uid,
            email: this.email,
            emailVerified: this.emailVerified,
            displayName: this.displayName,
            photoURL: this.photoURL,
            phoneNumber: this.phoneNumber,
            disabled: this.disabled,
            metadata: this.metadata,
            providerData: this.providerData,
            customClaims: this.customClaims
          };
        }
      };
      return Promise.resolve();
    }),
    
    // Authentication configuration
    generatePasswordResetLink: jest.fn().mockImplementation((email, actionCodeSettings) => {
      return Promise.resolve(`https://example.com/reset-password?email=${encodeURIComponent(email)}`);
    }),
    
    generateEmailVerificationLink: jest.fn().mockImplementation((email, actionCodeSettings) => {
      return Promise.resolve(`https://example.com/verify-email?email=${encodeURIComponent(email)}`);
    }),
    
    generateSignInWithEmailLink: jest.fn().mockImplementation((email, actionCodeSettings) => {
      return Promise.resolve(`https://example.com/sign-in?email=${encodeURIComponent(email)}`);
    }),
    
    // Tenant management (for multi-tenancy)
    tenantManager: jest.fn().mockReturnValue({
      createTenant: jest.fn(),
      getTenant: jest.fn(),
      updateTenant: jest.fn(),
      deleteTenant: jest.fn(),
      listTenants: jest.fn()
    })
  } as unknown as Auth;
};

/**
 * Mock implementation of verifyFirebaseToken
 * @param token The token to verify
 * @returns User data if token is valid
 */
export const mockVerifyFirebaseToken = (token: string) => {
  if (token === 'valid-token') {
    return Promise.resolve({
      uid: 'test-user-id',
      email: 'test@example.com'
    });
  }
  return Promise.reject(new Error('Invalid token'));
}; 