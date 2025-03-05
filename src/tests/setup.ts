/**
 * Jest Test Setup File
 * 
 * This file is executed before tests start running and sets up the global testing environment.
 */

// Make this file a module 
export {};

// Extend Jest's global types
declare global {
  // Make Jest's Mock interface more flexible
  namespace jest {
    // Extend existing Mock interface
    interface MockInstance<T, Y extends any[]> {
      // Add missing methods that accept any value
      mockResolvedValue(value: any): MockInstance<Promise<T>, Y>;
      mockResolvedValueOnce(value: any): MockInstance<Promise<T>, Y>;
      mockRejectedValue(value: any): MockInstance<Promise<T>, Y>;
      mockRejectedValueOnce(value: any): MockInstance<Promise<T>, Y>;
    }
  }
}

// Create a shared mock for FieldValue
const mockFieldValue = {
  serverTimestamp: jest.fn().mockReturnValue('server-timestamp'),
  increment: jest.fn((num) => `increment-${num}`),
  arrayUnion: jest.fn((...args) => `array-union-${args.join('-')}`),
  arrayRemove: jest.fn((...args) => `array-remove-${args.join('-')}`),
  delete: jest.fn().mockReturnValue('field-delete')
};

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  return {
    initializeApp: jest.fn().mockReturnValue({}),
    getApps: jest.fn().mockReturnValue([]),
    app: jest.fn().mockReturnValue({
      firestore: jest.fn().mockReturnValue({
        collection: jest.fn(),
        FieldValue: mockFieldValue
      })
    }),
    firestore: jest.fn().mockReturnValue({
      FieldValue: mockFieldValue
    })
  };
});

// Create a mock Firestore instance
const mockFirestoreInstance = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn().mockReturnValue(Promise.resolve({
        exists: true,
        data: jest.fn().mockReturnValue({}),
        id: 'mock-doc-id'
      })),
      set: jest.fn().mockReturnValue(Promise.resolve()),
      update: jest.fn().mockReturnValue(Promise.resolve()),
      delete: jest.fn().mockReturnValue(Promise.resolve())
    })),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnValue(Promise.resolve({
      empty: false,
      docs: [
        {
          id: 'mock-doc-id',
          exists: true,
          data: jest.fn().mockReturnValue({}),
          ref: {
            id: 'mock-doc-id'
          }
        }
      ]
    }))
  })),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockReturnValue(Promise.resolve())
  })),
  runTransaction: jest.fn((callback) => Promise.resolve(callback({
    get: jest.fn().mockReturnValue(Promise.resolve({
      exists: true,
      data: jest.fn().mockReturnValue({}),
      id: 'mock-doc-id'
    })),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }))),
  FieldValue: mockFieldValue
};

// Mock Firebase for direct imports
jest.mock('@/lib/firebase', () => {
  return {
    getFirebaseFirestore: jest.fn().mockReturnValue(mockFirestoreInstance)
  };
});

// Make getFirebaseFirestore available globally for tests
// @ts-ignore - allow setting of global function
global.getFirebaseFirestore = jest.fn().mockReturnValue(mockFirestoreInstance);

// Mock node-fetch
jest.mock('node-fetch', () => {
  const mockFetch = jest.fn();
  // @ts-ignore - Allow this to be used as a mock and a function
  mockFetch.isRedirect = jest.fn();
  // @ts-ignore - Add other required properties
  mockFetch.AbortError = class AbortError extends Error {};
  // @ts-ignore
  mockFetch.Blob = class Blob {};
  // @ts-ignore
  mockFetch.Body = class Body {};
  // @ts-ignore
  mockFetch.Headers = class Headers {};
  // @ts-ignore
  mockFetch.Request = class Request {};
  // @ts-ignore
  mockFetch.Response = class Response {};
  // @ts-ignore
  mockFetch.FetchError = class FetchError extends Error {};
  
  return mockFetch;
});

// Suppress console output during tests to reduce noise
console.log = jest.fn();
console.info = jest.fn();
console.warn = jest.fn();
console.error = jest.fn(); 