'use client';

/**
 * Performance Test Page
 * 
 * Page for running performance tests on the data generation system.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Play, Square, RefreshCw, BarChart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';

// Import types from the types file
import { 
  PerformanceTestProgress, 
  PerformanceTestResults, 
  PerformanceTestConfig,
  runPerformanceTest
} from './types';

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
      concurrency: concurrentUsers,
      duration: maxTestDuration,
      rampUp: 5,
      targetRPS: jobsPerUser,
      testType: 'load',
      endpoint: '/api/data-generation/jobs',
      payloadSize: recordCount,
      dataType: 'json'
    };
    
    // Start the test
    const stopTestFn = runPerformanceTest(testConfig);
    
    // Placeholder for progress updates
    const mockProgress = (progressValue: number) => {
      setProgress({
        percentComplete: progressValue,
        currentStep: `Running test (${progressValue}% complete)`,
        elapsedTime: progressValue * maxTestDuration * 10,
        estimatedTimeRemaining: (100 - progressValue) * maxTestDuration * 10
      });
      
      if (progressValue >= 100) {
        const mockResults: PerformanceTestResults = {
          throughput: 10.5,
          latency: {
            min: 120,
            max: 850,
            avg: 320,
            p50: 290,
            p95: 600,
            p99: 780
          },
          errorRate: 2.5,
          successRate: 97.5,
          duration: maxTestDuration * 1000,
          concurrency: concurrentUsers,
          totalRequests: concurrentUsers * jobsPerUser,
          successfulRequests: Math.floor(concurrentUsers * jobsPerUser * 0.975),
          failedRequests: Math.ceil(concurrentUsers * jobsPerUser * 0.025),
          metrics: {}
        };
        
        setResults(mockResults);
        setIsRunning(false);
        setStopTest(null);
        setActiveTab('results');
        
        toast({
          title: 'Performance test completed',
          description: `Processed ${mockResults.totalRequests} requests with ${mockResults.successRate.toFixed(2)}% success rate.`,
        });
      }
    };
    
    // Simulate the test
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      mockProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 1000);
    
    // Return a function to stop the test
    setStopTest(() => () => {
      clearInterval(interval);
      setIsRunning(false);
      setStopTest(null);
      
      toast({
        title: 'Performance test stopped',
        description: 'The test was stopped manually.',
      });
    });
  };
  
  // Handle stopping the test
  const handleStopTest = () => {
    if (stopTest) {
      stopTest();
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
                    min="1"
                    max="100"
                    value={concurrentUsers}
                    onChange={(e) => setConcurrentUsers(parseInt(e.target.value))}
                    disabled={isRunning}
                  />
                  <p className="text-sm text-gray-500">
                    Number of simulated users making requests concurrently
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="jobs-per-user">Jobs Per User</Label>
                  <Input
                    id="jobs-per-user"
                    type="number"
                    min="1"
                    max="50"
                    value={jobsPerUser}
                    onChange={(e) => setJobsPerUser(parseInt(e.target.value))}
                    disabled={isRunning}
                  />
                  <p className="text-sm text-gray-500">
                    Number of jobs each user will create
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="delay-between-jobs">Delay Between Jobs (ms)</Label>
                  <Input
                    id="delay-between-jobs"
                    type="number"
                    min="0"
                    max="10000"
                    step="100"
                    value={delayBetweenJobs}
                    onChange={(e) => setDelayBetweenJobs(parseInt(e.target.value))}
                    disabled={isRunning}
                  />
                  <p className="text-sm text-gray-500">
                    Delay between job creation requests from the same user
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-test-duration">Max Test Duration (seconds)</Label>
                  <Input
                    id="max-test-duration"
                    type="number"
                    min="10"
                    max="3600"
                    value={maxTestDuration}
                    onChange={(e) => setMaxTestDuration(parseInt(e.target.value))}
                    disabled={isRunning}
                  />
                  <p className="text-sm text-gray-500">
                    Maximum duration for the test to run
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="record-count">Records Per Job</Label>
                  <Input
                    id="record-count"
                    type="number"
                    min="1"
                    max="10000"
                    value={recordCount}
                    onChange={(e) => setRecordCount(parseInt(e.target.value))}
                    disabled={isRunning}
                  />
                  <p className="text-sm text-gray-500">
                    Number of records to generate for each job
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleStartTest}
                disabled={isRunning}
                className="w-full sm:w-auto"
              >
                Start Performance Test
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
              <CardDescription>Estimated test parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Total Jobs</div>
                  <div className="text-2xl font-bold">{concurrentUsers * jobsPerUser}</div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Total Records</div>
                  <div className="text-2xl font-bold">{formatNumber(concurrentUsers * jobsPerUser * recordCount)}</div>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Estimated Duration</div>
                  <div className="text-2xl font-bold">{formatDuration(Math.min(
                    maxTestDuration * 1000,
                    jobsPerUser * delayBetweenJobs * 1.2
                  ))}</div>
                </div>
              </div>
            </CardContent>
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
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{progress.currentStep}</span>
                      <span>{progress.percentComplete}%</span>
                    </div>
                    <Progress value={progress.percentComplete} />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">Elapsed Time</div>
                      <div className="text-2xl font-bold">{formatDuration(progress.elapsedTime)}</div>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">Estimated Time Remaining</div>
                      <div className="text-2xl font-bold">
                        {progress.estimatedTimeRemaining !== undefined 
                          ? formatDuration(progress.estimatedTimeRemaining)
                          : 'Calculating...'}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-center items-center h-40">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p>Initializing test...</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                onClick={handleStopTest}
                disabled={!stopTest}
                className="w-full sm:w-auto"
              >
                Stop Test
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="results" className="space-y-6">
          {results && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                  <CardDescription>Performance metrics from the completed test</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">Throughput</div>
                      <div className="text-2xl font-bold">{results.throughput.toFixed(2)} req/s</div>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">Avg Latency</div>
                      <div className="text-2xl font-bold">{results.latency.avg.toFixed(0)} ms</div>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
                      <div className="text-2xl font-bold">{results.successRate.toFixed(2)}%</div>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">Total Requests</div>
                      <div className="text-2xl font-bold">{formatNumber(results.totalRequests)}</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Latency Breakdown</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Min</div>
                        <div className="text-xl font-bold">{results.latency.min} ms</div>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">P50</div>
                        <div className="text-xl font-bold">{results.latency.p50} ms</div>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">P95</div>
                        <div className="text-xl font-bold">{results.latency.p95} ms</div>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Max</div>
                        <div className="text-xl font-bold">{results.latency.max} ms</div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Request Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Duration</div>
                        <div className="text-xl font-bold">{formatDuration(results.duration)}</div>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Successful</div>
                        <div className="text-xl font-bold">{formatNumber(results.successfulRequests)}</div>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">Failed</div>
                        <div className="text-xl font-bold">{formatNumber(results.failedRequests)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('config')}
                    className="w-full sm:w-auto"
                  >
                    Configure New Test
                  </Button>
                  
                  <Button
                    variant="default"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      // This would download a report in a real implementation
                      toast({
                        title: 'Report Download',
                        description: 'Performance test report download started.',
                      });
                    }}
                  >
                    <BarChart className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
