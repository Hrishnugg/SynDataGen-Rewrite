/**
 * Project Service
 * 
 * This module serves as a bridge that re-exports functionality from the original
 * project service implementation while aligning with the new directory structure.
 */

// Re-export all functions from the original project service implementation
export {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  archiveProject
} from '@/features/projects/services/projectService';
