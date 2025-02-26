/**
 * Firestore Project Model
 * 
 * Defines the structure and types for project data in Firestore.
 */

/**
 * Team member within a project
 */
export interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  addedAt: Date;
}

/**
 * Project model for Firestore
 */
export interface Project {
  id: string;            // Unique identifier for the project
  customerId: string;    // Reference to customer who owns the project
  name: string;          // Project name
  description: string;   // Project description
  createdAt: Date;       // Creation timestamp
  updatedAt: Date;       // Last update timestamp
  status: 'active' | 'archived' | 'deleted';
  storage: {
    bucketName: string;  // GCP bucket name
    region: string;      // Bucket region
    usedStorage: number; // Current storage usage in bytes
  };
  teamMembers: TeamMember[];
  settings: {
    dataRetentionDays: number;
    maxStorageGB: number;
  };
  metadata?: Record<string, any>; // Additional project metadata
}

/**
 * Input type for creating a new project
 */
export interface CreateProjectInput {
  customerId: string;
  name: string;
  description: string;
  region?: string;
  teamMembers?: Omit<TeamMember, 'addedAt'>[];
  settings?: {
    dataRetentionDays?: number;
    maxStorageGB?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Default settings for new projects
 */
export const DEFAULT_PROJECT_SETTINGS = {
  dataRetentionDays: 30,
  maxStorageGB: 50
};

/**
 * Firestore collection name for projects
 */
export const PROJECT_COLLECTION = 'projects';

/**
 * Convert a Firestore document to a Project object
 * @param doc Firestore document data
 * @param id Document ID
 * @returns Project object
 */
export function firestoreToProject(doc: FirebaseFirestore.DocumentData, id: string): Project {
  return {
    id,
    customerId: doc.customerId,
    name: doc.name,
    description: doc.description,
    createdAt: doc.createdAt?.toDate() || new Date(),
    updatedAt: doc.updatedAt?.toDate() || new Date(),
    status: doc.status || 'active',
    storage: {
      bucketName: doc.storage?.bucketName || '',
      region: doc.storage?.region || '',
      usedStorage: doc.storage?.usedStorage || 0
    },
    teamMembers: (doc.teamMembers || []).map((member: any) => ({
      userId: member.userId,
      role: member.role,
      addedAt: member.addedAt?.toDate() || new Date()
    })),
    settings: doc.settings || { ...DEFAULT_PROJECT_SETTINGS },
    metadata: doc.metadata || {}
  };
}

/**
 * Convert a Project object to Firestore document data
 * @param project Project object
 * @returns Firestore document data
 */
export function projectToFirestore(project: Project): FirebaseFirestore.DocumentData {
  return {
    customerId: project.customerId,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: new Date(), // Always update the timestamp
    status: project.status,
    storage: {
      bucketName: project.storage.bucketName,
      region: project.storage.region,
      usedStorage: project.storage.usedStorage
    },
    teamMembers: project.teamMembers,
    settings: project.settings,
    metadata: project.metadata || {}
  };
} 