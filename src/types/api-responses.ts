/**
 * api-responses Type Definitions
 * 
 * This file contains type definitions for api-responses in the application.
 */


/**
 * Response from the auth-debug API endpoint
 */
export interface AuthDiagnosticApiResponse {
  status: 'ok' | 'error';
  timestamp: string;
  environment: {
    nextAuthUrl: string;
    nextAuthSecret: string;
    nodeEnv: string;
    apiUrl: string;
    headers: {
      host: string | null;
      origin: string | null;
      referer: string | null;
    }
  };
  auth: {
    sessionStatus: string;
    hasSession: boolean;
    sessionKeys: string[] | null;
    userKeys: string[] | null;
    error: {
      message: string;
      name: string;
      stack?: string;
    } | string | null;
  }
}


/**
 * Debug information returned from the projects API
 */
export interface ProjectsApiDebugInfo {
  mockDataUsed?: boolean;
  noProjects?: boolean;
  errors?: string[];
  timestamp?: string;
  [key: string]: any; // Allow for additional debug fields
}

