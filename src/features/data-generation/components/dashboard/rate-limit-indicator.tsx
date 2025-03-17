/**
 * RateLimitIndicator Component
 * 
 * A component that displays the current rate limit usage for data generation jobs.
 * It shows available job slots, active jobs, and cooldown status.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RateLimitStatus } from '@/lib/models/data-generation/types';
import { format } from 'date-fns';
import { Clock, AlertTriangle, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RateLimitIndicatorProps {
  status: RateLimitStatus;
  isLoading?: boolean;
}

export function RateLimitIndicator({ status, isLoading = false }: RateLimitIndicatorProps) {
  // Calculate percentage of usage
  const usagePercent = (status.currentUsage / status.limit) * 100;
  
  // Determine status color based on usage
  const getStatusColor = (percent: number) => {
    if (percent < 50) return 'bg-green-500';
    if (percent < 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Check if approaching limit
  const isApproachingLimit = usagePercent >= 75;
  
  // Format reset time
  const resetTime = status.resetTime ? new Date(status.resetTime) : new Date();
  const formattedResetTime = format(resetTime, 'MMM d, yyyy h:mm a');
  
  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Usage</span>
          <span className="text-sm font-medium">{Math.round(usagePercent)}%</span>
        </div>
        <Progress 
          value={usagePercent} 
          className={`h-2`}
          indicatorClassName={usagePercent > 75 ? "bg-destructive" : usagePercent > 50 ? "bg-warning" : "bg-primary"}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted p-3 rounded-md">
          <div className="text-sm text-muted-foreground">Current Usage</div>
          <div className="text-2xl font-semibold">{status.currentUsage.toLocaleString()}</div>
        </div>
        <div className="bg-muted p-3 rounded-md">
          <div className="text-sm text-muted-foreground">Limit</div>
          <div className="text-2xl font-semibold">{status.limit.toLocaleString()}</div>
        </div>
      </div>
      
      <div className="flex items-center text-sm text-muted-foreground">
        <Clock className="h-4 w-4 mr-1" />
        <span>Resets on {formattedResetTime}</span>
      </div>
      
      {isApproachingLimit && (
        <div className="flex items-center gap-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4" />
          <span>Approaching rate limit</span>
        </div>
      )}
    </div>
  );
} 