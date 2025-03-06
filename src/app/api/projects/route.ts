import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { PROJECT_COLLECTION, CreateProjectInput, DEFAULT_PROJECT_SETTINGS } from '@/lib/models/firestore/project';
import { getFirestore } from '@/lib/services/db-service';
import { FirestoreQueryOptions } from '@/lib/services/firestore-service';
import { authOptions } from '@/lib/auth';
import { initializeStorage, createProjectBucket, setupBucketLifecycle } from '@/lib/gcp/storage';

// Helper function to generate a unique bucket name
function generateBucketName(projectName: string, userId: string): string {
  const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `synoptic-${sanitizedName}-${timestamp}-${randomStr}`;
}

// Utility function to resolve the service account path
function resolveServiceAccountPath(): string | null {
  try {
    const path = require('path');
    const fs = require('fs');
    
    // Check the current working directory
    console.log('[PROJECTS-API] Current working directory:', process.cwd());
    
    // Try multiple potential locations
    const potentialPaths = [
      // Relative paths
      './credentials/firebase-service-account.json',
      'credentials/firebase-service-account.json',
      // Absolute paths
      path.join(process.cwd(), 'credentials', 'firebase-service-account.json'),
      path.resolve('credentials', 'firebase-service-account.json')
    ];
    
    console.log('[PROJECTS-API] Checking potential service account paths:');
    for (const potentialPath of potentialPaths) {
      try {
        const absolutePath = path.isAbsolute(potentialPath) ? 
          potentialPath : path.resolve(process.cwd(), potentialPath);
          
        const exists = fs.existsSync(absolutePath);
        console.log(`- ${potentialPath} -> ${absolutePath}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
        
        if (exists) {
          return absolutePath;
        }
      } catch (err) {
        console.warn(`Error checking path ${potentialPath}:`, err);
      }
    }
    
    return null;
  } catch (error) {
    console.error('[PROJECTS-API] Error resolving service account path:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: "Project name and description are required" },
        { status: 400 }
      );
    }

    console.log('[PROJECTS-API] Creating project:', body.name);
    
    // Check if we should use mock mode (for testing/development without GCP)
    const useMockMode = process.env.MOCK_GCP_STORAGE === 'true';
    
    if (!useMockMode) {
      // Initialize storage service
      try {
        await initializeStorage();
        console.log('[PROJECTS-API] GCP Storage initialized successfully');
      } catch (error) {
        console.error('[PROJECTS-API] Failed to initialize GCP Storage:', error);
        
        // Use mock mode if explicitly allowed when GCP fails
        if (process.env.ALLOW_MOCK_FALLBACK !== 'true') {
          return NextResponse.json(
            { 
              error: 'Failed to initialize storage service',
              details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
          );
        } else {
          console.log('[PROJECTS-API] Falling back to mock mode due to GCP initialization failure');
        }
      }
    } else {
      console.log('[PROJECTS-API] Using mock GCP mode - will not create actual storage buckets');
    }
    
    // Create a draft project with a temporary ID to get the project ID
    const firestoreService = await getFirestore(true);
    
    // Add a timestamp to the draft status for debugging
    const draftProjectId = await firestoreService.create(
      PROJECT_COLLECTION, 
      {
        name: body.name,
        description: body.description,
        customerId: body.customerId || session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        draftCreatedAt: new Date().toISOString(),
        teamMembers: [
          {
            userId: session.user.id,
            role: 'owner',
            addedAt: new Date()
          }
        ]
      }
    );
    
    console.log(`[PROJECTS-API] Created draft project with ID: ${draftProjectId}`);
    
    // Placeholder for the bucket information
    let bucketInfo = {
      bucketName: '',
      region: body.region || 'us-central1',
      bucketUri: '',
      isMock: useMockMode
    };
    
    // Create the actual GCP storage bucket
    if (!useMockMode) {
      try {
        console.log('[PROJECTS-API] Creating GCP storage bucket for project');
        
        const bucketResult = await createProjectBucket({
          projectId: draftProjectId,
          customerId: body.customerId || session.user.id,
          region: body.region || 'us-central1',
          storageClass: 'STANDARD'
        });
        
        console.log(`[PROJECTS-API] Created GCP bucket: ${bucketResult.name} in region ${bucketResult.region}`);
        
        // Store the bucket information
        bucketInfo = {
          bucketName: bucketResult.name,
          region: bucketResult.region,
          bucketUri: bucketResult.uri,
          isMock: false
        };
        
        // Set up bucket lifecycle rules based on data retention settings
        const dataRetentionDays = body.settings?.dataRetentionDays || DEFAULT_PROJECT_SETTINGS.dataRetentionDays;
        await setupBucketLifecycle(bucketResult.name, [
          {
            action: { type: 'Delete' },
            condition: { age: dataRetentionDays }
          }
        ]);
        
        console.log(`[PROJECTS-API] Set up bucket lifecycle rules with ${dataRetentionDays} day retention`);
      } catch (error) {
        console.error('[PROJECTS-API] Failed to create GCP storage bucket:', error);
        
        // Don't delete the draft project if fallback is allowed
        if (process.env.ALLOW_MOCK_FALLBACK !== 'true') {
          // Clean up the draft project entry
          await firestoreService.delete(PROJECT_COLLECTION, draftProjectId);
          
          return NextResponse.json(
            { 
              error: 'Failed to create storage bucket for project',
              details: error instanceof Error ? error.message : String(error),
              code: error.code || 500
            },
            { status: 500 }
          );
        } else {
          // Use a mock bucket name instead
          console.log('[PROJECTS-API] Falling back to mock bucket due to GCP bucket creation failure');
          bucketInfo = {
            bucketName: `mock-bucket-${draftProjectId.toLowerCase()}`,
            region: body.region || 'us-central1',
            bucketUri: `gs://mock-bucket-${draftProjectId.toLowerCase()}`,
            isMock: true
          };
        }
      }
    } else {
      // For mock mode, create a mock bucket name
      bucketInfo = {
        bucketName: `mock-bucket-${draftProjectId.toLowerCase()}`,
        region: body.region || 'us-central1',
        bucketUri: `gs://mock-bucket-${draftProjectId.toLowerCase()}`,
        isMock: true
      };
    }

    // Update the project with the bucket information
    const projectData = {
      name: body.name,
      description: body.description,
      customerId: body.customerId || session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: body.settings || DEFAULT_PROJECT_SETTINGS,
      teamMembers: [
        {
          userId: session.user.id,
          role: 'owner',
          addedAt: new Date()
        }
      ],
      status: 'active',
      storage: {
        bucketName: bucketInfo.bucketName,
        region: bucketInfo.region,
        bucketUri: bucketInfo.bucketUri,
        usedStorage: 0,
        isMock: bucketInfo.isMock
      },
      metadata: {
        ...(body.metadata || {}),
        bucketCreationCompleted: new Date().toISOString(),
        usedMockBucket: bucketInfo.isMock
      }
    };

    // Update the project with the real bucket information
    await firestoreService.update(
      PROJECT_COLLECTION,
      draftProjectId,
      projectData
    );
    
    console.log(`[PROJECTS-API] Updated project ${draftProjectId} with bucket information`);
    
    // Return the created project with ID
    return NextResponse.json({
      ...projectData,
      id: draftProjectId
    });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : String(error),
        code: error.code || 500
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Starting projects fetch...');
    
    // DIAGNOSTIC: Show all environment variables related to Firebase
    console.log('[PROJECTS-API] Environment variables check:');
    Object.keys(process.env)
      .filter(key => key.includes('FIREBASE') || key.includes('GOOGLE') || key.includes('MOCK') || key.includes('FORCE'))
      .forEach(key => {
        const value = process.env[key];
        if (key.toLowerCase().includes('key')) {
          console.log(`- ${key}: [PRESENT] (${value ? value.length : 0} characters)`);
        } else {
          console.log(`- ${key}: ${value || '[NOT SET]'}`);
        }
      });
      
    // Get the session using authOptions
    console.log('Calling getServerSession with authOptions...');
    const session = await getServerSession(authOptions);
    console.log('GetServerSession returned:', session ? 'Session object exists' : 'No session returned');
    
    // Detailed session structure logging
    if (session) {
      console.log('Session full structure:', JSON.stringify(session, null, 2));
      console.log('Session.user keys:', session.user ? Object.keys(session.user) : 'No user object');
      
      if (session.user) {
        // Log values with partial masking for sensitive data
        const userEmail = session.user.email ? 
          `${session.user.email.substring(0, 3)}...${session.user.email.substring(session.user.email.indexOf('@'))}` : 
          'undefined';
        
        console.log('User details found:', {
          id: session.user.id || 'undefined',
          email: userEmail,
          name: session.user.name ? `${session.user.name.substring(0, 3)}...` : 'undefined',
          company: session.user.company ? `${session.user.company.substring(0, 3)}...` : 'undefined'
        });
      }
    }
    
    if (!session?.user) {
      console.log('No session found, returning unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Session found for user:', session.user.email, 'ID:', session.user.id);

    // Check if user ID is defined with more logging
    if (!session.user.id) {
      console.log('User ID is undefined in session', {
        userObject: session.user ? JSON.stringify(session.user) : 'null',
        userObjectType: session.user ? typeof session.user : 'null',
        sessionType: typeof session
      });
      
      return NextResponse.json({ 
        error: 'Authentication error: User ID not found in session',
        debug: {
          sessionUser: session.user ? {
            ...session.user,
            // Don't log sensitive info
            email: session.user.email ? `${session.user.email.substring(0, 3)}...` : undefined
          } : null,
          userIdType: session.user?.id ? typeof session.user.id : 'undefined',
          sessionKeys: Object.keys(session),
          userKeys: session.user ? Object.keys(session.user) : [],
        }
      }, { status: 401 });
    }

    // Extract query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'active';
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;

    // Initialize debug info to track what happens
    const debugInfo = {
      userId: session.user.id,
      userEmail: session.user.email,
      environment: process.env.NODE_ENV,
      firebaseCredentialsFound: false,
      errors: [],
      usedMockData: false,
      timestamp: new Date().toISOString()
    };

    // ENHANCED: Ensure service account path is properly set
    const forceRealFirestore = process.env.FORCE_REAL_FIRESTORE === 'true';
    
    // If Google Application Credentials is not set, try to find and set it
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('[PROJECTS-API] GOOGLE_APPLICATION_CREDENTIALS is not set, attempting to find service account file');
      
      const serviceAccountPath = resolveServiceAccountPath();
      
      if (serviceAccountPath) {
        console.log(`[PROJECTS-API] Found service account file at: ${serviceAccountPath}`);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
        console.log(`[PROJECTS-API] Set GOOGLE_APPLICATION_CREDENTIALS to: ${serviceAccountPath}`);
      } else {
        console.error('[PROJECTS-API] Could not find service account file in any standard location');
        debugInfo.errors.push('Could not find service account file in any standard location');
      }
    } else {
      console.log(`[PROJECTS-API] GOOGLE_APPLICATION_CREDENTIALS is already set to: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    }
    
    // Validate Firebase credentials
    try {
      const { validateFirebaseCredentials } = await import('@/lib/gcp/firestore/initFirestore');
      debugInfo.firebaseCredentialsFound = validateFirebaseCredentials();
      console.log(`[PROJECTS-API] validateFirebaseCredentials() returned: ${debugInfo.firebaseCredentialsFound}`);
    } catch (validationError) {
      console.error('[PROJECTS-API] Error validating Firebase credentials:', validationError);
      debugInfo.errors.push(`Credential validation error: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
    }

    // MODIFIED: Only use mock data if specifically not forcing real Firestore
    if (!debugInfo.firebaseCredentialsFound && !forceRealFirestore && process.env.NODE_ENV === 'development') {
      console.log('[PROJECTS-API] Firebase credentials not found and not forcing real Firestore. Using mock data for development.');
      debugInfo.usedMockData = true;
      
      // ENHANCED: Generate mock projects with consistent IDs based on user ID
      const mockProjects = generateMockProjects(session.user.id, status);
      
      // Return mock projects
      return NextResponse.json({
        projects: mockProjects, 
        count: mockProjects.length,
        debug: debugInfo
      });
    }

    console.log('[PROJECTS-API] Attempting to use real Firestore for projects');
    
    // Initialize Firestore connection
    const firestoreService = await getFirestore();
    await firestoreService.init();
    
    console.log('[PROJECTS-API] Firestore initialized');
    
    // Get user projects 
    let userProjects = [];
    
    console.log('👤 User ID for query:', session.user.id);
    
    // Define the fallback strategy as a function
    const fallbackLoop = async (): Promise<boolean> => {
      // Fallback 1: Try dot notation approach first (should work now with index)
      try {
        console.log('[FALLBACK-1] Trying teamMembers.userId query (should work with index)');
        const dotNotationQuery = {
          where: [["teamMembers.userId", "==", session.user.id]],
          orderBy: [{ field: "createdAt", direction: "desc" }],
          limit
        };
        
        userProjects = await firestoreService.query(PROJECT_COLLECTION, dotNotationQuery);
        console.log(`[FALLBACK-1] Found ${userProjects.length} projects with dot notation query`);
        
        if (userProjects.length > 0) {
          debugInfo.usedQuery = 'fallback-dot-notation';
          return true; // Success
        }
      } catch (fallback1Error) {
        // Only show detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('[FALLBACK-1] Error with dot notation query:', fallback1Error);
        } else {
          console.error('[FALLBACK-1] Error with dot notation query');
        }
        debugInfo.errors.push(`Fallback 1 error: ${fallback1Error instanceof Error ? fallback1Error.message : String(fallback1Error)}`);
      }
      
      // Fallback 2: Try simplified teamMembers array-contains query
      try {
        console.log('[FALLBACK-2] Trying simplified teamMembers query');
        const simplifiedTeamQuery = {
          where: [["teamMembers", "array-contains", { userId: session.user.id }]],
          orderBy: [{ field: "createdAt", direction: "desc" }],
          limit
        };
        
        userProjects = await firestoreService.query(PROJECT_COLLECTION, simplifiedTeamQuery);
        console.log(`[FALLBACK-2] Found ${userProjects.length} projects with simplified team query`);
        
        if (userProjects.length > 0) {
          debugInfo.usedQuery = 'fallback-simplified-team';
          return true; // Success
        }
      } catch (fallback2Error) {
        // Only show detailed errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('[FALLBACK-2] Error with simplified team query:', fallback2Error);
        } else {
          console.error('[FALLBACK-2] Error with simplified team query');
        }
        debugInfo.errors.push(`Fallback 2 error: ${fallback2Error instanceof Error ? fallback2Error.message : String(fallback2Error)}`);
      }
      
      // Fallback 3: Original status query with client-side filtering
      try {
        console.log('[FALLBACK-3] Using original status query');
        const statusQuery = {
          where: [["status", "==", "active"]],
          orderBy: [{ field: "createdAt", direction: "desc" }],
          limit: limit * 2 // Get more to allow for filtering
        };
        
        const allProjects = await firestoreService.query(PROJECT_COLLECTION, statusQuery);
        console.log(`Found ${allProjects.length} total projects with status active`);
        
        // Filter client-side for the user's projects
        userProjects = allProjects.filter(project => {
          if (!project.teamMembers || !Array.isArray(project.teamMembers)) {
            return false;
          }
          
          return project.teamMembers.some(member => 
            member && 
            typeof member === 'object' && 
            member.userId === session.user.id
          );
        });
        
        console.log(`After filtering, found ${userProjects.length} projects for user ${session.user.id}`);
        debugInfo.usedQuery = 'fallback-status-client-filter';
        
        if (userProjects.length > 0) {
          return true; // Success
        }
      } catch (fallback3Error) {
        console.error('[FALLBACK-3] Error with status query:', fallback3Error);
        debugInfo.errors.push(`Fallback 3 error: ${fallback3Error instanceof Error ? fallback3Error.message : String(fallback3Error)}`);
      }
      
      // Fallback 4: Raw Firestore query
      try {
        console.log('[FALLBACK-4] Using raw Firestore query');
        
        // Use the direct queryDocuments method which takes a query builder function
        const rawProjects = await firestoreService.queryDocuments(PROJECT_COLLECTION, (collectionRef) => {
          // Build the query manually
          return collectionRef
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(limit * 2);
        });
        
        console.log(`[FALLBACK-4] Found ${rawProjects.length} projects with raw query`);
        
        // Filter client-side for the user's projects
        userProjects = rawProjects.filter(project => {
          if (!project.teamMembers || !Array.isArray(project.teamMembers)) {
            return false;
          }
          
          return project.teamMembers.some(member => 
            member && 
            typeof member === 'object' && 
            member.userId === session.user.id
          );
        });
        
        console.log(`[FALLBACK-4] After filtering, found ${userProjects.length} projects for user ${session.user.id}`);
        debugInfo.usedQuery = 'fallback-raw-query';
        
        if (userProjects.length > 0) {
          return true; // Success
        }
      } catch (fallback4Error) {
        console.error('[FALLBACK-4] Error with raw query:', fallback4Error);
        debugInfo.errors.push(`Fallback 4 error: ${fallback4Error instanceof Error ? fallback4Error.message : String(fallback4Error)}`);
      }
      
      return false; // All fallbacks failed
    };
    
    // For now, stick with the original query format but be ready to switch
    const userTeamQuery = process.env.USE_ALT_QUERY_FORMAT === 'true' || process.env.NODE_ENV === 'production'
      ? {
          // Alternative query format using dot notation - should work now that index is created
          where: [["teamMembers.userId", "==", session.user.id]],
          orderBy: [{ field: "createdAt", direction: "desc" }],
          limit
        }
      : {
          // Original query format - Fixed to work with Firestore array-contains
          // When using array-contains with objects, we must match the EXACT object structure
          // So we should include all fields that we expect to match
          where: [
            ["teamMembers", "array-contains", { 
              userId: session.user.id,
              // We don't include role now to make it more flexible
            }]
          ],
          orderBy: [{ field: "createdAt", direction: "desc" }],
          limit
        };
    
    // Try direct query first
    try {
      console.log('[PROJECTS-API] Querying projects with team member filter');
      
      // Only do diagnostic logging in development
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_QUERIES === 'true') {
        // 🔍 DIAGNOSTIC: Try to fetch a single project to examine structure
        try {
          const simpleQuery = {
            limit: 1,
            orderBy: [{ field: "createdAt", direction: "desc" }]
          };
          
          console.log('[DIAGNOSTIC] Fetching a sample project to examine structure');
          const sampleProjects = await firestoreService.query(PROJECT_COLLECTION, simpleQuery);
          
          if (sampleProjects.length > 0) {
            console.log('[DIAGNOSTIC] Sample project structure:');
            console.log(JSON.stringify({
              id: sampleProjects[0].id,
              hasTeamMembers: !!sampleProjects[0].teamMembers,
              teamMembersType: sampleProjects[0].teamMembers ? typeof sampleProjects[0].teamMembers : 'undefined',
              isArray: Array.isArray(sampleProjects[0].teamMembers),
              teamMembersPreview: Array.isArray(sampleProjects[0].teamMembers) 
                ? sampleProjects[0].teamMembers.slice(0, 2) 
                : sampleProjects[0].teamMembers,
              fields: Object.keys(sampleProjects[0])
            }, null, 2));
          } else {
            console.log('[DIAGNOSTIC] No sample projects found.');
          }
        } catch (sampleError) {
          console.error('[DIAGNOSTIC] Error fetching sample project:', sampleError);
        }
      }
      
      // Continue with original query
      userProjects = await firestoreService.query(PROJECT_COLLECTION, userTeamQuery);
      console.log(`[PROJECTS-API] Found ${userProjects.length} projects through direct team member query`);
      
      // If we didn't find any projects with the direct query, try the fallback approaches
      if (userProjects.length === 0) {
        console.log('No projects found with direct query, trying fallback approaches...');
        
        // First, do a direct query for all projects to see what's actually in the database
        try {
          console.log('[DIAGNOSTIC] Checking what projects exist in the database');
          const allProjectsQuery = {
            limit: 10
          };
          
          const allProjects = await firestoreService.query(PROJECT_COLLECTION, allProjectsQuery);
          console.log(`[DIAGNOSTIC] Found ${allProjects.length} total projects in database`);
          
          if (allProjects.length > 0) {
            // Log the first project structure to help debug
            const sampleProject = allProjects[0];
            console.log('[DIAGNOSTIC] Sample project structure:', JSON.stringify({
              id: sampleProject.id,
              name: sampleProject.name,
              hasTeamMembers: !!sampleProject.teamMembers,
              teamMembersType: sampleProject.teamMembers ? typeof sampleProject.teamMembers : 'undefined',
              isArray: Array.isArray(sampleProject.teamMembers),
              teamMembersPreview: Array.isArray(sampleProject.teamMembers) 
                ? sampleProject.teamMembers
                : sampleProject.teamMembers,
              fields: Object.keys(sampleProject)
            }, null, 2));
          }
        } catch (diagError) {
          console.error('[DIAGNOSTIC] Error checking all projects:', diagError);
        }
        
        // Step 2: Fallback query mechanism using multiple attempts
        const fallbackSuccess = await fallbackLoop();
        
        if (fallbackSuccess) {
          console.log('[PROJECTS-API] Successfully found projects using fallback mechanisms');
        } else {
          console.log('[PROJECTS-API] All fallback approaches failed to find projects');
        }
      }
    } 
    catch (directQueryError) {
      console.error('Direct team member query failed:', directQueryError);
      debugInfo.errors.push(`Team member query error: ${directQueryError instanceof Error ? directQueryError.message : String(directQueryError)}`);
      
      // Step 2: Fallback query mechanism using multiple attempts
      const fallbackSuccess = await fallbackLoop();
      
      if (fallbackSuccess) {
        console.log('[PROJECTS-API] Successfully found projects using fallback mechanisms');
      } else {
        console.log('[PROJECTS-API] All fallback approaches failed to find projects');
      }
    }
    
    // Final fallback - just return some mock data if we couldn't get real data
    if (userProjects.length === 0 && process.env.NODE_ENV === 'development') {
      console.log('No projects found, using mock projects for development');
      userProjects = generateMockProjects(session.user.id, status);
      debugInfo.usedMockData = true;
    }
    
    // Format the projects to match the expected type
    const projects = userProjects.map(project => {
      // Ensure dates are serialized properly
      const formatDate = (date: any) => {
        if (!date) return undefined;
        if (date instanceof Date) return date.toISOString();
        if (typeof date === 'object' && date.toDate) return date.toDate().toISOString();
        return String(date);
      };
      
      return {
        id: project.id,
        name: project.name || 'Untitled Project',
        description: project.description || '',
        status: project.status || 'active',
        createdAt: formatDate(project.createdAt) || new Date().toISOString(),
        updatedAt: formatDate(project.updatedAt),
        storage: project.storage || {},
        settings: project.settings || {},
        teamMembers: project.teamMembers || [],
        metadata: project.metadata || {}
      };
    });
    
    console.log(`[PROJECTS-API] Returning ${projects.length} projects`);
    
    return NextResponse.json({ 
      projects, 
      count: projects.length,
      debug: debugInfo
    });
  } catch (error) {
    console.error('Projects fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Generate mock projects for development when Firestore is unavailable
 */
function generateMockProjects(userId: string, status = 'active', count = 5) {
  console.log(`Generating ${count} mock projects for user ${userId} with status ${status}`);
  
  const statuses = ['active', 'completed', 'archived'];
  const mockProjects = [];
  
  for (let i = 0; i < count; i++) {
    // Use the requested status or pick randomly if it's not valid
    const projectStatus = statuses.includes(status) ? status : statuses[i % statuses.length];
    
    mockProjects.push({
      id: `mock-project-${i + 1}`,
      name: `Mock Project ${i + 1}`,
      description: `This is a mock project created for development purposes when Firestore is unavailable.`,
      status: projectStatus,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(), // Each a day apart
      updatedAt: new Date(Date.now() - i * 43200000).toISOString(), // Each half a day apart
      // Add settings property that matches our model
      settings: {
        dataRetentionDays: 30 + (i * 15), // Different retention periods
        maxStorageGB: 50 + (i * 10)      // Different storage sizes
      },
      // Add storage configuration
      storageConfig: {
        bucketName: `mock-bucket-${i + 1}`,
        region: 'us-central1'
      },
      teamMembers: [
        {
          userId: userId,
          role: 'owner',
          addedAt: new Date(Date.now() - i * 86400000).toISOString()
        },
        {
          userId: `mock-user-${i + 1}`,
          role: 'member',
          addedAt: new Date(Date.now() - i * 86400000 + 3600000).toISOString()
        }
      ],
      // Add metadata for completeness
      metadata: {
        mockData: true,
        sampleId: `sample-${i + 1}`,
        createdInDevMode: true
      }
    });
  }
  
  return mockProjects;
} 