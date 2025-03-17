import { NextRequest, NextResponse } from "next/server";
import { FirestoreJobManagementService } from "@/features/data-generation/services/job-management-service";
import { getFirestoreService } from "@/lib/api/services/firestore-service";
import { getProjectById } from "@/features/projects/services/projectService";
import { logger } from "@/lib/utils/logger";
import { DocumentData } from "firebase-admin/firestore";

// Define job interfaces
interface JobProgress {
  percentComplete: number;
  endTime?: string;
}

interface JobParameters {
  recordCount: number;
  schema?: Record<string, any>;
  options?: Record<string, any>;
}

interface JobConfig {
  parameters: JobParameters;
  outputFormat?: string;
  destination?: string;
}

interface Job {
  id: string;
  name?: string;
  projectId: string;
  customerId?: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt?: Date;
  progress?: JobProgress;
  config?: JobConfig;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

interface SimplifiedJob {
  id: string;
  name?: string;
  projectId: string;
  status: string;
  startTime?: Date;
  endTime?: Date;
  progress?: JobProgress;
}

interface JobSnapshot {
  id: string;
  data: () => Job;
}

// Job service functions
async function getJobsForProject(projectId: string): Promise<JobSnapshot[]> {
  try {
    const firestoreService = getFirestoreService();
    
    // Use the service interface instead of direct Firestore calls
    const jobs = await firestoreService.queryDocuments<Job & { id: string }>('jobs', [
      { field: 'projectId', operator: '==', value: projectId }
    ]);
    
    return jobs.map(job => ({
      id: job.id,
      data: () => job
    }));
  } catch (e) {
    console.error("Error getting jobs:", e);
    return [];
  }
}

// Route handlers
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const jobs = await getJobsForProject(projectId);
    
    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error in GET route:", error);
    return NextResponse.json(
      { error: "Failed to retrieve jobs" },
      { status: 500 }
    );
  }
}