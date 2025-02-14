import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
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

    const client = await clientPromise;
    const db = client.db('test'); // Using the same database as auth

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

    const client = await clientPromise;
    const db = client.db('test');

    // Get all projects where user is a team member
    const projects = await db.collection(PROJECT_COLLECTION)
      .find({
        'teamMembers.userId': session.user.id,
        status: 'active'
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Project fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
} 