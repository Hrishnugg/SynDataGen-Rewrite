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
