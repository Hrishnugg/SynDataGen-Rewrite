import { NextRequest, NextResponse } from "next/server";
import { getProjectById, updateProject, deleteProject } from "@/lib/services/projectService";
import { deleteBucket, initializeStorage } from "@/lib/gcp/storage";
import { getFirestore } from "@/lib/services/db-service";
// Import the Project type for better type checking
import { Project } from "@/app/dashboard/projects/columns";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const projectId = id;

  console.log(`[PROJECT-API-GET] Fetching project with ID: ${projectId}`);

  try {
    const project = await getProjectById(projectId);
    
    if (!project) {
      console.log(`[PROJECT-API-GET] Project not found with ID: ${projectId}`);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    console.log(`[PROJECT-API-GET] Successfully retrieved project: ${projectId}`);
    return NextResponse.json(project);
  } catch (error) {
    console.error(`[PROJECT-API-GET] Error fetching project ${projectId}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch project: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const projectId = id;
  
  try {
    const body = await request.json();
    const updatedProject = await updateProject(projectId, body);
    
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const projectId = id;
  
  console.log(`[PROJECT-API-DELETE] Attempting to delete project with ID: ${projectId}`);
  
  try {
    // First get the project to find the bucket name
    const project = await getProjectById(projectId);
    
    if (!project) {
      console.log(`[PROJECT-API-DELETE] Project not found with ID: ${projectId}`);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    console.log(`[PROJECT-DELETE] Deleting project ${projectId} with bucket ${project.storage?.bucketName}`);
    
    // Track what was deleted for reporting to UI
    const deletionResults = {
      project: false,
      bucket: false,
      bucketName: project.storage?.bucketName || "none",
      jobs: 0,
      errors: [] as string[]
    };
    
    // 1. Delete associated jobs
    try {
      // Get Firestore service
      const firestoreService = await getFirestore();
      
      // Use a query to find all jobs for this project
      // Retrieve all jobs with this projectId
      const jobsSnapshot = await firestoreService.query("dataGenerationJobs", {
        where: [["projectId", "==", projectId]]
      });
      
      console.log(`[PROJECT-DELETE] Found ${jobsSnapshot.length} jobs to delete for project ${projectId}`);
      
      // Delete each job - use a batch for efficiency if there are many
      if (jobsSnapshot.length > 0) {
        if (jobsSnapshot.length <= 10) {
          // For small number of jobs, delete individually
          for (const job of jobsSnapshot) {
            await firestoreService.delete("dataGenerationJobs", job.id);
          }
        } else {
          // For larger batches, use batch processing
          const batchSize = 100;
          for (let i = 0; i < jobsSnapshot.length; i += batchSize) {
            const batch = jobsSnapshot.slice(i, i + batchSize);
            await firestoreService.batchDelete("dataGenerationJobs", batch.map(job => job.id));
          }
        }
        
        deletionResults.jobs = jobsSnapshot.length;
        console.log(`[PROJECT-DELETE] Successfully deleted ${jobsSnapshot.length} jobs`);
      }
    } catch (jobError) {
      console.error(`[PROJECT-DELETE] Error deleting jobs for project ${projectId}:`, jobError);
      deletionResults.errors.push(`Failed to delete all associated jobs: ${jobError instanceof Error ? jobError.message : String(jobError)}`);
      // Continue with deletion even if jobs fail
    }
    
    // 2. Delete the GCP bucket if it exists and is not a mock bucket
    if (project.storage?.bucketName && !project.storage?.isMock) {
      try {
        await initializeStorage();
        console.log(`[PROJECT-DELETE] Deleting GCP bucket: ${project.storage.bucketName}`);
        
        // Delete bucket with force=true to remove all objects first
        await deleteBucket(project.storage.bucketName, true);
        
        deletionResults.bucket = true;
        console.log(`[PROJECT-DELETE] Successfully deleted bucket ${project.storage.bucketName}`);
      } catch (bucketError) {
        console.error(`[PROJECT-DELETE] Error deleting bucket ${project.storage.bucketName}:`, bucketError);
        deletionResults.errors.push(`Failed to delete storage bucket: ${bucketError instanceof Error ? bucketError.message : String(bucketError)}`);
        // Continue with project deletion even if bucket deletion fails
      }
    } else {
      console.log(`[PROJECT-DELETE] No GCP bucket to delete or using mock bucket: ${project.storage?.bucketName}`);
      deletionResults.bucket = true; // Mark as successful if there's no real bucket
    }
    
    // 3. Finally delete the project
    await deleteProject(projectId);
    deletionResults.project = true;
    
    console.log(`[PROJECT-DELETE] Project ${projectId} successfully deleted`);
    
    return NextResponse.json({
      success: true,
      message: "Project and associated resources deleted successfully",
      deletionResults
    });
  } catch (error) {
    console.error(`[PROJECT-DELETE] Error deleting project ${projectId}:`, error);
    return NextResponse.json(
      { 
        error: "Failed to delete project",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 