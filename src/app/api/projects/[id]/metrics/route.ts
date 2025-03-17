import { NextRequest, NextResponse } from "next/server";
import { getFirestoreService } from "@/lib/api/services/firestore-service";
import { FirestoreJobManagementService } from "@/features/data-generation/services/job-management-service";
import { getProjectById } from "@/lib/api/services/projectService";
import { logger } from "@/lib/utils/logger";

// Define the Job interface to replace implicit any types
interface Job {
  id: string;
  projectId: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
  progress?: {
    percentComplete: number;
    recordsProcessed: number;
    totalRecords: number;
  };
  config?: {
    parameters?: {
      recordCount?: number;
    };
  };
  createdAt?: Date;
  updatedAt?: Date;
  customerId?: string;
  completedAt?: Date;
  storage?: number;
}

// Define interfaces for metrics response
interface ProjectMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  lastActivity: Date | string | null;
  totalRuntime: number;
  averageRuntime: number;
  successRate: number;
  jobs?: number; 
  storage?: number;
  lastRun?: Date | null;
}

// Metrics service functions
async function getMetricsForProject(projectId: string): Promise<ProjectMetrics> {
  try {
    const firestoreService = getFirestoreService();
    
    // Use the service interface instead of direct Firestore calls
    const jobs = await firestoreService.queryDocuments<Job>('jobs', [
      { field: 'projectId', operator: '==', value: projectId }
    ]);
    
    if (!jobs || jobs.length === 0) {
      return { 
        totalJobs: 0, 
        completedJobs: 0, 
        failedJobs: 0, 
        lastActivity: null,
        totalRuntime: 0,
        averageRuntime: 0,
        successRate: 0,
        jobs: 0,
        storage: 0,
        lastRun: null
      };
    }
    
    let storage = 0;
    let lastRun: Date | null = null;
    
    // Calculate metrics
    jobs.forEach(job => {
      if (job.storage) {
        storage += job.storage;
      }
      
      if (job.completedAt) {
        const completedAt = new Date(job.completedAt);
        if (!lastRun || completedAt > lastRun) {
          lastRun = completedAt;
        }
      }
    });
    
    return {
      totalJobs: jobs.length,
      completedJobs: jobs.filter(job => job.status === 'completed').length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      lastActivity: lastRun,
      totalRuntime: calculateTotalRuntime(jobs),
      averageRuntime: calculateAverageRuntime(jobs),
      successRate: calculateSuccessRate(jobs),
      jobs: jobs.length,
      storage,
      lastRun
    };
  } catch (error) {
    console.error("Error getting metrics:", error);
    return { 
      totalJobs: 0, 
      completedJobs: 0, 
      failedJobs: 0, 
      lastActivity: null,
      totalRuntime: 0,
      averageRuntime: 0,
      successRate: 0,
      jobs: 0,
      storage: 0,
      lastRun: null
    };
  }
}

// Helper functions for metrics calculations
function calculateTotalRuntime(jobs: Job[]): number {
  return jobs.reduce((total, job) => {
    if (job.startTime && job.endTime) {
      const start = new Date(job.startTime);
      const end = new Date(job.endTime);
      return total + (end.getTime() - start.getTime()) / 1000; // in seconds
    }
    return total;
  }, 0);
}

function calculateAverageRuntime(jobs: Job[]): number {
  const completedJobs = jobs.filter(job => 
    job.status === 'completed' && job.startTime && job.endTime
  );
  
  if (completedJobs.length === 0) return 0;
  
  const totalRuntime = completedJobs.reduce((total, job) => {
    const start = new Date(job.startTime as Date);
    const end = new Date(job.endTime as Date);
    return total + (end.getTime() - start.getTime()) / 1000; // in seconds
  }, 0);
  
  return totalRuntime / completedJobs.length;
}

function calculateSuccessRate(jobs: Job[]): number {
  const finishedJobs = jobs.filter(job => 
    job.status === 'completed' || job.status === 'failed'
  );
  
  if (finishedJobs.length === 0) return 0;
  
  const completedJobs = finishedJobs.filter(job => job.status === 'completed');
  return (completedJobs.length / finishedJobs.length) * 100;
}

// Route handlers
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const metrics = await getMetricsForProject(projectId);
    
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error in GET route:", error);
    return NextResponse.json(
      { error: "Failed to retrieve metrics" },
      { status: 500 }
    );
  }
}