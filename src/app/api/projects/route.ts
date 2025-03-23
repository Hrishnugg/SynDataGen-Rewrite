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
      // Initialize storage object with placeholder values
      storage: {
        bucketName: '', // Will be populated after bucket creation
        region: region,
        usedStorage: 0
      },
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
      status: 'active',  // Critical: Update from draft to active status
      creatorId: userId,
      // Properly structure storage fields according to Project interface
      storage: {
        bucketName: bucketInfo.bucketName,
        region: bucketInfo.region,
        usedStorage: 0  // Initialize with zero storage used
      },
      // Keep these fields for backward compatibility
      bucketCreated: !bucketInfo.isMock,
      bucketUri: bucketInfo.bucketUri,
    };
    
    // Log the update structure for debugging
    console.log(`[PROJECTS-API] Updating project ${draftProjectId} with structure:`, JSON.stringify({
      ...projectUpdate,
      path: `${PROJECT_COLLECTION}/${draftProjectId}`
    }));
    
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
    
    // Use a different approach for teamMembers - we need to query for teamMembers where userId matches
    // Without trying to match the exact object structure (which would fail because of joinedAt)
    // Firebase doesn't support complex queries on array fields, so simplest solution is to query by userId
    if (statusFilter && statusFilter !== 'all') {
      console.log(`[PROJECTS-API] Fetching projects for user ${userId} with status ${statusFilter}`);
      // Try using the full path to userId within the array for the query
      queryConditions.push({
        field: 'teamMembers',
        operator: 'array-contains',
        value: { userId } // Query only on userId, ignoring other fields
      });
    } else {
      // If no status filter, just get all the user's projects
      queryConditions.push({
        field: 'teamMembers',
        operator: 'array-contains',
        value: { userId } // Query only on userId, ignoring other fields
      });
    }
    
    // Log exact query conditions for debugging
    console.log(`[PROJECTS-API] Query conditions:`, JSON.stringify(queryConditions));
    
    try {
      // First try with both conditions
      const rawProjects = await firestoreService.queryDocuments<ProjectType>(
        PROJECT_COLLECTION,
        queryConditions
      );
      
      // Manual conversion of Firebase timestamp objects to proper Date objects
      projects = rawProjects.map(project => {
        try {
          // Create a clean version of the project with converted dates
          const convertedProject = { ...project };
          
          // Handle createdAt field
          if (project.createdAt && typeof project.createdAt === 'object' && 'toDate' in project.createdAt) {
            convertedProject.createdAt = (project.createdAt as any).toDate();
          }
          
          // Handle updatedAt field
          if (project.updatedAt && typeof project.updatedAt === 'object' && 'toDate' in project.updatedAt) {
            convertedProject.updatedAt = (project.updatedAt as any).toDate();
          }
          
          return convertedProject;
        } catch (conversionError) {
          console.error(`[PROJECTS-API] Error converting project dates:`, conversionError);
          return project; // Return original project as fallback
        }
      });
      
      // Log the raw projects count
      console.log(`[PROJECTS-API] Raw projects count with full conditions: ${projects.length}`);
      
      // If no projects found with full query, try with just status filter to debug
      if (projects.length === 0 && statusFilter && statusFilter !== 'all') {
        console.log(`[PROJECTS-API] No projects found with full query, trying with just status filter`);
        
        const statusOnlyConditions: FirestoreQueryCondition[] = [{
          field: 'status',
          operator: '==' as const,
          value: statusFilter
        }];
        
        const rawStatusFilteredProjects = await firestoreService.queryDocuments<ProjectType>(
          PROJECT_COLLECTION,
          statusOnlyConditions
        );
        
        // Apply the same timestamp conversion
        const statusFilteredProjects = rawStatusFilteredProjects.map(project => {
          try {
            // Create a clean version of the project with converted dates
            const convertedProject = { ...project };
            
            // Handle createdAt field
            if (project.createdAt && typeof project.createdAt === 'object' && 'toDate' in project.createdAt) {
              convertedProject.createdAt = (project.createdAt as any).toDate();
            }
            
            // Handle updatedAt field
            if (project.updatedAt && typeof project.updatedAt === 'object' && 'toDate' in project.updatedAt) {
              convertedProject.updatedAt = (project.updatedAt as any).toDate();
            }
            
            return convertedProject;
          } catch (conversionError) {
            console.error(`[PROJECTS-API] Error converting status-filtered project dates:`, conversionError);
            return project; // Return original project as fallback
          }
        });
        
        console.log(`[PROJECTS-API] Projects with status '${statusFilter}' only: ${statusFilteredProjects.length}`);
        
        // If we found projects with just status filter, use them directly and log structure
        if (statusFilteredProjects.length > 0) {
          console.log(`[PROJECTS-API] Using status-filtered projects instead of empty combined query results`);
          
          // Log the structure of the first status-filtered project for debugging
          const firstProject = statusFilteredProjects[0];
          console.log(`[PROJECTS-API] First status-filtered project:`, JSON.stringify({
            id: firstProject.id,
            status: firstProject.status,
            updatedAt: firstProject.updatedAt,
            updatedAtType: typeof firstProject.updatedAt,
            createdAt: firstProject.createdAt,
            createdAtType: typeof firstProject.createdAt,
            // Log the team members structure which is key to the issue
            hasTeamMembers: !!firstProject.teamMembers,
            teamMembersCount: firstProject.teamMembers?.length || 0,
            teamMembersExample: firstProject.teamMembers && firstProject.teamMembers.length > 0 
              ? JSON.stringify(firstProject.teamMembers[0]) 
              : 'none'
          }));
          
          // Use these projects directly
          projects = statusFilteredProjects;
        } else {
          // If we still found nothing with status filter, try to get all projects to see if any exist
          console.log(`[PROJECTS-API] Trying to get all projects regardless of status`);
          
          const rawAllProjects = await firestoreService.queryDocuments<ProjectType>(
            PROJECT_COLLECTION, 
            []
          );
          
          // Apply the same timestamp conversion
          const allProjects = rawAllProjects.map(project => {
            try {
              // Create a clean version of the project with converted dates
              const convertedProject = { ...project };
              
              // Handle createdAt field
              if (project.createdAt && typeof project.createdAt === 'object' && 'toDate' in project.createdAt) {
                convertedProject.createdAt = (project.createdAt as any).toDate();
              }
              
              // Handle updatedAt field
              if (project.updatedAt && typeof project.updatedAt === 'object' && 'toDate' in project.updatedAt) {
                convertedProject.updatedAt = (project.updatedAt as any).toDate();
              }
              
              return convertedProject;
            } catch (conversionError) {
              console.error(`[PROJECTS-API] Error converting all-projects dates:`, conversionError);
              return project; // Return original project as fallback
            }
          });
          
          console.log(`[PROJECTS-API] Total projects in collection: ${allProjects.length}`);
          
          // Log structure of first few projects if any exist
          if (allProjects.length > 0) {
            console.log(`[PROJECTS-API] First project overall structure:`, 
              JSON.stringify({
                id: allProjects[0].id,
                status: allProjects[0].status,
                hasTeamMembers: !!allProjects[0].teamMembers,
                teamMembersLength: allProjects[0].teamMembers?.length || 0,
                hasStorage: !!allProjects[0].storage,
                hasBucketName: !!allProjects[0].bucketName
              })
            );
            
            // Check if there are projects that need structure migration
            const projectsToMigrate = allProjects.filter(project => {
              // Safely access properties with type checking
              const projectAny = project as any; // Use any for migration compatibility
              return project.status === 'active' && 
                    projectAny.bucketName && // Has old bucketName field
                    (!projectAny.storage || !projectAny.storage.bucketName); // Missing proper storage structure
            });
            
            if (projectsToMigrate.length > 0) {
              console.log(`[PROJECTS-API] Found ${projectsToMigrate.length} projects that need structure migration`);
              
              // Auto-fix up to 5 projects to prevent too many updates at once
              const projectsToFix = projectsToMigrate.slice(0, 5);
              
              for (const project of projectsToFix) {
                try {
                  console.log(`[PROJECTS-API] Migrating project ${project.id} to proper structure`);
                  
                  // Create proper storage object from root fields using any type for migration
                  const projectAny = project as any;
                  const storage = {
                    bucketName: projectAny.bucketName || '',
                    region: projectAny.bucketRegion || 'us-central1',
                    usedStorage: 0
                  };
                  
                  // Update the project with proper structure
                  await firestoreService.updateDocument(`${PROJECT_COLLECTION}/${project.id}`, {
                    storage
                  });
                  
                  console.log(`[PROJECTS-API] Successfully migrated project ${project.id}`);
                } catch (migrationError) {
                  console.error(`[PROJECTS-API] Failed to migrate project ${project.id}:`, migrationError);
                }
              }
              
              // Try the status-only query again after migration
              if (projectsToFix.length > 0) {
                console.log(`[PROJECTS-API] Retrying query after migration`);
                
                const rawMigratedProjects = await firestoreService.queryDocuments<ProjectType>(
                  PROJECT_COLLECTION,
                  statusOnlyConditions
                );
                
                // Apply the same timestamp conversion
                const migratedProjects = rawMigratedProjects.map(project => {
                  try {
                    // Create a clean version of the project with converted dates
                    const convertedProject = { ...project };
                    
                    // Handle createdAt field
                    if (project.createdAt && typeof project.createdAt === 'object' && 'toDate' in project.createdAt) {
                      convertedProject.createdAt = (project.createdAt as any).toDate();
                    }
                    
                    // Handle updatedAt field
                    if (project.updatedAt && typeof project.updatedAt === 'object' && 'toDate' in project.updatedAt) {
                      convertedProject.updatedAt = (project.updatedAt as any).toDate();
                    }
                    
                    return convertedProject;
                  } catch (conversionError) {
                    console.error(`[PROJECTS-API] Error converting migrated project dates:`, conversionError);
                    return project; // Return original project as fallback
                  }
                });
                
                console.log(`[PROJECTS-API] Projects after migration: ${migratedProjects.length}`);
                
                // Use these projects if we found any
                if (migratedProjects.length > 0) {
                  console.log(`[PROJECTS-API] Using migrated projects`);
                  projects = migratedProjects;
                }
              }
            }
          }
        }
      }
      
      // Log details of projects found
      if (projects.length > 0) {
        // Log structure of first project for debugging (omitting large fields)
        const debugProject = { ...projects[0] };
        delete debugProject.settings; // Remove large fields for cleaner logs
        console.log(`[PROJECTS-API] First project structure:`, JSON.stringify(debugProject));
      }
      
      // Log the unsorted projects to debug
      if (projects.length > 0) {
        console.log(`[PROJECTS-API] Before sorting - Project sample:`, JSON.stringify({
          id: projects[0].id,
          updatedAt: projects[0].updatedAt,
          updatedAtType: typeof projects[0].updatedAt,
          hasUpdatedAt: 'updatedAt' in projects[0],
          status: projects[0].status,
        }));
      }
      
      try {
        // Apply sorting with error handling
        if (projects.length > 0) {
          // First check if projects have valid updatedAt fields
          const projectsWithDates = projects.map(project => {
            let validDate;
            try {
              // Try to convert to a JavaScript Date
              if (project.updatedAt instanceof Date) {
                validDate = project.updatedAt;
              } else if (typeof project.updatedAt === 'string') {
                validDate = new Date(project.updatedAt);
              } else if (project.updatedAt && typeof project.updatedAt === 'object' && 'toDate' in project.updatedAt) {
                // Handle Firestore Timestamp objects
                validDate = (project.updatedAt as { toDate(): Date }).toDate();
              } else {
                console.log(`[PROJECTS-API] Project ${project.id} has invalid updatedAt:`, project.updatedAt);
                // Use current date as fallback
                validDate = new Date();
              }
              return { ...project, _validDate: validDate };
            } catch (dateError) {
              console.error(`[PROJECTS-API] Error parsing date for project ${project.id}:`, dateError);
              // Use current date as fallback
              return { ...project, _validDate: new Date() };
            }
          });
          
          // Now sort using the validated dates
          projectsWithDates.sort((a, b) => {
            return b._validDate.getTime() - a._validDate.getTime(); // descending order
          });
          
          // Remove the temporary _validDate property
          projects = projectsWithDates.map(({ _validDate, ...rest }) => rest);
        }
        
        // Apply pagination
        projects = projects.slice(offset, offset + limit);
        
        console.log(`[PROJECTS-API] Found ${projects.length} projects after sorting and pagination (offset: ${offset}, limit: ${limit})`);
      } catch (sortError) {
        console.error('[PROJECTS-API] Error during sorting and pagination:', sortError);
        // Fallback: Just apply pagination without sorting in case of error
        projects = projects.slice(offset, offset + limit);
        console.log(`[PROJECTS-API] Fallback: applied pagination only, found ${projects.length} projects`);
      }
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