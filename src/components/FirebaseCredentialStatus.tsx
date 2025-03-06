/**
 * Firebase Credential Status Component
 * 
 * This component provides a UI for diagnosing Firebase credential issues
 * and showing connection status information.
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Check, AlertTriangle, X, RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';

// Interface for credential diagnostic information
interface CredentialStatus {
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export default function FirebaseCredentialStatus() {
  const [status, setStatus] = useState<CredentialStatus>({
    status: 'loading',
    message: 'Checking Firebase credentials...',
    timestamp: new Date().toISOString()
  });
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(false);

  // Function to check credential status
  const checkCredentials = async () => {
    setChecking(true);
    setStatus({
      status: 'loading',
      message: 'Checking Firebase credentials...',
      timestamp: new Date().toISOString()
    });

    try {
      const response = await fetch('/api/system/firebase-status');
      const data = await response.json();

      if (response.ok) {
        setStatus({
          status: data.status,
          message: data.message,
          details: data.details,
          timestamp: new Date().toISOString()
        });
      } else {
        setStatus({
          status: 'error',
          message: data.message || 'Failed to check credentials',
          details: data.details,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      setStatus({
        status: 'error',
        message: 'Failed to check Firebase credentials',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      });
    } finally {
      setChecking(false);
    }
  };

  // Check credentials on component mount
  useEffect(() => {
    checkCredentials();
  }, []);

  // Status badge renderer
  const StatusBadge = ({ status }: { status: CredentialStatus['status'] }) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <Check size={14} className="mr-1" /> Connected
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <AlertTriangle size={14} className="mr-1" /> Warning
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            <X size={14} className="mr-1" /> Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <RefreshCcw size={14} className="mr-1 animate-spin" /> Checking
          </Badge>
        );
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Firebase Connection Status</CardTitle>
          <StatusBadge status={status.status} />
        </div>
      </CardHeader>

      <CardContent>
        <Alert 
          variant={status.status === 'error' ? 'destructive' : 
                  status.status === 'warning' ? 'warning' : 'default'}
          className="mb-3"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{status.status === 'success' ? 'Connected' : 'Connection Issue'}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>

        {expanded && status.details && (
          <div className="mt-4 text-sm">
            <h4 className="font-semibold mb-2">Diagnostic Information</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-48">
              {JSON.stringify(status.details, null, 2)}
            </pre>
            
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Troubleshooting Steps</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Check that your Firebase credentials are properly configured in environment variables</li>
                <li>Verify that the private key format is correct (including proper newlines)</li>
                <li>Ensure the service account has proper permissions</li>
                <li>Check the server logs for more detailed error information</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-xs"
        >
          {expanded ? (
            <><ChevronUp className="h-4 w-4 mr-1" /> Hide Details</>
          ) : (
            <><ChevronDown className="h-4 w-4 mr-1" /> Show Details</>
          )}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={checkCredentials}
          disabled={checking}
          className="text-xs"
        >
          <RefreshCcw className={`h-4 w-4 mr-1 ${checking ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
} 