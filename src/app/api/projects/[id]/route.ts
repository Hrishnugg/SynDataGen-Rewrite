import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { PROJECT_COLLECTION } from '@/lib/models/project';
import { 
  shouldUseFirestore, 
  shouldUseMongoDB 
} from '@/lib/services/db-service';
import { getFirestoreService } from '@/lib/services/firestore-service';
import { isValidObjectId } from '@/lib/utils/db-utils';

// Helper to check if user has access to project in MongoDB
async function hasMongoDBProjectAccess(db: any, projectId: string, userId: string): Promise<boolean> {
  const project = await db.collection(PROJECT_COLLECTION).findOne({
    _id: new ObjectId(projectId),
    'teamMembers.userId': userId
  });
  return !!project;
}

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

    // Determine which database backend to use
    const useFirestore = shouldUseFirestore('projects');
    const useMongoDB = shouldUseMongoDB('projects');

    // Try Firestore first if enabled
    if (useFirestore) {
      try {
        const firestoreService = getFirestoreService();
        await firestoreService.init();
        
        project = await firestoreService.getById(PROJECT_COLLECTION, projectId);
        
        // Check if the user has access to this project
        if (project) {
          const hasAccess = project.teamMembers?.some(
            (member: any) => member.userId === session.user.id
          );
          
          if (!hasAccess) {
            project = null; // Reset project if user doesn't have access
          }
        }
        
        // If project found in Firestore, return it
        if (project) {
          return NextResponse.json(project);
        }
      } catch (error) {
        console.error('Error fetching project from Firestore:', error);
        // Continue to MongoDB as fallback
      }
    }

    // Try MongoDB if Firestore didn't yield results or it's not enabled
    if (useMongoDB && !project) {
      try {
        // Validate ObjectId for MongoDB
        if (!isValidObjectId(projectId)) {
          return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
        }
        
        const client = await clientPromise;
        const db = client.db('test');

        // Check if user has access to project
        if (!await hasMongoDBProjectAccess(db, projectId, session.user.id)) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        project = await db.collection(PROJECT_COLLECTION).findOne({
          _id: new ObjectId(projectId)
        });
      } catch (error) {
        console.error('Error fetching project from MongoDB:', error);
        
        // If Firestore has already been tried, return error
        if (useFirestore) {
          return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
        }
      }
    }

    if (!project) {
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

    // Determine which database backend to use
    const useFirestore = shouldUseFirestore('projects');
    const useMongoDB = shouldUseMongoDB('projects');
    const isWritingToBoth = useFirestore && useMongoDB;

    // Update in Firestore if enabled
    if (useFirestore) {
      try {
        const firestoreService = getFirestoreService();
        await firestoreService.init();
        
        // Get project first to check permissions
        const existingProject = await firestoreService.getById(
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
        updatedProject = await firestoreService.getById(
          PROJECT_COLLECTION, 
          projectId
        );
        
        console.log('Project updated in Firestore:', projectId);
      } catch (error) {
        console.error('Error updating project in Firestore:', error);
        if (!isWritingToBoth) {
          return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
        }
        // Continue to MongoDB if writing to both
      }
    }

    // Update in MongoDB if enabled
    if (useMongoDB) {
      try {
        // Validate ObjectId for MongoDB
        if (!isValidObjectId(projectId)) {
          return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
        }
        
        const client = await clientPromise;
        const db = client.db('test');

        // Check if user has access to project
        if (!await hasMongoDBProjectAccess(db, projectId, session.user.id)) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Update the project
        const result = await db.collection(PROJECT_COLLECTION).updateOne(
          { _id: new ObjectId(projectId) },
          { 
            $set: {
              ...body,
              updatedAt: new Date()
            } 
          }
        );
        
        if (result.matchedCount === 0) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        
        // Retrieve the updated project
        if (!updatedProject) {
          updatedProject = await db.collection(PROJECT_COLLECTION).findOne({
            _id: new ObjectId(projectId)
          });
        }
        
        console.log('Project updated in MongoDB:', projectId);
      } catch (error) {
        console.error('Error updating project in MongoDB:', error);
        
        // If Firestore was successful but MongoDB failed and we're writing to both,
        // we can still continue with the Firestore result
        if (!useFirestore || !updatedProject) {
          return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
        }
      }
    }

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

    // Determine which database backend to use
    const useFirestore = shouldUseFirestore('projects');
    const useMongoDB = shouldUseMongoDB('projects');
    let deleteSuccess = false;

    // Delete from Firestore if enabled
    if (useFirestore) {
      try {
        const firestoreService = getFirestoreService();
        await firestoreService.init();
        
        // Get project first to check permissions
        const existingProject = await firestoreService.getById(
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
        
        deleteSuccess = true;
        console.log('Project soft-deleted in Firestore:', projectId);
      } catch (error) {
        console.error('Error deleting project from Firestore:', error);
        // Continue to MongoDB if enabled
      }
    }

    // Delete from MongoDB if enabled
    if (useMongoDB) {
      try {
        // Validate ObjectId for MongoDB
        if (!isValidObjectId(projectId)) {
          return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
        }
        
        const client = await clientPromise;
        const db = client.db('test');

        // Check if user has access to project
        if (!await hasMongoDBProjectAccess(db, projectId, session.user.id)) {
          return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        
        // Soft delete by updating status
        const result = await db.collection(PROJECT_COLLECTION).updateOne(
          { _id: new ObjectId(projectId) },
          { 
            $set: {
              status: 'deleted',
              updatedAt: new Date()
            } 
          }
        );
        
        if (result.matchedCount === 0) {
          if (deleteSuccess) {
            // If Firestore delete was successful, we're good
            console.log('Project not found in MongoDB but deleted from Firestore');
          } else {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
          }
        } else {
          deleteSuccess = true;
          console.log('Project soft-deleted in MongoDB:', projectId);
        }
      } catch (error) {
        console.error('Error deleting project from MongoDB:', error);
        
        // If Firestore delete was successful but MongoDB failed, we can continue
        if (!deleteSuccess) {
          return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
        }
      }
    }

    if (!deleteSuccess) {
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Project deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
} 