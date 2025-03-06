"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { Project } from "@/app/dashboard/projects/columns";
import ProjectJobs from "@/components/projects/project-detail/project-jobs";
import ProjectStats from "@/components/projects/project-detail/project-stats";
import ProjectSettings from "@/components/projects/project-detail/project-settings";
import { toast } from "sonner";

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("jobs");

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
      setError(`Error fetching project: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to load project", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Link href="/dashboard/projects">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Button>
        </Link>
        
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Project not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <Link href="/dashboard/projects">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.description || "No description provided"}</p>
          </div>
          <div>
            <Badge variant={
              project.status === "active" 
                ? "default" 
                : project.status === "archived" 
                ? "secondary" 
                : "outline"
            }>
              {project.status}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="jobs" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="jobs" className="mt-6">
          <ProjectJobs projectId={projectId} />
        </TabsContent>
        
        <TabsContent value="stats" className="mt-6">
          <ProjectStats projectId={projectId} />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <ProjectSettings project={project} onUpdate={() => fetchProject()} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 