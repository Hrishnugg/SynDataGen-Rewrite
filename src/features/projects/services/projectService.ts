import { getFirebaseFirestore } from "../../../lib/firebase";
import { PROJECT_COLLECTION } from "../../../lib/models/firestore/project";
import { getDocument, updateDocument, deleteDocument } from "../../../lib/gcp/firestore";
import { Project, Storage } from "../types";

// Simulated database of projects
const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "E-commerce Product Catalog",
    description: "Synthetic data for an e-commerce product catalog",
    createdAt: new Date("2023-06-15"),
    updatedAt: new Date("2023-07-20"),
    creatorId: "user-1",
    creatorName: "John Doe",
    status: "active",
    jobCount: 3,
    customerId: "cust-1",
    lastJobDate: new Date("2023-07-20"),
    lastRunAt: new Date("2023-07-20"),
    storage: {
      bucketName: "synthetic-data-bucket",
      region: "us-west-2",
      usedStorage: 1024000,
      isMock: true
    }
  },
  // Additional mock projects would go here
];

// Utility functions for date handling
/**
 * Ensures a value is a Date object
 */
function ensureDate(value: any): Date {
  if (value instanceof Date) {
    return value;
  } else if (value && typeof value.toDate === 'function') {
    // Handle Firestore Timestamp objects
    return value.toDate();
  } else if (typeof value === 'string') {
    return new Date(value);
  } else if (typeof value === 'number') {
    return new Date(value);
  }
  return new Date(); // Default to now if invalid
}

/**
 * Formats a date to ISO string or returns undefined if date is invalid
 */
function formatDate(date: any): string | undefined {
  if (!date) return undefined;
  try {
    return ensureDate(date).toISOString();
  } catch (e) {
    console.error("Invalid date format:", date);
    return undefined;
  }
}

/**
 * Get all projects
 */
export async function getProjects(): Promise<Project[]> {
  // In a real app, this would fetch from a database
  return mockProjects.map(project => ({
    ...project,
    createdAt: ensureDate(project.createdAt),
    updatedAt: ensureDate(project.updatedAt),
    lastJobDate: project.lastJobDate ? ensureDate(project.lastJobDate) : undefined,
    lastRunAt: project.lastRunAt ? ensureDate(project.lastRunAt) : undefined
  }));
}

/**
 * Get a project by ID
 */
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    // In a real app, this would fetch from a database
    const project = mockProjects.find(p => p.id === projectId);
    
    if (!project) {
      return null;
    }
    
    // Return project with properly formatted dates
    return {
      ...project,
      createdAt: ensureDate(project.createdAt),
      updatedAt: ensureDate(project.updatedAt),
      lastJobDate: project.lastJobDate ? ensureDate(project.lastJobDate) : undefined,
      lastRunAt: project.lastRunAt ? ensureDate(project.lastRunAt) : undefined
    };
  } catch (error) {
    console.error(`Error getting project: ${error}`);
    return null;
  }
}

/**
 * Get projects by customer ID
 */
export async function getProjectsByCustomerId(customerId: string): Promise<Project[]> {
  try {
    // In a real app, this would fetch from a database
    const projects = mockProjects
      .filter(p => p.customerId === customerId && p.status !== 'deleted')
      .map(project => {
        // Format dates consistently
        return {
          ...project,
          createdAt: ensureDate(project.createdAt),
          updatedAt: ensureDate(project.updatedAt),
          lastRunAt: project.lastRunAt ? ensureDate(project.lastRunAt) : undefined,
          lastJobDate: project.lastJobDate ? ensureDate(project.lastJobDate) : undefined
        };
      });
    
    return projects;
    
  } catch (error) {
    console.error(`Error getting projects by customer ID: ${error}`);
    return [];
  }
}

/**
 * Create a new project
 */
export async function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'jobCount'>): Promise<Project> {
  // In a real app, this would create in a database
  const now = new Date();
  const newProject: Project = {
    id: `proj-${mockProjects.length + 1}`,
    ...project,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    jobCount: 0
  };
  
  mockProjects.push(newProject);
  return {
    ...newProject,
    createdAt: ensureDate(newProject.createdAt),
    updatedAt: ensureDate(newProject.updatedAt)
  };
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
  try {
    // In a real app, this would update in a database
    const projectIndex = mockProjects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return null;
    }
    
    // Prepare update data with current time
    const now = new Date();
    const { id, createdAt, ...validUpdates } = updates; // Remove id and createdAt from updates
    
    // Update the project
    const updatedProject: Project = {
      ...mockProjects[projectIndex],
      ...validUpdates,
      updatedAt: now
    };
    
    // Ensure project ID doesn't change
    updatedProject.id = projectId;
    
    // Ensure createdAt doesn't change
    updatedProject.createdAt = mockProjects[projectIndex].createdAt;
    
    // Save the updated project
    mockProjects[projectIndex] = updatedProject;
    
    return {
      ...updatedProject,
      createdAt: ensureDate(updatedProject.createdAt),
      updatedAt: ensureDate(updatedProject.updatedAt),
      lastJobDate: updatedProject.lastJobDate ? ensureDate(updatedProject.lastJobDate) : undefined,
      lastRunAt: updatedProject.lastRunAt ? ensureDate(updatedProject.lastRunAt) : undefined
    };
  } catch (error) {
    console.error(`Error updating project: ${error}`);
    return null;
  }
}

/**
 * Delete a project (marks as deleted)
 */
export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    // In a real app, this would soft-delete in a database
    const projectIndex = mockProjects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return false;
    }
    
    // Mark as deleted
    mockProjects[projectIndex] = {
      ...mockProjects[projectIndex],
      status: 'deleted',
      updatedAt: new Date()
    };
    
    return true;
  } catch (error) {
    console.error(`Error deleting project: ${error}`);
    return false;
  }
}

/**
 * Update project last job date
 */
export async function updateProjectLastJobDate(projectId: string, jobDate?: Date): Promise<boolean> {
  try {
    // In a real app, this would update in a database
    const projectIndex = mockProjects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return false;
    }
    
    // Update job date and last run
    const lastDate = jobDate || new Date();
    mockProjects[projectIndex] = {
      ...mockProjects[projectIndex],
      lastJobDate: lastDate,
      lastRunAt: lastDate,
      updatedAt: new Date()
    };
    
    return true;
  } catch (error) {
    console.error(`Error updating project last job date: ${error}`);
    return false;
  }
}

/**
 * Increment project job count
 */
export async function incrementProjectJobCount(projectId: string): Promise<boolean> {
  try {
    // In a real app, this would update in a database
    const projectIndex = mockProjects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      return false;
    }
    
    // Increment job count
    const currentCount = mockProjects[projectIndex].jobCount || 0;
    mockProjects[projectIndex] = {
      ...mockProjects[projectIndex],
      jobCount: currentCount + 1,
      updatedAt: new Date()
    };
    
    return true;
  } catch (error) {
    console.error(`Error incrementing project job count: ${error}`);
    return false;
  }
}

/**
 * Update project storage usage
 */
export async function updateProjectStorage(projectId: string, storage: Partial<Storage>): Promise<boolean> {
  return updateProject(projectId, { storage: storage as Storage })
    .then((project) => !!project)
    .catch((error) => {
      console.error(`Error updating project ${projectId} storage:`, error);
      return false;
    });
}

/**
 * Archive a project (marks as archived)
 * @param projectId The ID of the project to archive
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function archiveProject(projectId: string): Promise<boolean> {
  try {
    const result = await updateProject(projectId, { 
      status: "archived",
      updatedAt: new Date()
    });
    
    return !!result;
  } catch (error) {
    console.error(`Error archiving project ${projectId}:`, error);
    return false;
  }
}