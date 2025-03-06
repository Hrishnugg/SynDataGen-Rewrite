import { Project } from "@/app/dashboard/projects/columns";
import { getFirestore } from "@/lib/services/db-service";
import { PROJECT_COLLECTION, firestoreToProject } from "@/lib/models/firestore/project";
import { getDocument, updateDocument, deleteDocument } from "@/lib/gcp/firestore";

// Simulated database of projects
const mockProjects: Project[] = [
  {
    id: "project-1",
    name: "E-commerce Data",
    description: "Synthetic product catalog and customer data for our e-commerce platform",
    status: "active",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    owner: "user-1",
    teamMembers: [
      { userId: "user-1", role: "owner" },
      { userId: "user-2", role: "editor" }
    ]
  },
  {
    id: "project-2",
    name: "Healthcare Records",
    description: "HIPAA-compliant synthetic medical records for testing",
    status: "active",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    owner: "user-1",
    teamMembers: [
      { userId: "user-1", role: "owner" }
    ]
  },
  {
    id: "project-3",
    name: "Financial Transactions",
    description: "Realistic financial transaction data for testing fraud detection",
    status: "archived",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), // 60 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
    owner: "user-1",
    teamMembers: [
      { userId: "user-1", role: "owner" },
      { userId: "user-3", role: "viewer" }
    ]
  }
];

// Add this helper function to format dates consistently
function formatDate(date: any): string {
  // Check if it's a Firestore Timestamp
  if (date && typeof date.toDate === 'function') {
    return date.toDate().toISOString();
  }
  // Check if it's a Date object
  else if (date instanceof Date) {
    return date.toISOString();
  }
  // Check if it's already a string
  else if (typeof date === 'string') {
    return date;
  }
  // Default to current time if invalid
  return new Date().toISOString();
}

/**
 * Get all projects
 */
export async function getProjects() {
  // In a real app, this would fetch from a database
  return [...mockProjects];
}

/**
 * Get a project by ID
 */
export async function getProjectById(id: string) {
  // First check if we should use real Firestore
  const useRealFirestore = process.env.FORCE_REAL_FIRESTORE === 'true' && 
                          process.env.MOCK_FIREBASE !== 'true';
                          
  // Log what we're doing for debugging
  console.log(`[getProjectById] Looking up project ${id} (using ${useRealFirestore ? 'Firestore' : 'mock data'})`);
  
  try {
    if (useRealFirestore) {
      // Use Firestore to get the project
      console.log(`[getProjectById] Attempting to fetch project ${id} from Firestore`);
      
      // Ensure Firestore is initialized through our service first
      const firestoreService = await getFirestore();
      await firestoreService.init();
      
      try {
        // Get project from Firestore - using imported getDocument function from GCP module
        console.log(`[getProjectById] Calling getDocument for ${id} in collection ${PROJECT_COLLECTION}`);
        const projectDoc = await getDocument(PROJECT_COLLECTION, id);
        
        if (!projectDoc) {
          console.log(`[getProjectById] Project ${id} not found in Firestore`);
          return null;
        }
        
        console.log(`[getProjectById] Project ${id} found in Firestore:`, projectDoc);
        // Convert from Firestore format and ensure dates are properly formatted
        const project = firestoreToProject(projectDoc, id);
        
        // Ensure dates are in ISO format for client consumption
        if (project) {
          // Format dates consistently
          project.createdAt = formatDate(project.createdAt);
          project.updatedAt = formatDate(project.updatedAt);
        }
        
        return project;
      } catch (innerError) {
        console.error(`[getProjectById] Specific Firestore operation error:`, innerError);
        throw innerError; // Re-throw for outer catch handler
      }
    } else {
      // Use mock data
      console.log(`[getProjectById] Looking up project ${id} in mock data`);
      return mockProjects.find(project => project.id === id) || null;
    }
  } catch (error) {
    console.error(`[getProjectById] Error fetching project ${id}:`, error);
    // Still return null to maintain consistent API
    return null;
  }
}

/**
 * Create a new project
 */
export async function createProject(projectData: Partial<Project>) {
  // In a real app, this would save to a database
  const newProject: Project = {
    id: `project-${Date.now()}`,
    name: projectData.name || "Untitled Project",
    description: projectData.description || "",
    status: projectData.status || "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: projectData.owner || "current-user",
    teamMembers: projectData.teamMembers || [{ userId: "current-user", role: "owner" }]
  };
  
  mockProjects.push(newProject);
  return newProject;
}

/**
 * Update a project
 */
export async function updateProject(id: string, projectData: Partial<Project>) {
  // First check if we should use real Firestore
  const useRealFirestore = process.env.FORCE_REAL_FIRESTORE === 'true' && 
                          process.env.MOCK_FIREBASE !== 'true';
                          
  // Log what we're doing for debugging
  console.log(`[updateProject] Updating project ${id} (using ${useRealFirestore ? 'Firestore' : 'mock data'})`);
  
  try {
    if (useRealFirestore) {
      // Use Firestore to update the project
      console.log(`[updateProject] Attempting to update project ${id} in Firestore`);
      const firestoreService = await getFirestore();
      await firestoreService.init();
      
      // First get the existing project
      const existingProject = await getProjectById(id);
      if (!existingProject) {
        console.log(`[updateProject] Project ${id} not found in Firestore`);
        throw new Error("Project not found");
      }
      
      // Update the project document in Firestore
      const updatedData = {
        ...projectData,
        updatedAt: new Date()
      };
      
      // Use imported updateDocument from GCP Firestore module instead of firestoreService.update
      await updateDocument(PROJECT_COLLECTION, id, updatedData);
      console.log(`[updateProject] Successfully updated project ${id} in Firestore`);
      
      // Get the updated project
      const updatedProject = await getProjectById(id);
      return updatedProject;
    } else {
      // Use mock data
      console.log(`[updateProject] Updating project ${id} in mock data`);
      const projectIndex = mockProjects.findIndex(project => project.id === id);
      
      if (projectIndex === -1) {
        console.log(`[updateProject] Project ${id} not found in mock data`);
        throw new Error("Project not found");
      }
      
      const updatedProject = {
        ...mockProjects[projectIndex],
        ...projectData,
        updatedAt: new Date().toISOString()
      };
      
      mockProjects[projectIndex] = updatedProject;
      return updatedProject;
    }
  } catch (error) {
    console.error(`[updateProject] Error updating project ${id}:`, error);
    throw error; // Re-throw to maintain existing error handling
  }
}

/**
 * Delete a project
 */
export async function deleteProject(id: string) {
  // First check if we should use real Firestore
  const useRealFirestore = process.env.FORCE_REAL_FIRESTORE === 'true' && 
                          process.env.MOCK_FIREBASE !== 'true';
                          
  // Log what we're doing for debugging
  console.log(`[deleteProject] Deleting project ${id} (using ${useRealFirestore ? 'Firestore' : 'mock data'})`);
  
  try {
    if (useRealFirestore) {
      // Use Firestore to delete the project
      console.log(`[deleteProject] Attempting to delete project ${id} from Firestore`);
      const firestoreService = await getFirestore();
      await firestoreService.init();
      
      // Delete the project document from Firestore using the imported deleteDocument
      await deleteDocument(PROJECT_COLLECTION, id);
      console.log(`[deleteProject] Successfully deleted project ${id} from Firestore`);
      return true;
    } else {
      // Use mock data
      console.log(`[deleteProject] Deleting project ${id} from mock data`);
      const projectIndex = mockProjects.findIndex(project => project.id === id);
      
      if (projectIndex === -1) {
        console.log(`[deleteProject] Project ${id} not found in mock data`);
        throw new Error("Project not found");
      }
      
      mockProjects.splice(projectIndex, 1);
      return true;
    }
  } catch (error) {
    console.error(`[deleteProject] Error deleting project ${id}:`, error);
    throw error; // Re-throw to maintain existing error handling
  }
}

/**
 * Archive a project
 */
export async function archiveProject(id: string) {
  // In a real app, this would update in a database
  return updateProject(id, { status: "archived" });
} 