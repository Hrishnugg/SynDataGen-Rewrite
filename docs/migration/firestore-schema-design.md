# Firestore Schema Design

## Design Principles

The Firestore schema design follows these key principles:

1. **Optimize for query patterns**: Structure data to minimize the number of reads
2. **Denormalize where appropriate**: Duplicate data to reduce query complexity
3. **Respect document limits**: Keep documents under Firestore's 1MB limit
4. **Plan for scaling**: Design collections to accommodate growth
5. **Security-first approach**: Consider security rules during schema design

## Collection Structure

### Users Collection

```typescript
// Collection: 'users'
interface User {
  id: string;            // Document ID matches Auth user ID
  name: string;          // User's full name
  email: string;         // User's email address (indexed)
  company: string;       // Company name
  createdAt: Timestamp;  // Account creation timestamp
  updatedAt: Timestamp;  // Last update timestamp
  
  // New fields for GCP integration
  gcpConfig?: {
    serviceAccountEmail?: string;   // Service account email
    serviceAccountKeyRef?: string;  // Reference to key in Secret Manager
  };
  
  // Extended profile information
  profile?: {
    jobTitle?: string;    // User job title
    phoneNumber?: string; // Optional contact phone
    timezone?: string;    // User timezone
    profilePicUrl?: string; // Profile picture URL
  };
  
  // System access configuration
  settings: {
    notifications: boolean;       // Enable/disable notifications
    defaultProjectId?: string;    // Default project to load
  };
  
  // Aggregated summary data for quick access
  projectCount: number;           // Count of owned projects
  memberProjectCount: number;     // Count of projects where user is a member
}
```

### Projects Collection

```typescript
// Collection: 'projects'
interface Project {
  id: string;                    // Document ID
  name: string;                  // Project name (indexed)
  description: string;           // Project description
  ownerId: string;               // Owner user ID (indexed)
  createdAt: Timestamp;          // Creation timestamp
  updatedAt: Timestamp;          // Last update timestamp
  status: 'active' | 'archived' | 'deleted'; // Project status (indexed)
  
  // GCP-specific configuration
  storage: {
    bucketName: string;          // GCP bucket name
    region: string;              // Bucket region
    usedStorage: number;         // Current storage usage in bytes
  };
  
  // Consolidated team members data
  // Team members are also stored in a subcollection for detailed queries
  teamMembersSummary: {
    count: number;               // Total team members count
    lastUpdated: Timestamp;      // Last membership change
  };
  
  // Project configuration
  settings: {
    dataRetentionDays: number;   // Data retention period
    maxStorageGB: number;        // Storage limit in GB
    privacyLevel: 'private' | 'team' | 'public'; // Access level
  };
  
  // Metadata for filtering and organization
  tags: string[];                // Project tags for filtering
  categories: string[];          // Project categories
  
  // Stats for dashboard display
  stats: {
    totalJobs: number;           // Total jobs count
    completedJobs: number;       // Completed jobs count
    failedJobs: number;          // Failed jobs count
    lastJobDate: Timestamp;      // Last job timestamp
  };
}
```

### Project Team Members Subcollection

```typescript
// Subcollection: 'projects/{projectId}/teamMembers'
interface TeamMember {
  id: string;                    // Document ID (matches user ID)
  userId: string;                // User ID (redundant but useful for queries)
  role: 'owner' | 'admin' | 'member' | 'viewer'; // User role
  addedAt: Timestamp;            // When user was added
  addedBy: string;               // User ID who added this member
  email: string;                 // Denormalized email for display
  name: string;                  // Denormalized name for display
  lastActivity: Timestamp;       // Last activity timestamp
}
```

### Data Generation Jobs Collection

```typescript
// Collection: 'jobs'
interface DataGenerationJob {
  id: string;                    // Document ID
  projectId: string;             // Parent project ID (indexed)
  customerId: string;            // Customer ID (indexed)
  name: string;                  // Job name
  description: string;           // Job description
  createdAt: Timestamp;          // Creation timestamp
  createdBy: string;             // User ID who created the job
  
  // Current status tracking
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'; // Job status (indexed)
  gcpJobId: string;              // GCP job identifier
  
  // Job configuration
  config: {
    inputDataset?: {
      storageUri?: string;       // URI to input data
      format?: string;           // Data format
    };
    parameters: {
      dataType: string;          // Type of data to generate
      recordCount: number;       // Records to generate
      format: 'csv' | 'json' | 'parquet'; // Output format
      quality: 'draft' | 'production';    // Data quality
      schema: object;            // Data schema specification
    };
    outputConfig: {
      destination: string;       // Output destination path
    };
  };
  
  // Progress tracking
  progress: {
    percentComplete: number;     // Completion percentage
    startTime?: Timestamp;       // Job start time
    endTime?: Timestamp;         // Job end time
    error?: {                    // Error information if failed
      code: string;
      message: string;
    };
  };
  
  // Result summary
  results?: {
    recordsGenerated: number;    // Total records generated
    fileSize: number;            // Output file size
    outputUri: string;           // Output file location
  };
}
```

### Job Logs Subcollection

```typescript
// Subcollection: 'jobs/{jobId}/logs'
interface JobLog {
  id: string;                    // Document ID (timestamp-based)
  timestamp: Timestamp;          // Log timestamp
  level: 'INFO' | 'WARNING' | 'ERROR'; // Log level
  message: string;               // Log message
  metadata?: Record<string, any>; // Additional log metadata
}
```

### Waitlist Collection

```typescript
// Collection: 'waitlist'
interface WaitlistSubmission {
  id: string;                    // Document ID
  email: string;                 // Contact email (indexed)
  name: string;                  // Full name
  company: string;               // Company name
  industry: string;              // Industry sector
  dataVolume: string;            // Expected data volume
  useCase: string;               // Use case description
  createdAt: Timestamp;          // Submission timestamp
  status: 'pending' | 'approved' | 'rejected'; // Status (indexed)
  notes?: string;                // Admin notes
  ipAddress?: string;            // Submission IP address
  approvedAt?: Timestamp;        // When approved/rejected
  approvedBy?: string;           // Admin who processed
}
```

## Indexes and Query Optimization

### Required Indexes

1. **Users Collection**
   - `email` (for authentication lookups)

2. **Projects Collection**
   - `ownerId` (for finding user's projects)
   - `status` (for filtering by status)
   - Composite: `ownerId, status` (for common dashboard queries)

3. **TeamMembers Subcollection**
   - `userId` (for finding projects where user is a member)
   - `role` (for permission filtering)
   - Composite: `userId, role` (for permission-based queries)

4. **Jobs Collection**
   - `projectId` (for finding jobs in a project)
   - `status` (for filtering by status)
   - `customerId` (for admin queries)
   - Composite: `projectId, status` (for filtered project job queries)
   - Composite: `projectId, createdAt` (for chronological job listing)

5. **Waitlist Collection**
   - `email` (for duplicate checking)
   - `status` (for filtering by status)
   - `createdAt` (for chronological listing)

## Query Pattern Optimization

### Common Query Patterns

1. **Get User Profile**
   ```typescript
   const userRef = doc(db, 'users', userId);
   const userSnap = await getDoc(userRef);
   ```

2. **List User's Projects**
   ```typescript
   const projectsQuery = query(
     collection(db, 'projects'),
     where('ownerId', '==', userId),
     where('status', '!=', 'deleted')
   );
   const projectsSnap = await getDocs(projectsQuery);
   ```

3. **Get Projects Where User is a Member**
   ```typescript
   // Using collection group query
   const teamMemberQuery = query(
     collectionGroup(db, 'teamMembers'),
     where('userId', '==', userId)
   );
   const teamMemberSnap = await getDocs(teamMemberQuery);
   // Then fetch project details for each
   ```

4. **List Jobs for a Project**
   ```typescript
   const jobsQuery = query(
     collection(db, 'jobs'),
     where('projectId', '==', projectId),
     orderBy('createdAt', 'desc')
   );
   const jobsSnap = await getDocs(jobsQuery);
   ```

## Denormalization Strategy

To minimize reads, we will denormalize certain data:

1. **User Information in Team Members**
   - Store user email and name in team member documents to avoid extra reads when displaying team lists

2. **Project Summary in User Document**
   - Store counts of projects rather than querying every time

3. **Team Member Summary in Project**
   - Store count of team members for quick access without reading the entire subcollection

## Security Rules Strategy

### Basic Security Rules Structure

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can read their own profile
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Project access rules
    match /projects/{projectId} {
      // Functions to check ownership and membership
      function isOwner() {
        return request.auth.uid == resource.data.ownerId;
      }
      
      function isMember() {
        return exists(/databases/$(database)/documents/projects/$(projectId)/teamMembers/$(request.auth.uid));
      }
      
      // Owner can do anything
      allow read, write: if isOwner();
      
      // Members can read
      allow read: if isMember();
      
      // Team members subcollection
      match /teamMembers/{memberId} {
        allow read: if isOwner() || isMember();
        allow write: if isOwner();
      }
    }
    
    // Jobs access rules
    match /jobs/{jobId} {
      function canAccessProject() {
        let projectId = resource.data.projectId;
        let projectDoc = get(/databases/$(database)/documents/projects/$(projectId));
        return projectDoc.data.ownerId == request.auth.uid || 
               exists(/databases/$(database)/documents/projects/$(projectId)/teamMembers/$(request.auth.uid));
      }
      
      allow read: if canAccessProject();
      allow create: if canAccessProject();
      allow update: if canAccessProject();
      allow delete: if canAccessProject();
      
      // Logs subcollection
      match /logs/{logId} {
        allow read: if canAccessProject();
      }
    }
    
    // Admin-only waitlist access
    match /waitlist/{submissionId} {
      // Only allow admin access (implemented via custom claims)
      allow read, write: if request.auth.token.admin == true;
      // Allow creation by anyone (for signing up)
      allow create: if true;
    }
  }
}
```

## Transaction and Batch Write Patterns

For operations that need to update multiple documents, we'll use transactions or batch writes:

1. **Adding a Team Member**
   ```typescript
   // Transaction to add team member and update project summary
   const teamMemberRef = doc(db, `projects/${projectId}/teamMembers/${userId}`);
   const projectRef = doc(db, 'projects', projectId);
   
   await runTransaction(db, async (transaction) => {
     const projectDoc = await transaction.get(projectRef);
     
     // Update team member count
     const currentCount = projectDoc.data().teamMembersSummary.count;
     
     transaction.set(teamMemberRef, teamMemberData);
     transaction.update(projectRef, {
       'teamMembersSummary.count': currentCount + 1,
       'teamMembersSummary.lastUpdated': serverTimestamp()
     });
   });
   ```

2. **Deleting a Project**
   ```typescript
   // Batch write to mark project as deleted and update user's project count
   const batch = writeBatch(db);
   
   batch.update(projectRef, {
     status: 'deleted',
     updatedAt: serverTimestamp()
   });
   
   batch.update(userRef, {
     projectCount: increment(-1)
   });
   
   await batch.commit();
   ```

## Migration Path

The migration from MongoDB to Firestore will follow these steps for each collection:

1. Export MongoDB data to temporary storage
2. Transform data to match new Firestore schema
3. Import data into Firestore in batches
4. Validate data integrity
5. Update application code to use Firestore
6. Switch over to Firestore when validation is complete

## Document Size Constraints

For collections that might approach the 1MB limit:

1. **Job Logs**: Use a subcollection instead of arrays
2. **Project Team Members**: Use a subcollection instead of arrays
3. **Large Metadata**: Consider splitting into separate documents if needed

## Cost Optimization Considerations

1. **Read Efficiency**: Denormalize to minimize reads
2. **Index Optimization**: Only create necessary indexes
3. **Batch Operations**: Use batched reads/writes for efficiency
4. **Careful Querying**: Avoid collection scans and inefficient queries
5. **Document Size**: Keep documents lean to reduce bandwidth costs
