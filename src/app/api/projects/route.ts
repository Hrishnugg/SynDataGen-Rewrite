import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { PROJECT_COLLECTION, CreateProjectInput, DEFAULT_PROJECT_SETTINGS } from '@/lib/models/firestore/project';
import { getFirestoreService, FirestoreQueryCondition, FirestoreQueryOptions } from '@/lib/api/services/firestore-service';
import { authOptions } from '@/lib/firebase/auth';
import { initializeStorage, createProjectBucket, setupBucketLifecycle, BucketCreationParams } from '@/lib/gcp/storage';

// Define ProjectType interface
interface ProjectType extends Record<string, unknown> {
  id?: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived' | 'deleted';
  bucketName: string;
  teamMembers?: Array<{
    userId: string;
    email?: string | null;
    role: string;
    joinedAt: Date;
  }>;
  settings?: Record<string, any>;
  stats?: {
    totalDatasets: number;
    totalRows: number;
    totalStorage: number;
    lastActivity: Date;
  };
  bucketCreated?: boolean;
  bucketError?: string;
}

// Helper function to generate a unique bucket name
function generateBucketName(projectName: string, userId: string): string {
  const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `synoptic-${sanitizedName}-${timestamp}-${randomStr}`;
}

// Helper function to generate mock projects for testing
function generateMockProjects(userId: string, status: string, count = 5): ProjectType[] {
  const projects: ProjectType[] = [];
  
  for (let i = 0; i < count; i++) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));
    
    const updatedAt = new Date(createdAt);
    updatedAt.setDate(updatedAt.getDate() + Math.floor(Math.random() * 10));
    
    const mockProject: ProjectType = {
      id: `mock-project-${i}-${Date.now()}`,
      name: `Mock Project ${i + 1}`,
      description: `This is a mock project ${i + 1} for testing`,
      createdBy: userId,
      createdAt,
      updatedAt,
      status: status as 'active' | 'archived' | 'deleted',
      bucketName: `mock-bucket-${i}`,
      bucketCreated: true,
      teamMembers: [
        {
          userId,
          role: 'owner',
          joinedAt: createdAt
        }
      ],
      settings: {
        ...DEFAULT_PROJECT_SETTINGS
      },
      stats: {
        totalDatasets: Math.floor(Math.random() * 10),
        totalRows: Math.floor(Math.random() * 10000),
        totalStorage: Math.floor(Math.random() * 1000000),
        lastActivity: updatedAt
      }
    };
    
    projects.push(mockProject);
  }
  
  return projects;
}

/**
 * Create a new project
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Parse request body
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }
    
    // Validate region and ensure it's a string
    const region = (body.region || 'us-central1') as string;
    const userId = session.user.id;
    
    // Create a draft project using FirestoreService
    const firestoreService = getFirestoreService();
    
    // Create project data object that satisfies Record<string, unknown>
    const projectData: Record<string, unknown> = {
      name: body.name,
      description: body.description || '',
      customerId: body.customerId || userId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
      teamMembers: [
        {
          userId,
          role: 'owner',
          joinedAt: new Date()
        }
      ],
      settings: body.settings || DEFAULT_PROJECT_SETTINGS
    };
    
    // Create project document
    const draftProjectId = await firestoreService.createDocument(
      PROJECT_COLLECTION, 
      projectData
    );
    
    console.log(`[PROJECTS-API] Created draft project with ID: ${draftProjectId}`);
    
    // Create bucket name for the project
    const bucketName = generateBucketName(body.name, userId);
    console.log(`[PROJECTS-API] Generated bucket name: ${bucketName}`);
    
    // Initialize GCP storage if not already initialized
    let bucketInfo: {
      bucketName: string;
      region: string;
      bucketUri: string;
      isMock: boolean;
    };
    
    // Check if we're not in mock mode
    const useMockStorage = process.env.MOCK_GCP_STORAGE === 'true';
    
    if (!useMockStorage) {
      try {
        console.log(`[PROJECTS-API] Creating real GCP bucket: ${bucketName}`);
        // Initialize GCP storage
        await initializeStorage();
        
        // Create bucket with proper parameters
        const bucketParams: BucketCreationParams = {
          projectId: draftProjectId,
          customerId: (body.customerId || userId) as string,
          region,
          storageClass: 'STANDARD'
        };
        
        // Create bucket
        const bucketResult = await createProjectBucket(bucketParams);
        
        // Set up bucket lifecycle rules
        const retentionDays = body.settings?.dataRetentionDays || 
                              DEFAULT_PROJECT_SETTINGS.dataRetentionDays || 
                              30; // Default to 30 days if undefined
        
        await setupBucketLifecycle(
          bucketResult.name, 
          [{
            action: { type: 'Delete' },
            condition: { 
              age: retentionDays
            }
          }]
        );
        
        // Set bucket info
        bucketInfo = {
          bucketName: bucketResult.name,
          region: bucketResult.region,
          bucketUri: bucketResult.uri,
          isMock: false
        };
        
        console.log(`[PROJECTS-API] Created GCP bucket: ${bucketResult.name}`);
      } catch (error) {
        console.error('[PROJECTS-API] Error creating GCP bucket:', error);
        
        // We still create the project, but mark it with an error
        bucketInfo = {
          bucketName: `mock-error-${Date.now()}`,
          region,
          bucketUri: '',
          isMock: true
        };
        
        // Store error separately since it's not in the type
        const bucketError = error instanceof Error ? error.message : String(error);
        console.error(`[PROJECTS-API] Bucket creation error: ${bucketError}`);
      }
    } else {
      // In mock mode, create a fake bucket name
      console.log(`[PROJECTS-API] Using mock storage`);
      bucketInfo = {
        bucketName,
        region,
        bucketUri: `gs://${bucketName}`,
        isMock: true
      };
    }
    
    // Update the project with final information using FirestoreService
    const projectUpdate: Record<string, unknown> = {
      id: draftProjectId,
      status: 'active',
      creatorId: userId,
      bucketName: bucketInfo.bucketName,
      bucketRegion: bucketInfo.region,
      bucketUri: bucketInfo.bucketUri,
      bucketCreated: !bucketInfo.isMock,
    };
    
    // Update the project document
    const projectPath = `${PROJECT_COLLECTION}/${draftProjectId}`;
    await firestoreService.updateDocument(projectPath, projectUpdate);
    
    console.log(`[PROJECTS-API] Updated project with bucket info: ${projectPath}`);
    
    // Return the project data
    return NextResponse.json({
      success: true,
      projectId: draftProjectId,
      message: 'Project created successfully',
      bucketInfo
    });
  } catch (error) {
    console.error('[PROJECTS-API] Error creating project:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create project',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * List all projects for the current user
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = session.user.id;
    
    // Parse query parameters with defaults
    const statusFilter = searchParams.get('status') || 'active';
    const limitStr = searchParams.get('limit');
    const offsetStr = searchParams.get('offset');
    
    // Parse limit and offset with defaults
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
    
    console.log(`[PROJECTS-API] Fetching projects for user: ${userId}, status: ${statusFilter}, limit: ${limit}, offset: ${offset}`);
    
    let projects: ProjectType[] = [];
    const firestoreService = getFirestoreService();

    // Build query conditions
    const queryConditions: FirestoreQueryCondition[] = [];
    
    // Add status filter if specified
    if (statusFilter && statusFilter !== 'all') {
      queryConditions.push({
        field: 'status',
        operator: '==',
        value: statusFilter
      });
    }
    
    // Add user ID filter - use safe type assertion since we've validated userId exists
    queryConditions.push({
      field: 'teamMembers',
      operator: 'array-contains',
      value: { userId }
    });
    
    try {
      // Note: The FirestoreService interface doesn't support passing query options directly to queryDocuments
      // We'll need to retrieve all documents first and then apply pagination manually
      projects = await firestoreService.queryDocuments<ProjectType>(
        PROJECT_COLLECTION,
        queryConditions
      );
      
      // Apply sorting, limit, and offset manually
      projects = projects
        .sort((a, b) => {
          const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt as string);
          const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt as string);
          return dateB.getTime() - dateA.getTime(); // descending order
        })
        .slice(offset, offset + limit);
      
      console.log(`[PROJECTS-API] Found ${projects.length} projects`);
    } catch (error) {
      console.error('[PROJECTS-API] Failed to query projects:', error);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[PROJECTS-API] Development mode: Generating mock projects');
        // Ensure status is a valid string
        const safeStatus = statusFilter || 'active';
        projects = generateMockProjects(userId, safeStatus, 5);
      } else {
        throw error;
      }
    }
    
    return NextResponse.json({
      projects,
      total: projects.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('[PROJECTS-API] Error fetching projects:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch projects',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}