# MongoDB Data Structure Assessment

## Collections Overview

Based on the codebase analysis, the following collections are currently in use:

| Collection | Database | Purpose |
|------------|----------|---------|
| `users` | Main application DB | Stores user account information |
| `projects` | Main application DB | Stores project configurations and metadata |
| `waitlist` | waitlist-serverless | Stores waitlist sign-up information |

## Schema Analysis

### Users Collection
```typescript
interface User {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string; // Hashed password
  company: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Migration Considerations:**
- Simple schema structure that maps well to Firestore
- No nested objects that would approach the 1MB document limit
- Authentication system will need updates when migrating user data

### Projects Collection
```typescript
interface Project {
  _id?: ObjectId;
  name: string;
  description: string;
  ownerId: string;
  teamMembers: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
  storageConfig: {
    bucketName: string;
    region: string;
  };
  settings: {
    dataRetentionDays: number;
    maxStorageGB: number;
  };
  metadata: Record<string, any>;
}

interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  addedAt: Date;
  addedBy: string;
}
```

**Migration Considerations:**
- The `teamMembers` array could grow large over time
- The `metadata` field is unstructured and its contents should be reviewed
- Project-to-user relationships need to be preserved during migration

### Waitlist Collection
```typescript
interface WaitlistSubmission {
  email: string;
  name: string;
  company: string;
  industry: string;
  dataVolume: string;
  useCase: string;
  createdAt: Date;
  status: 'pending'; // Inferred from code
  ipAddress: string;
}
```

**Migration Considerations:**
- Simple schema that maps directly to Firestore
- No complex relationships with other collections
- Lower priority for migration as it's not part of the core application

## Document Size Analysis

Based on the schema structure:

1. **Users**: Typical document size expected to be under 1KB, well below Firestore's 1MB limit
2. **Projects**: Base size is small, but depending on the `metadata` field and number of team members, could grow
   - With 100 team members, estimated size would be approximately 20KB
   - Metadata is the most unpredictable factor
3. **Waitlist**: Simple documents, expected to be under 2KB each

No documents immediately appear at risk of exceeding Firestore's 1MB limit based on current schema design.

## Query Patterns

From analyzing the codebase, these are the common query patterns:

### Users Collection
- Lookup by email (authentication)
- Lookup by ID (profile, authorization)

### Projects Collection
- List projects by owner ID
- List projects by team member ID
- Lookup project by ID
- Filter projects by status

### Waitlist Collection
- Check if email exists
- List all submissions (admin view)

## Data Relationships

- **One-to-Many**: User to Projects (one user can own many projects)
- **Many-to-Many**: Users to Projects (through team members)

These relationships are currently maintained through references (IDs stored in documents) rather than embedded documents.

## Identified Migration Challenges

1. **Authentication**: User data migration requires careful handling of authentication state
2. **Query Migration**: MongoDB's flexible querying needs to be adapted to Firestore's more limited query capabilities
3. **Unstructured Metadata**: The `metadata` field in projects needs assessment for content and structure
4. **Transaction Support**: MongoDB transactions may be in use and need to be adapted to Firestore's transaction limitations
5. **Connection Pooling**: Current code uses connection pooling which has different patterns in Firestore

## Next Steps

1. Analyze project metadata field contents
2. Document all MongoDB queries in use for Firestore compatibility checking
3. Assess document count and total size for each collection to plan migration batching
4. Review authentication system for migration dependencies
