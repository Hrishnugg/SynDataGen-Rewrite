"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FiAlertTriangle } from "react-icons/fi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { ProjectDataTable } from "@/features/projects/components/project-data-table";
import { Project } from "@/features/projects/components/columns";
import CreateProjectModal from "@/features/projects/components/CreateProjectModal";
import { toast } from "sonner";

export default function ProjectsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchProjects = useCallback(async () => {
    try {
      console.log("Fetching projects...");
      setLoading(true);
      setError(null);
      const response = await fetch("/api/projects", {
        cache: 'no-store',
        headers: {
          'pragma': 'no-cache',
          'cache-control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Projects data received:", data);
        
        const transformedProjects = (data.projects || []).map((project: any) => ({
          id: project.id,
          name: project.name,
          description: project.description || "",
          status: project.status || "active",
          createdAt: project.createdAt 
            ? new Date(project.createdAt).toISOString() 
            : new Date().toISOString(),
          updatedAt: project.updatedAt 
            ? new Date(project.updatedAt).toISOString() 
            : undefined,
          owner: project.owner,
          teamMembers: project.teamMembers || []
        }));
        
        console.log("Transformed projects:", transformedProjects);
        setProjects(transformedProjects);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch projects:", errorText);
        setError(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError(`Error fetching projects: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, refreshTrigger]);

  // Listen for the custom refresh event
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log("Refresh event received, updating projects list");
      setRefreshTrigger(prev => prev + 1);
    };

    // Add event listener
    window.addEventListener('refreshProjectsList', handleRefreshEvent);

    // Clean up
    return () => {
      window.removeEventListener('refreshProjectsList', handleRefreshEvent);
    };
  }, []);

  const handleCreateProject = async (projectData: any) => {
    try {
      setLoading(true);
      setRefreshTrigger(prev => prev + 1);
      toast.success("Refreshing project list...");
      setIsOpen(false);
    } catch (err) {
      console.error("Error handling project creation:", err);
      toast.error("Project created but could not refresh list. Please reload the page.");
    }
  };

  const handleRefresh = () => {
    console.log("Manual refresh triggered");
    setRefreshTrigger(prev => prev + 1);
    toast.info("Refreshing projects list...");
  };

  const handleRetry = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Projects</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <FiAlertTriangle className="h-4 w-4 mr-2" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="mt-1">
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry} 
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <ProjectDataTable projects={projects} />
      )}

      <CreateProjectModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onProjectCreated={handleCreateProject} 
      />
    </div>
  );
}