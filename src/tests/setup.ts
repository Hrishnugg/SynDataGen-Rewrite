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
      mockResolvedValue<T>(value: T): MockInstance<Promise<T>, Y>;
      mockResolvedValueOnce<T>(value: T): MockInstance<Promise<T>, Y>;
      mockRejectedValue(value: Error | unknown): MockInstance<Promise<T>, Y>;
      mockRejectedValueOnce(value: Error | unknown): MockInstance<Promise<T>, Y>;
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

/**
 * Jest Setup - Firebase Emulators
 * 
 * This file is used to set up the Firebase emulators
 * before running tests. It is specified in the jest.config.js file.
 */

import * as childProcess from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

// Use promisify to create promise-based versions of callback-based functions
const exec = promisify(childProcess.exec);
const access = promisify(fs.access);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Emulator configuration
const EMULATOR_PROJECT_ID = 'syndatagen-test';
const FIRESTORE_PORT = process.env.FIRESTORE_EMULATOR_PORT || 8080;
const AUTH_PORT = process.env.FIREBASE_AUTH_EMULATOR_PORT || 9099;
const UI_PORT = 4000;

// Paths for emulator files
const EMULATOR_CONFIG_PATH = path.resolve(process.cwd(), 'firebase.json');
const EMULATOR_DATA_DIR = path.resolve(process.cwd(), '.emulator-data');

/**
 * Create Firebase emulator configuration file if it doesn't exist
 */
async function createEmulatorConfig() {
  try {
    // Check if config file exists
    await access(EMULATOR_CONFIG_PATH, fs.constants.F_OK);
    console.log('Emulator config already exists, using existing configuration');
  } catch (error) {
    // Create config file with emulator settings
    const config = {
      firestore: {
        rules: "firestore.rules",
        indexes: "firestore.indexes.json"
      },
      emulators: {
        firestore: {
          port: FIRESTORE_PORT
        },
        auth: {
          port: AUTH_PORT
        },
        ui: {
          enabled: true,
          port: UI_PORT
        },
        singleProjectMode: true
      }
    };
    
    await writeFile(EMULATOR_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log('Created Firebase emulator configuration');
  }
}

/**
 * Create emulator data directory for storing state
 */
async function createEmulatorDataDir() {
  try {
    // Check if directory exists
    await access(EMULATOR_DATA_DIR, fs.constants.F_OK);
  } catch (error) {
    // Create directory
    await mkdir(EMULATOR_DATA_DIR, { recursive: true });
    console.log('Created Firebase emulator data directory');
  }
}

/**
 * Check if Firebase Tools are installed
 */
async function checkFirebaseTools() {
  try {
    await exec('npx firebase --version');
    return true;
  } catch (error) {
    console.log('Firebase tools not found, installing...');
    try {
      await exec('npm install -g firebase-tools');
      return true;
    } catch (installError) {
      console.error('Failed to install Firebase tools:', installError);
      return false;
    }
  }
}

/**
 * Check if emulators are already running
 */
async function areEmulatorsRunning() {
  try {
    // Try to connect to the Firestore emulator
    const response = await fetch(`http://localhost:${FIRESTORE_PORT}/`, { 
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Start Firebase emulators
 */
async function startEmulators() {
  try {
    const isRunning = await areEmulatorsRunning();
    
    if (isRunning) {
      console.log('Firebase emulators are already running');
      return;
    }
    
    console.log('Starting Firebase emulators...');
    
    // Check if Firebase tools are installed
    const hasFirebaseTools = await checkFirebaseTools();
    if (!hasFirebaseTools) {
      throw new Error('Firebase tools are required but not available');
    }
    
    // Set environment variables for tests
    process.env.FIRESTORE_EMULATOR_HOST = `localhost:${FIRESTORE_PORT}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `localhost:${AUTH_PORT}`;
    
    // Create required files and directories
    await createEmulatorConfig();
    await createEmulatorDataDir();
    
    // Start emulators
    const { stdout } = await exec(
      `npx firebase emulators:start --project=${EMULATOR_PROJECT_ID} --only firestore,auth --no-ui`,
      { timeout: 10000 } // 10 second timeout
    ).catch(error => {
      // Check if error is just a timeout, which is expected since emulators keep running
      if (error.killed && error.signal === 'SIGTERM') {
        return { stdout: 'Emulators started (timeout expected)' };
      }
      throw error;
    });
    
    console.log('Firebase emulators started:', stdout);
    
    // Wait for emulators to be ready
    let retries = 10;
    while (retries > 0) {
      const running = await areEmulatorsRunning();
      if (running) {
        console.log('Emulators are now running and responding');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries--;
    }
    
    throw new Error('Emulators did not start within the expected timeframe');
  } catch (error) {
    console.error('Error starting Firebase emulators:', error);
    
    // For testing purposes, we'll continue even if emulators failed to start
    // This allows us to run tests with mocks instead
    console.log('Continuing with test execution using mocks instead of emulators');
    
    // Set a flag to indicate we're using mocks instead of emulators
    process.env.USE_FIREBASE_MOCKS = 'true';
  }
}

// Mock Firebase for direct imports
jest.mock('@/lib/firebase', () => {
  return {
    getFirebaseFirestore: jest.fn().mockReturnValue({
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
      FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue('server-timestamp'),
        increment: jest.fn((num) => `increment-${num}`),
        arrayUnion: jest.fn((...args) => `array-union-${args.join('-')}`),
        arrayRemove: jest.fn((...args) => `array-remove-${args.join('-')}`),
        delete: jest.fn().mockReturnValue('field-delete')
      }
    })
  };
});

// Suppress console output during tests to reduce noise
if (process.env.NODE_ENV === 'test') {
  // Store original console methods
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Replace with mocks but keep for important messages
  console.log = (...args) => {
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('error') || args[0].includes('Error') || args[0].includes('failing'))) {
      originalLog(...args);
    }
  };
  
  console.info = (...args) => {
    if (args[0] && typeof args[0] === 'string' && 
        (args[0].includes('error') || args[0].includes('Error'))) {
      originalInfo(...args);
    }
  };
  
  console.warn = originalWarn;  // Keep warnings visible
  console.error = originalError; // Keep errors visible
}

// This will run before all tests
export default async () => {
  // Initialize with mocks for now, as we work on resolving the TypeScript issues
  process.env.USE_FIREBASE_MOCKS = 'true';
  
  // Only start emulators if explicitly requested
  if (process.env.USE_EMULATORS === 'true' && !process.env.EMULATORS_STARTED) {
    try {
      await startEmulators();
      process.env.EMULATORS_STARTED = 'true';
    } catch (error) {
      console.error('Failed to start emulators, tests will run with mocks', error);
      process.env.USE_FIREBASE_MOCKS = 'true';
    }
  }
}; 