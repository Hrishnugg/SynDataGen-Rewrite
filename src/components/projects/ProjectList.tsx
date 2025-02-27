"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiLoader, FiAlertCircle, FiInfo, FiRefreshCw } from "react-icons/fi";
import ProjectCard from "./ProjectCard";
import CreateProjectModal from "./CreateProjectModal";
import { Project } from "@/lib/models/project";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      console.log("Fetching projects...");
      setIsLoading(true);
      setError("");
      
      const response = await fetch("/api/projects");
      console.log("Project API response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Project API response data structure:", Object.keys(data));
      
      // Store debug info if available
      if (data.debug) {
        setDebugInfo(data.debug);
        console.log("Debug info:", data.debug);
      }
      
      // Extract the projects array from the response
      if (data.projects && Array.isArray(data.projects)) {
        console.log(`Found ${data.projects.length} projects in response`);
        setProjects(data.projects);
      } else if (Array.isArray(data)) {
        // Fallback for backward compatibility
        console.log(`Found ${data.length} projects in array response`);
        setProjects(data);
      } else {
        console.error("Unexpected API response format:", data);
        throw new Error("Unexpected API response format");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError(error instanceof Error ? error.message : "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setIsCreateModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <FiAlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          
          {debugInfo && debugInfo.errors && debugInfo.errors.length > 0 && (
            <Collapsible className="mt-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  Show technical details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-2 bg-muted text-muted-foreground rounded text-xs whitespace-pre-wrap font-mono">
                  {debugInfo.errors.map((err, i) => (
                    <div key={i} className="mb-1">{err}</div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          <div className="mt-4">
            <Button onClick={fetchProjects} size="sm" className="flex items-center gap-1">
              <FiRefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <FiInfo className="h-4 w-4 mr-2" />
          <AlertTitle>No Projects</AlertTitle>
          <AlertDescription>You have no projects.</AlertDescription>
        </Alert>
        
        {debugInfo && debugInfo.mockDataUsed && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <FiInfo className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">Using Mock Data</AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-300">
              Using mock project data because Firebase credentials are missing. 
              See the <code className="text-xs p-1 bg-amber-100 dark:bg-amber-800/30 rounded">.env.example</code> file for configuration instructions.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-center mt-4">
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="flex items-center gap-2"
          >
            <FiPlus className="w-5 h-5" />
            Create New Project
          </Button>
        </div>
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

      {debugInfo && debugInfo.mockDataUsed && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <FiInfo className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Using Mock Data</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-300">
            Using mock project data because Firebase credentials are missing. 
            See the <code className="text-xs p-1 bg-amber-100 dark:bg-amber-800/30 rounded">.env.example</code> file for configuration instructions.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onUpdate={(updatedProject) => {
              setProjects((prev) =>
                prev.map((p) =>
                  p.id === updatedProject.id ? updatedProject : p,
                ),
              );
            }}
            onDelete={(projectId) => {
              setProjects((prev) => prev.filter((p) => p.id !== projectId));
            }}
          />
        ))}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />

      {debugInfo && (
        <Collapsible open={showDebug} onOpenChange={setShowDebug} className="mt-8">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-muted-foreground">
              <FiInfo className="h-3 w-3" />
              {showDebug ? 'Hide' : 'Show'} Debug Info
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 bg-muted text-muted-foreground rounded text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(debugInfo, null, 2)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
