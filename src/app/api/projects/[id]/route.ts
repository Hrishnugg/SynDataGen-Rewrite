import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { PROJECT_COLLECTION } from '@/lib/models/project';

// Helper to check if user has access to project
async function hasProjectAccess(db: any, projectId: string, userId: string): Promise<boolean> {
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

    const client = await clientPromise;
    const db = client.db('test');

    // Check if user has access to project
    if (!await hasProjectAccess(db, params.id, session.user.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const project = await db.collection(PROJECT_COLLECTION).findOne({
      _id: new ObjectId(params.id)
    });

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

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, settings } = body;

    const client = await clientPromise;
    const db = client.db('test');

    // Check if user has access and is owner/admin
    const project = await db.collection(PROJECT_COLLECTION).findOne({
      _id: new ObjectId(params.id),
      'teamMembers': {
        $elemMatch: {
          userId: session.user.id,
          role: { $in: ['owner', 'admin'] }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    const updateResult = await db.collection(PROJECT_COLLECTION).updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          ...(name && { name }),
          ...(description && { description }),
          ...(settings && { settings: { ...project.settings, ...settings } }),
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ error: 'No changes made' }, { status: 400 });
    }

    const updatedProject = await db.collection(PROJECT_COLLECTION).findOne({
      _id: new ObjectId(params.id)
    });

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

    const client = await clientPromise;
    const db = client.db('test');

    // Check if user is owner
    const project = await db.collection(PROJECT_COLLECTION).findOne({
      _id: new ObjectId(params.id),
      'teamMembers': {
        $elemMatch: {
          userId: session.user.id,
          role: 'owner'
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    // Soft delete by setting status to archived
    const updateResult = await db.collection(PROJECT_COLLECTION).updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          status: 'archived',
          updatedAt: new Date()
        }
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ error: 'Failed to archive project' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Project archived successfully' });
  } catch (error) {
    console.error('Project deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to archive project' },
      { status: 500 }
    );
  }
} 