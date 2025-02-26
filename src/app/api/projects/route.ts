import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PROJECT_COLLECTION, CreateProjectInput, DEFAULT_PROJECT_SETTINGS } from '@/lib/models/firestore/project';
import { getFirestore } from '@/lib/services/db-service';

// Helper function to generate a unique bucket name
function generateBucketName(projectName: string, userId: string): string {
  const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `synoptic-${sanitizedName}-${timestamp}-${randomStr}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: "Project name and description are required" },
        { status: 400 }
      );
    }

    // Generate a unique bucket name
    const bucketName = generateBucketName(body.name, session.user.id);

    // Create project with default settings
    const projectData = {
      name: body.name,
      description: body.description,
      customerId: body.customerId || session.user.id,
      bucketName,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: DEFAULT_PROJECT_SETTINGS,
      teamMembers: [
        {
          userId: session.user.id,
          email: session.user.email,
          role: 'owner',
          joinedAt: new Date()
        }
      ],
      status: 'active'
    };

    // Get Firestore service
    const firestoreService = getFirestore();
    await firestoreService.init();
    
    // Create project in Firestore
    const projectId = await firestoreService.create(
      PROJECT_COLLECTION, 
      projectData
    );
    
    const projectData_return = {
      ...projectData,
      id: projectId
    };
    
    console.log('Project created in Firestore:', projectId);

    // Return the created project
    return NextResponse.json(projectData_return);
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract query parameters
    const url = new URL(req.url);
    const customerId = url.searchParams.get('customerId');
    const status = url.searchParams.get('status') || 'active';

    // Get Firestore service
    const firestoreService = getFirestore();
    await firestoreService.init();
    
    // Query Firestore for projects
    const projects = await firestoreService.query(
      PROJECT_COLLECTION,
      (collection) => {
        let query = collection
          .where('teamMembers', 'array-contains', {
            userId: session.user.id,
            role: 'owner'
          })
          .where('status', '==', status);
          
        if (customerId) {
          query = query.where('customerId', '==', customerId);
        }
        
        return query.orderBy('createdAt', 'desc');
      }
    );
    
    console.log(`Found ${projects.length} projects in Firestore for user:`, session.user.id);
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Project fetch error:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error);
    
    // Return a more descriptive error message
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 