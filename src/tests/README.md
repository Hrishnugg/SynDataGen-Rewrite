# Testing Strategy for SynDataGen

This directory contains tests for the SynDataGen application, focusing on ensuring functionality remains intact during TypeScript fixes and codebase improvements.

## Testing Philosophy

Our testing approach follows these key principles:

1. **Test against real services**: We use Firebase Emulators instead of mocks to ensure tests reflect real-world behavior.
2. **Integration over isolation**: While unit tests are valuable, we focus on integration tests that verify components work together correctly.
3. **Test critical paths first**: We prioritize testing the core functionality that is most critical to users.
4. **Maintain realistic test data**: We use realistic test data that mirrors production scenarios.

## Test Structure

The test directory is organized as follows:

- `/api`: Tests for API routes and handlers
- `/auth-emulator.ts`: Utilities for interacting with the Firebase Auth Emulator
- `/firestore-emulator.ts`: Utilities for interacting with the Firebase Firestore Emulator
- `/firebase`: Tests for Firebase-related functionality
- `/setup.ts`: Initialization code that runs before tests
- `/global-setup.js`: Global initialization that runs once before all tests
- `/global-teardown.js`: Global cleanup that runs after all tests
- `/setup.test.ts`: Tests to verify the test environment is correctly configured

## Running Tests

To run tests, use the following npm scripts:

```bash
# Run all tests
npm test

# Run tests with Firebase emulators
npm run test:emulator

# Run tests and watch for changes
npm run test:watch

# Generate test coverage report
npm run test:coverage

# Start Firebase emulators without running tests
npm run emulators:start

# Stop Firebase emulators
npm run emulators:stop
```

## Firebase Emulators

Tests run against Firebase Emulators to provide realistic testing without connecting to production services:

- **Firestore Emulator**: Runs on port 8080
- **Auth Emulator**: Runs on port 9099
- **Emulator UI**: Available at http://localhost:4000

## Test Utilities

We provide several utility functions to make testing easier:

### Auth Emulator Utilities
- `initializeAuthEmulator()`: Initializes the Auth Emulator
- `createTestUser()`: Creates a test user in the Auth Emulator
- `generateTestIdToken()`: Generates a test ID token for authentication
- `deleteTestUser()`: Deletes a test user from the Auth Emulator
- `clearAuthEmulator()`: Clears all users from the Auth Emulator

### Firestore Emulator Utilities
- `initializeFirestoreEmulator()`: Initializes the Firestore Emulator
- `createFirestoreService()`: Creates a Firestore service instance
- `seedFirestoreEmulator()`: Seeds the Firestore Emulator with test data
- `clearFirestoreEmulator()`: Clears all data from the Firestore Emulator

## Best Practices

1. Always clean up test data after tests complete
2. Avoid dependencies between tests
3. Use descriptive test names that explain what is being tested
4. Follow the AAA pattern (Arrange, Act, Assert)
5. Keep tests focused on verifying one piece of functionality 