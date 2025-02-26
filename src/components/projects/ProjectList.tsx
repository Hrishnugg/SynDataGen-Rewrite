'use client';

import { useState, useEffect } from 'react';
import { FiPlus, FiLoader } from 'react-icons/fi';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import { Project } from '@/lib/models/project';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      setError('Failed to load projects');
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
    setIsCreateModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FiLoader className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your Projects
        </h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-gray-50 dark:bg-dark-primary rounded-xl p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Projects Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create your first project to start generating synthetic data.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onUpdate={(updatedProject) => {
                setProjects(prev =>
                  prev.map(p =>
                    p.id === updatedProject.id ? updatedProject : p
                  )
                );
              }}
              onDelete={(projectId) => {
                setProjects(prev =>
                  prev.filter(p => p.id !== projectId)
                );
              }}
            />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
} 