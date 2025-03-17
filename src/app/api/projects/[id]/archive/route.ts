import { NextRequest, NextResponse } from "next/server";
import { archiveProject, getProjectById } from "@/features/projects/services/projectService";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Properly await params according to Next.js 15 requirements
  const { id } = await params;
  const projectId = id;

  try {
    // Check if project exists
    const project = await getProjectById(projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Archive the project
    const success = await archiveProject(projectId);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: "Project successfully archived",
        projectId
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to archive project",
          projectId
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error archiving project:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to archive project",
        projectId
      },
      { status: 500 }
    );
  }
}