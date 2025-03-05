'use client';

/**
 * Performance Test Page
 * 
 * Page for running performance tests on the data generation system.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/ui-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Play, Square, RefreshCw, BarChart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';

export default function PerformanceTestPage() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  const [stopTest, setStopTest] = useState<(() => void) | null>(null);
  
  // Test configuration
  const [concurrentUsers, setConcurrentUsers] = useState(5);
  const [jobsPerUser, setJobsPerUser] = useState(2);
  const [delayBetweenJobs, setDelayBetweenJobs] = useState(2000);
  const [maxTestDuration, setMaxTestDuration] = useState(300); // 5 minutes
  const [recordCount, setRecordCount] = useState(100);
  
  // Test progress
  const [progress, setProgress] = useState<PerformanceTestProgress | null>(null);
  
  // Test results
  const [results, setResults] = useState<PerformanceTestResults | null>(null);
  
  // Handle starting the test
  const handleStartTest = () => {
    setIsRunning(true);
    setResults(null);
    setActiveTab('progress');
    
    // Create test configuration
    const testConfig: PerformanceTestConfig = {
      concurrentUsers,
      jobsPerUser,
      delayBetweenJobsMs: delayBetweenJobs,
      maxTestDurationMs: maxTestDuration * 1000,
      jobTemplate: {
        description: 'Performance test job',
        outputFormat: 'csv',
        recordCount,
        schema: {
          fields: {
            id: { type: 'uuid' },
            name: { type: 'fullName' },
            email: { type: 'email' },
            createdAt: { type: 'date', past: true },
          },
        },
        options: {
          batchSize: 50,
          locale: 'en',
          includeNulls: false,
        },
        startImmediately: true,
      },
      onProgress: (progress) => {
        setProgress(progress);
      },
      onComplete: (results) => {
        setResults(results);
        setIsRunning(false);
        setStopTest(null);
        setActiveTab('results');
        
        toast({
          title: 'Performance test completed',
          description: `Created ${results.jobsCreated} jobs with ${results.successRate.toFixed(2)}% success rate.`,
        });
      },
      onError: (error) => {
        toast({
          title: 'Error during performance test',
          description: error.message,
          variant: 'destructive',
        });
      },
    };
    
    // Run the test
    const stop = runPerformanceTest(testConfig);
    setStopTest(() => stop);
  };
  
  // Handle stopping the test
  const handleStopTest = () => {
    if (stopTest) {
      stopTest();
      setStopTest(null);
      setIsRunning(false);
      
      toast({
        title: 'Performance test stopped',
        description: 'The test was stopped manually.',
      });
    }
  };
  
  // Format milliseconds as human-readable duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };
  
  // Navigate back to dashboard
  const handleBackToDashboard = () => {
    router.push('/dashboard/data-generation');
  };
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToDashboard}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Performance Testing</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              variant="destructive"
              onClick={handleStopTest}
              disabled={!stopTest}
              className="flex items-center gap-1"
            >
              <Square className="h-4 w-4" />
              <span>Stop Test</span>
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleStartTest}
              className="flex items-center gap-1"
            >
              <Play className="h-4 w-4" />
              <span>Start Test</span>
            </Button>
          )}
        </div>
      </div>
      
      <Alert>
        <AlertTitle>Performance Testing Environment</AlertTitle>
        <AlertDescription>
          This page allows you to run performance tests on the data generation system.
          Use this to simulate multiple concurrent users and jobs to test system performance under load.
          Note that these tests will create actual jobs in the system.
        </AlertDescription>
      </Alert>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config">Test Configuration</TabsTrigger>
          <TabsTrigger value="progress" disabled={!isRunning && !progress}>Test Progress</TabsTrigger>
          <TabsTrigger value="results" disabled={!results}>Test Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
              <CardDescription>Configure the performance test parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="concurrent-users">Concurrent Users</Label>
                  <Input
                    id="concurrent-users"
                    type="number"
                    min={1}
                    max={20}
                    value={concurrentUsers}
                    onChange={(e) => setConcurrentUsers(Number(e.target.value))}
                    disabled={isRunning}
                  />
                  <p className="text-sm text-gray-500">Number of simulated concurrent users (1-20)</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="jobs-per-user">Jobs Per User</Label>
                  <Input
                    id="jobs-per-user"
                    type="number"
                    min={1}
                    max={10}
                    value={jobsPerUser}
                    onChange={(e) => setJobsPerUser(Number(e.target.value))}
                    disabled={isRunning}
                  />
                  <p className="text-sm text-gray-500">Number of jobs to create per user (1-10)</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="delay-between-jobs">Delay Between Jobs (ms)</Label>
                  <Input
                    id="delay-between-jobs"
                    type="number"
                    min={500}
                    step={500}
                    value={delayBetweenJobs}
                    onChange={(e) => setDelayBetweenJobs(Number(e.target.value))}
                    disabled={isRunning}
                  />
                  <p className="text-sm text-gray-500">Delay between job creation in milliseconds</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-test-duration">Max Test Duration (seconds)</Label>
                  <Input
                    id="max-test-duration"
                    type="number"
                    min={60}
                    step={60}
                    value={maxTestDuration}
                    onChange={(e) => setMaxTestDuration(Number(e.target.value))}
                    disabled={isRunning}
                  />
                  <p className="text-sm text-gray-500">Maximum test duration in seconds</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="record-count">Records Per Job</Label>
                <Input
                  id="record-count"
                  type="number"
                  min={10}
                  max={10000}
                  value={recordCount}
                  onChange={(e) => setRecordCount(Number(e.target.value))}
                  disabled={isRunning}
                />
                <p className="text-sm text-gray-500">Number of records to generate per job (10-10,000)</p>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-gray-500">
                This test will create {concurrentUsers * jobsPerUser} jobs in total, each generating {recordCount} records.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Progress</CardTitle>
              <CardDescription>Current progress of the performance test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {progress ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.jobsCreated} / {progress.totalJobs} jobs created</span>
                    </div>
                    <Progress value={(progress.jobsCreated / progress.totalJobs) * 100} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Elapsed Time</p>
                      <p className="text-lg font-medium">{formatDuration(progress.elapsedTimeMs)}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Active Jobs</p>
                      <p className="text-lg font-medium">{progress.activeJobs}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Completed Jobs</p>
                      <p className="text-lg font-medium">{progress.jobsCompleted}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Failed Jobs</p>
                      <p className="text-lg font-medium">{progress.jobsFailed}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Rate Limit Hits</p>
                      <p className="text-lg font-medium">{progress.rateLimitHits}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Avg Response Time</p>
                      <p className="text-lg font-medium">{progress.averageResponseTimeMs.toFixed(2)} ms</p>
                    </div>
                  </div>
                  
                  {isRunning && (
                    <div className="flex justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">No test progress data available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>Results of the performance test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {results ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Throughput</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{results.throughput.toFixed(2)}</div>
                        <p className="text-sm text-gray-500">jobs/second</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{results.successRate.toFixed(2)}%</div>
                        <p className="text-sm text-gray-500">{results.jobsCompleted} / {results.jobsCreated} jobs</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Test Duration</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatDuration(results.testDurationMs)}</div>
                        <p className="text-sm text-gray-500">{formatNumber(results.testDurationMs)} ms</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Response Time Statistics</h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Minimum</p>
                        <p className="text-base font-medium">{results.responseTimesMs.min.toFixed(2)} ms</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Maximum</p>
                        <p className="text-base font-medium">{results.responseTimesMs.max.toFixed(2)} ms</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Average</p>
                        <p className="text-base font-medium">{results.responseTimesMs.avg.toFixed(2)} ms</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Median (P50)</p>
                        <p className="text-base font-medium">{results.responseTimesMs.p50.toFixed(2)} ms</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">P90</p>
                        <p className="text-base font-medium">{results.responseTimesMs.p90.toFixed(2)} ms</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">P95</p>
                        <p className="text-base font-medium">{results.responseTimesMs.p95.toFixed(2)} ms</p>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">P99</p>
                        <p className="text-base font-medium">{results.responseTimesMs.p99.toFixed(2)} ms</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Error Statistics</h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Errors</span>
                        <span className="text-sm font-medium">{results.errors.count}</span>
                      </div>
                      
                      {Object.entries(results.errors.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-sm text-gray-500">{type}</span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      ))}
                      
                      {results.errors.count === 0 && (
                        <p className="text-sm text-gray-500">No errors occurred during the test.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">No test results available. Run a test to see results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 