/**
 * JobSummaryStats Component
 * 
 * A component that displays summary statistics for data generation jobs, including
 * total jobs by status, success/failure rates, and processing metrics.
 */

import React from 'react';
import { JobStatus } from '@/lib/models/data-generation/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/ui-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Separator } from '@/components/ui/separator';

interface JobSummaryStatsProps {
  jobs: JobStatus[];
  isLoading?: boolean;
  period?: 'day' | 'week' | 'month' | 'all';
}

const STATUS_COLORS = {
  queued: '#3b82f6',   // blue
  running: '#f59e0b',  // yellow
  completed: '#10b981', // green
  failed: '#ef4444',    // red
  cancelled: '#6b7280', // gray
  paused: '#8b5cf6',    // purple
};

export function JobSummaryStats({ jobs, isLoading = false, period = 'all' }: JobSummaryStatsProps) {
  // Count jobs by status
  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate success rate
  const totalJobs = jobs.length;
  const completedJobs = statusCounts.completed || 0;
  const failedJobs = statusCounts.failed || 0;
  const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
  
  // Calculate average processing time for completed jobs
  const completedJobsWithDuration = jobs.filter(job => 
    job.status === 'completed' && job.endTime
  );
  
  const avgProcessingTime = completedJobsWithDuration.length > 0
    ? completedJobsWithDuration.reduce((acc, job) => {
        return acc + (job.endTime ? 
          new Date(job.endTime).getTime() - new Date(job.startTime).getTime() : 0);
      }, 0) / completedJobsWithDuration.length / 1000 // convert to seconds
    : 0;
  
  // Format average processing time
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };
  
  // Calculate average data size
  const avgDataSize = totalJobs > 0
    ? jobs.reduce((acc, job) => acc + (job.dataSize || 0), 0) / totalJobs
    : 0;
  
  // Prepare data for bar chart
  const statusChartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count
  }));
  
  // Prepare data for pie chart
  const pieChartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count
  }));
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Job Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-muted-foreground">Loading job statistics...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-muted-foreground">No job data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{totalJobs}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg. Process Time</p>
                <p className="text-2xl font-bold">{formatTime(avgProcessingTime)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg. Data Size</p>
                <p className="text-2xl font-bold">{Math.round(avgDataSize).toLocaleString()}</p>
              </div>
            </div>
            
            {/* Charts */}
            <Tabs defaultValue="bar">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="bar">Status Distribution</TabsTrigger>
                <TabsTrigger value="pie">Percentage</TabsTrigger>
              </TabsList>
              
              <TabsContent value="bar" className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusChartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value, name) => [`${value} jobs`, 'Count']}
                      labelFormatter={(label) => `Status: ${label}`}
                    />
                    <Bar dataKey="count" name="Jobs">
                      {statusChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#000'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              
              <TabsContent value="pie" className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#000'} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value, name) => [`${value} jobs (${((value as number) / totalJobs * 100).toFixed(1)}%)`, 'Count']}
                      labelFormatter={(label) => `Status: ${label}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 