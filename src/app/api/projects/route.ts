import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import clientPromise, { ensureConnection } from '@/lib/mongodb';
import { PROJECT_COLLECTION, CreateProjectInput, DEFAULT_PROJECT_SETTINGS } from '@/lib/models/project';

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

    const body: CreateProjectInput = await req.json();
    const { name, description, region = 'us-central1', settings } = body;

    // Use enhanced connection handling
    const client = await ensureConnection();
    const db = client.db('test');

    // Create project document
    const project = {
      name,
      description,
      ownerId: session.user.id,
      teamMembers: [{
        userId: session.user.id,
        role: 'owner',
        addedAt: new Date(),
        addedBy: session.user.id
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      storageConfig: {
        bucketName: generateBucketName(name, session.user.id),
        region
      },
      settings: {
        ...DEFAULT_PROJECT_SETTINGS,
        ...settings
      },
      metadata: {}
    };

    const result = await db.collection(PROJECT_COLLECTION).insertOne(project);

    return NextResponse.json({
      id: result.insertedId,
      ...project
    });
  } catch (error) {
    console.error('Project creation error:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
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

    // Use enhanced connection handling
    const client = await ensureConnection();
    const db = client.db('test');

    console.log('Fetching projects for user:', session.user.id);

    // Get all projects where user is a team member
    const projects = await db.collection(PROJECT_COLLECTION)
      .find({
        'teamMembers.userId': session.user.id,
        status: 'active'
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${projects.length} projects for user`);
    
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