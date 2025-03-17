"use client";

import { AuthDiagnosticApiResponse } from '@/types/api-responses';
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function AuthDiagnosticPage() {
  const { data: session, status } = useSession();
  const [apiCheck, setApiCheck] = useState<AuthDiagnosticApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check the auth debug API
  const checkAuthApi = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth-debug');
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setApiCheck(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthApi();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Auth Diagnostic Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Client-side Session</h2>
          <div className="space-y-2">
            <p><span className="font-semibold">Status:</span> {status}</p>
            <p><span className="font-semibold">Has Session:</span> {session ? 'Yes' : 'No'}</p>
            {session && (
              <>
                <p><span className="font-semibold">Session Keys:</span> {Object.keys(session).join(', ')}</p>
                {session.user && (
                  <p><span className="font-semibold">User Keys:</span> {Object.keys(session.user).join(', ')}</p>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Server-side Check</h2>
          {loading ? (
            <p>Loading API data...</p>
          ) : error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          ) : apiCheck ? (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold">Environment:</h3>
                <ul className="list-disc pl-5">
                  <li>NEXTAUTH_URL: {apiCheck.environment.nextAuthUrl}</li>
                  <li>NEXTAUTH_SECRET: {apiCheck.environment.nextAuthSecret}</li>
                  <li>NODE_ENV: {apiCheck.environment.nodeEnv}</li>
                  <li>API URL: {apiCheck.environment.apiUrl}</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold">Auth Status:</h3>
                <ul className="list-disc pl-5">
                  <li>Session Status: {apiCheck.auth.sessionStatus}</li>
                  <li>Has Session: {apiCheck.auth.hasSession ? 'Yes' : 'No'}</li>
                  {apiCheck.auth.sessionKeys && (
                    <li>Session Keys: {apiCheck.auth.sessionKeys.join(', ')}</li>
                  )}
                  {apiCheck.auth.userKeys && (
                    <li>User Keys: {apiCheck.auth.userKeys.join(', ')}</li>
                  )}
                </ul>
              </div>
              
              {apiCheck.auth.error && (
                <div>
                  <h3 className="font-semibold text-red-600">Auth Error:</h3>
                  <pre className="bg-red-50 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(apiCheck.auth.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p>No API data available</p>
          )}
          
          <button 
            onClick={checkAuthApi}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh API Check
          </button>
        </div>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Auth Configuration</h2>
        <div className="space-y-4">
          <p>If you're experiencing authentication issues, please check the following:</p>
          
          <ol className="list-decimal pl-5 space-y-2">
            <li>Ensure <code>.env.local</code> file exists with proper configuration</li>
            <li>Verify <code>NEXTAUTH_URL</code> is set to your base URL (e.g., <code>http://localhost:3000</code>)</li>
            <li>Verify <code>NEXTAUTH_SECRET</code> is set to a secure random string</li>
            <li>Check that the <code>api/auth/[...nextauth]/route.ts</code> file exists</li>
            <li>Ensure there are no network connectivity issues</li>
          </ol>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="font-semibold">Common Issues:</p>
            <ul className="list-disc pl-5">
              <li>Missing or incorrect environment variables</li>
              <li>Network connectivity problems</li>
              <li>CORS configuration issues</li>
              <li>Invalid NextAuth configuration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 