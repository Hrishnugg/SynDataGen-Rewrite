import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { PROJECT_COLLECTION } from '@/lib/models/firestore/project';
import { Project } from '@/lib/models/firestore/project';
import { getFirestore } from '@/lib/services/db-service';
import { getFirestoreService } from '@/lib/services/firestore-service';

// Define the IdParams type for Promise-based parameters
type IdParams = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project ID from params
    const { id: projectId } = await params;
    let project = null;

    // Get Firestore service
    const firestoreService = getFirestore();
    await firestoreService.init();
    
    // Get the project from Firestore
    project = await firestoreService.getById<Project>(PROJECT_COLLECTION, projectId);
    
    // Check if the user has access to this project
    if (project) {
      const hasAccess = project.teamMembers?.some(
        (member: any) => member.userId === session.user.id
      );
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
    } else {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Project fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project ID from params
    const { id: projectId } = await params;
    
    // Get Firestore service
    const firestoreService = getFirestore();
    await firestoreService.init();
    
    // Get the project to check ownership
    const project = await firestoreService.getById<Project>(PROJECT_COLLECTION, projectId);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Check if the user is a team member with appropriate permissions
    const canEdit = project.teamMembers?.some(
      member => member.userId === session.user.id && 
      (member.role === 'owner' || member.role === 'editor')
    );
    
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse request body
    const updateData = await request.json();
    
    // Update the project
    await firestoreService.update(
      PROJECT_COLLECTION, 
      projectId, 
      {
        ...updateData,
        updatedAt: new Date()
      }
    );
    
    // Retrieve the updated project
    const updatedProject = await firestoreService.getById<Project>(
      PROJECT_COLLECTION, 
      projectId
    );

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Project update error:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: IdParams }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project ID from params
    const { id: projectId } = await params;
    
    // Get Firestore service
    const firestoreService = getFirestore();
    await firestoreService.init();
    
    // Get the project to check ownership
    const project = await firestoreService.getById<Project>(PROJECT_COLLECTION, projectId);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Only the project owner can delete a project
    const isOwner = project.teamMembers?.some(
      member => member.userId === session.user.id && member.role === 'owner'
    );
    
    if (!isOwner) {
      return NextResponse.json({ error: 'Only the project owner can delete a project' }, { status: 403 });
    }
    
    // Soft delete by updating status
    await firestoreService.update(
      PROJECT_COLLECTION, 
      projectId, 
      {
        status: 'deleted',
        updatedAt: new Date()
      }
    );

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Project deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
} 