import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import clientPromise, { ensureConnection } from '@/lib/mongodb';
import { PROJECT_COLLECTION, CreateProjectInput, DEFAULT_PROJECT_SETTINGS } from '@/lib/models/project';
import { 
  shouldUseFirestore, 
  shouldUseMongoDB 
} from '@/lib/services/db-service';
import { getFirestoreService } from '@/lib/services/firestore-service';

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

    const body = await req.json() as CreateProjectInput;

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
      customerId: body.customerId || session.user.customerId || session.user.id,
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

    let projectId: string | ObjectId = '';
    let projectData_return = null;

    // Determine which database backend to use
    const useFirestore = shouldUseFirestore('projects');
    const useMongoDB = shouldUseMongoDB('projects');
    const isWritingToBoth = useFirestore && useMongoDB;

    // Store in Firestore if enabled
    if (useFirestore) {
      try {
        const firestoreService = getFirestoreService();
        await firestoreService.init();
        
        projectId = await firestoreService.create(
          PROJECT_COLLECTION, 
          projectData
        );
        
        projectData_return = {
          ...projectData,
          id: projectId
        };
        
        console.log('Project created in Firestore:', projectId);
      } catch (error) {
        console.error('Error creating project in Firestore:', error);
        if (!isWritingToBoth) {
          return NextResponse.json(
            { error: 'Failed to create project' }, 
            { status: 500 }
          );
        }
        // If both databases are being used, continue to MongoDB
      }
    }

    // Store in MongoDB if enabled
    if (useMongoDB) {
      try {
        const client = await ensureConnection();
        const db = client.db('test');
        
        const result = await db.collection(PROJECT_COLLECTION).insertOne(projectData);
        
        if (!projectId) {
          projectId = result.insertedId;
          projectData_return = {
            ...projectData,
            _id: result.insertedId
          };
        }
        
        console.log('Project created in MongoDB:', result.insertedId);
      } catch (error) {
        console.error('Error creating project in MongoDB:', error);
        
        // If Firestore was successful but MongoDB failed and we're writing to both,
        // we can still continue
        if (!useFirestore) {
          return NextResponse.json(
            { error: 'Failed to create project' }, 
            { status: 500 }
          );
        }
      }
    }

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

    // Determine which database backend to use
    const useFirestore = shouldUseFirestore('projects');
    const useMongoDB = shouldUseMongoDB('projects');

    // Extract query parameters
    const url = new URL(req.url);
    const customerId = url.searchParams.get('customerId');
    const status = url.searchParams.get('status') || 'active';

    let projects = [];

    // Query Firestore if enabled
    if (useFirestore) {
      try {
        const firestoreService = getFirestoreService();
        await firestoreService.init();
        
        projects = await firestoreService.query(
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
        
        // If we got results from Firestore, return them
        if (projects.length > 0) {
          return NextResponse.json(projects);
        }
      } catch (error) {
        console.error('Error fetching projects from Firestore:', error);
        // Continue to MongoDB if enabled
      }
    }

    // Fallback to MongoDB if enabled or if Firestore query returned no results
    if (useMongoDB && projects.length === 0) {
      try {
        // Use enhanced connection handling
        const client = await ensureConnection();
        const db = client.db('test');

        console.log('Fetching projects from MongoDB for user:', session.user.id);

        // Build MongoDB query
        const query: any = {
          'teamMembers.userId': session.user.id,
          status
        };
        
        if (customerId) {
          query.customerId = customerId;
        }

        // Get all projects where user is a team member
        projects = await db.collection(PROJECT_COLLECTION)
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();

        console.log(`Found ${projects.length} projects in MongoDB for user`);
      } catch (error) {
        console.error('MongoDB project fetch error:', error);
        // If Firestore has already been tried and failed, return error
        if (useFirestore) {
          return NextResponse.json(
            { 
              error: 'Failed to fetch projects',
              details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
          );
        }
      }
    }
    
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