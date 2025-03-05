module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }]
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/lib/models/data-generation/**/*.ts',
    'src/lib/services/data-generation/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 30000
}; 