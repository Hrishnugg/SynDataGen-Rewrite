/**
 * Data Retention Indicator
 * 
 * This component shows information about the data retention policy and when a job's data
 * will be deleted according to the policy.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/ui-card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, AlertTriangle, Info } from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, addDays, parseISO } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface DataRetentionIndicatorProps {
  createdAt: string | Date;  // Job creation date
  expirationDate?: string | Date;  // Optional explicit expiration date
  retentionPeriodDays: number;  // Retention period in days
  onExtendRetention?: () => Promise<void>;  // Optional callback to extend retention
  onRequestEarlyDeletion?: () => Promise<void>;  // Optional callback to request early deletion
}

export function DataRetentionIndicator({
  createdAt,
  expirationDate,
  retentionPeriodDays,
  onExtendRetention,
  onRequestEarlyDeletion
}: DataRetentionIndicatorProps) {
  // Convert dates to Date objects if they're strings
  const creationDate = typeof createdAt === 'string' ? parseISO(createdAt) : createdAt;
  
  // Calculate expiration date if not provided
  const calculatedExpirationDate = expirationDate 
    ? (typeof expirationDate === 'string' ? parseISO(expirationDate) : expirationDate)
    : addDays(creationDate, retentionPeriodDays);
  
  // Check if the expiration date is approaching (within 30 days)
  const isApproaching = isBefore(calculatedExpirationDate, addDays(new Date(), 30));
  
  // Check if the job has already expired
  const isExpired = isBefore(calculatedExpirationDate, new Date());
  
  // Format dates for display
  const formattedCreationDate = format(creationDate, 'PPP');
  const formattedExpirationDate = format(calculatedExpirationDate, 'PPP');
  
  // Get relative time to expiration
  const timeUntilExpiration = formatDistanceToNow(calculatedExpirationDate, { addSuffix: true });
  
  // Get percentage of retention period elapsed
  const totalRetentionMs = retentionPeriodDays * 24 * 60 * 60 * 1000;
  const elapsedMs = Date.now() - creationDate.getTime();
  const percentElapsed = Math.min(100, Math.max(0, (elapsedMs / totalRetentionMs) * 100));
  
  return (
    <Card className={isExpired ? 'border-red-300' : isApproaching ? 'border-yellow-300' : 'border-gray-200'}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Data Retention</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  According to our data retention policy, job data is automatically deleted after {retentionPeriodDays} days.
                  You can request an extension or early deletion if needed.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          {isExpired 
            ? 'This job data has expired and will be deleted soon.'
            : `Job data will be deleted ${timeUntilExpiration}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                Created
              </span>
              <span className="font-medium">{formattedCreationDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                Expires
              </span>
              <span className={`font-medium ${isExpired ? 'text-red-500' : isApproaching ? 'text-yellow-600' : ''}`}>
                {formattedExpirationDate}
              </span>
            </div>
          </div>
          
          {/* Progress bar showing retention period elapsed */}
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${
                isExpired 
                  ? 'bg-red-500' 
                  : isApproaching 
                    ? 'bg-yellow-500' 
                    : 'bg-blue-500'
              }`}
              style={{ width: `${percentElapsed}%` }}
            />
          </div>
          
          {isApproaching && !isExpired && (
            <div className="flex items-center text-yellow-600 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Approaching deletion date</span>
            </div>
          )}
          
          {isExpired && (
            <div className="flex items-center text-red-600 text-sm">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span>Scheduled for imminent deletion</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex flex-col sm:flex-row gap-2">
        {onExtendRetention && !isExpired && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onExtendRetention}
            className="w-full sm:w-auto"
          >
            Extend Retention
          </Button>
        )}
        {onRequestEarlyDeletion && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRequestEarlyDeletion}
            className="w-full sm:w-auto text-red-500 hover:text-red-700"
          >
            Request Early Deletion
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 