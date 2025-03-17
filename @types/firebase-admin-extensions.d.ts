/**
 * Type extensions for firebase-admin
 */

import { ServiceAccount } from 'firebase-admin';

declare global {
  namespace FirebaseConfig {
    interface Status {
      available: boolean;
      firebase?: {
        available: boolean;
        source: "environment-variables" | "service-account-file" | "application-default" | "mock" | "error-fallback";
        environment: "test" | "development" | "production";
        error?: string;
      };
      source: "environment-variables" | "service-account-file" | "application-default" | "mock" | "error-fallback";
      environment: "test" | "development" | "production";
      error?: string;
    }
    
    interface CredentialValidationResult {
      valid: boolean;
      error?: string;
    }
  }
}

// Make the module a module
export {};
