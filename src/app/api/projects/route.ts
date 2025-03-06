import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { PROJECT_COLLECTION, CreateProjectInput, DEFAULT_PROJECT_SETTINGS } from '@/lib/models/firestore/project';
import { getFirestore } from '@/lib/services/db-service';
import { FirestoreQueryOptions } from '@/lib/services/firestore-service';
import { authOptions } from '@/lib/auth';

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

    // Generate a unique bucket name
    const bucketName = generateBucketName(body.name, session.user.id);

    // Create project with default settings
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
        bucketName,
        region: body.region || 'us-central1',
        usedStorage: 0
      },
      metadata: body.metadata || {}
    };

    // Get Firestore service
    const firestoreService = await getFirestore(true); // Enable data preloading
    
    // Create project with optimized write
    const projectId = await firestoreService.create(
      PROJECT_COLLECTION, 
      projectData,
      { useBatch: true } // Use batch write for better atomicity
    );
    
    // Return the created project with ID
    return NextResponse.json({
      ...projectData,
      id: projectId
    });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
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
      
      // Generate mock project data
      const mockProjects = generateMockProjects(session.user.id, status, limit);
      
      return NextResponse.json({
        projects: mockProjects,
        debug: {
          ...debugInfo,
          projectsCount: mockProjects.length,
          mockDataUsed: true
        }
      });
    }
    
    // Try to get Firestore service - this may fail if credentials are missing
    let firestoreService;
    let mockDataUsed = false;
    try {
      console.log('Attempting to initialize Firestore service...');
      firestoreService = await getFirestore(true);
      console.log('Firestore service initialized successfully');
    } catch (firestoreInitError) {
      console.error('Failed to initialize Firestore service:', firestoreInitError);
      debugInfo.errors.push(`Firestore init error: ${firestoreInitError instanceof Error ? firestoreInitError.message : String(firestoreInitError)}`);
      
      // MODIFIED: Only use mock data fallback if not forcing real Firestore
      if (!forceRealFirestore) {
        console.log('Using mock data as fallback due to Firestore initialization failure');
        const mockProjects = generateMockProjects(session.user.id, status, limit);
        return NextResponse.json({
          projects: mockProjects,
          count: mockProjects.length,
          debug: {
            ...debugInfo,
            projectsCount: mockProjects.length,
            mockDataUsed: true
          }
        });
      } else {
        // If forcing real Firestore but it failed, return a proper error
        return NextResponse.json({
          error: 'Firestore connection required but failed',
          debug: debugInfo
        }, { status: 500 });
      }
    }
    
    // MODIFIED: Check if we got a mock service and are forcing real Firestore
    if (firestoreService.getMockData && forceRealFirestore) {
      return NextResponse.json({
        error: 'Received mock Firestore service but real Firestore is required',
        debug: {
          ...debugInfo,
          forceRealFirestore: true
        }
      }, { status: 500 });
    }
    
    // Check if we got a mock service with getMockData method
    if (firestoreService.getMockData && !forceRealFirestore) {
      console.log('Using mock data from FirestoreService fallback');
      const mockProjects = firestoreService.getMockData('projects', 20);
      mockDataUsed = true;
      
      return NextResponse.json({
        projects: mockProjects,
        count: mockProjects.length,
        debug: {
          ...debugInfo,
          projectsCount: mockProjects.length,
          mockDataUsed: true,
          source: 'firestore-service-fallback'
        }
      });
    }
    
    // Continue with normal query workflow if Firestore is initialized
    let userProjects = [];
    
    // Step 1: Try direct teamMembers query (using our composite index)
    try {
      console.log('Executing query with teamMembers filter...');
      userProjects = await firestoreService.queryDocuments(
        PROJECT_COLLECTION,
        (query) => {
          let q = query;
          // Apply status filter
          q = q.where('status', '==', status);
          // Apply team members filter
          q = q.where('teamMembers', 'array-contains', { userId: session.user.id });
          // Apply ordering
          q = q.orderBy('createdAt', 'desc');
          // Apply limit
          q = q.limit(50);
          return q;
        }
      );
      
      console.log(`Found ${userProjects.length} projects for user ${session.user.id} using direct query`);
    } 
    catch (directQueryError) {
      console.error('Direct team member query failed:', directQueryError);
      debugInfo.errors.push(`Team member query error: ${directQueryError instanceof Error ? directQueryError.message : String(directQueryError)}`);
      
      // Step 2: Fallback to simpler query using just status and createdAt
      try {
        console.log('Falling back to simple status query...');
        const allProjects = await firestoreService.queryDocuments(
          PROJECT_COLLECTION,
          (query) => {
            let q = query;
            // Apply status filter
            q = q.where('status', '==', status);
            // Apply ordering
            q = q.orderBy('createdAt', 'desc');
            // Apply limit
            q = q.limit(100);
            return q;
          }
        );
        
        console.log(`Found ${allProjects.length} total projects with status ${status}`);
        
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
      } 
      catch (simpleQueryError) {
        console.error('Simple query also failed:', simpleQueryError);
        debugInfo.errors.push(`Simple query error: ${simpleQueryError instanceof Error ? simpleQueryError.message : String(simpleQueryError)}`);
        
        // Use mock data as a last resort in development
        if (process.env.NODE_ENV === 'development') {
          userProjects = generateMockProjects(session.user.id, status, limit);
          debugInfo.usedMockData = true;
          console.log(`Using ${userProjects.length} mock projects as fallback`);
        } else {
          throw simpleQueryError; // In production, propagate the error
        }
      }
    }
    
    // Return the projects with debug information
    return NextResponse.json({
      projects: userProjects,
      debug: {
        ...debugInfo,
        projectsCount: userProjects.length
      }
    });
    
  } catch (error) {
    console.error('Project fetch error:', error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        details: error instanceof Error ? error.stack : undefined
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