import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PROJECT_COLLECTION } from '@/lib/models/firestore/project';
import { Project } from '@/lib/models/firestore/project';
import { getFirestore } from '@/lib/services/db-service';
import { getFirestoreService } from '@/lib/services/firestore-service';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
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
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const projectId = params.id;
    let updatedProject = null;

    // Get Firestore service
    const firestoreService = getFirestore();
    await firestoreService.init();
    
    // Get project first to check permissions
    const existingProject = await firestoreService.getById<Project>(
      PROJECT_COLLECTION, 
      projectId
    );
    
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Check if user has access to update this project
    const hasAccess = existingProject.teamMembers?.some(
      (member: any) => member.userId === session.user.id && 
        ['owner', 'admin'].includes(member.role)
    );
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
    
    // Update the project
    await firestoreService.update(
      PROJECT_COLLECTION, 
      projectId, 
      {
        ...body,
        updatedAt: new Date()
      }
    );
    
    // Retrieve the updated project
    updatedProject = await firestoreService.getById<Project>(
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
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    // Get Firestore service
    const firestoreService = getFirestore();
    await firestoreService.init();
    
    // Get project first to check permissions
    const existingProject = await firestoreService.getById<Project>(
      PROJECT_COLLECTION, 
      projectId
    );
    
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Check if user has access to delete this project
    const hasAccess = existingProject.teamMembers?.some(
      (member: any) => member.userId === session.user.id && 
        ['owner'].includes(member.role)
    );
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
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