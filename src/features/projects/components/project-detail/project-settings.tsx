"use client";

import { useState } from "react";
import { Project } from "@/app/dashboard/projects/columns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Trash2, Archive, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ProjectSettingsProps {
  project: Project;
  onUpdate: () => void;
}

// Define a more specific type for deletion results
interface DeletionResults {
  jobs?: number;
  bucketDeleted?: boolean;
  projectDeleted?: boolean;
  errors?: string[];
}

export default function ProjectSettings({ project, onUpdate }: ProjectSettingsProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [status, setStatus] = useState(project.status);
  const [isAutoArchiveEnabled, setIsAutoArchiveEnabled] = useState(true);
  const [dataRetentionDays, setDataRetentionDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletionStatus, setDeletionStatus] = useState<{
    inProgress: boolean;
    stage: 'jobs' | 'bucket' | 'project' | 'complete' | null;
    success: boolean;
    results: DeletionResults | null;
  }>({
    inProgress: false,
    stage: null,
    success: false,
    results: null
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          status,
          settings: {
            dataRetentionDays: parseInt(dataRetentionDays),
            autoArchive: isAutoArchiveEnabled,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update project");
      }

      toast.success("Project updated", {
        description: "The project has been updated successfully.",
      });
      
      onUpdate();
    } catch (error) {
      console.error("Error updating project:", error);
      setError(`Error updating project: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to update project", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/projects/${project.id}/archive`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to archive project");
      }

      toast.success("Project archived", {
        description: "The project has been archived successfully.",
      });
      
      onUpdate();
    } catch (error) {
      console.error("Error archiving project:", error);
      setError(`Error archiving project: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to archive project", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== project.name) {
      toast.error("Confirmation text doesn't match project name", {
        description: "Please type the exact project name to confirm deletion."
      });
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      setDeletionStatus({
        inProgress: true,
        stage: 'jobs',
        success: false,
        results: null
      });

      // Clear the confirmation text
      setDeleteConfirmText("");
      
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      setDeletionStatus(prev => ({...prev, stage: 'bucket'}));

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.details || "Failed to delete project");
      }

      setDeletionStatus(prev => ({...prev, stage: 'project'}));
      
      const results = await response.json();
      
      setDeletionStatus({
        inProgress: false,
        stage: 'complete',
        success: true,
        results: results.deletionResults
      });

      toast.success("Project deleted", {
        description: `The project and all associated resources have been deleted successfully. ${results.deletionResults?.jobs || 0} jobs were removed.`,
      });
      
      // Redirect to projects list after a short delay
      setTimeout(() => {
        window.location.href = "/dashboard/projects";
      }, 2000);
    } catch (error) {
      console.error("Error deleting project:", error);
      setError(`Error deleting project: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Failed to delete project", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
      
      setDeletionStatus({
        inProgress: false,
        stage: null,
        success: false,
        results: null
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDeletionStatus = () => {
    if (!deletionStatus.inProgress && !deletionStatus.results) return null;
    
    // For completed deletion, show a summary
    if (deletionStatus.stage === 'complete') {
      const results = deletionStatus.results;
      return (
        <div className="mt-4 border rounded-md p-4 bg-muted/50">
          <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Project Deleted Successfully
          </h3>
          
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              {results?.bucketDeleted ? 
                <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                <XCircle className="h-4 w-4 text-destructive" />}
              Storage bucket: {results?.bucketDeleted ? 'Deleted' : 'Not deleted'}
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Jobs removed: {results?.jobs || 0}
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Project record deleted
            </p>
            
            {results?.errors && results.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-destructive font-medium">Warnings:</p>
                <ul className="list-disc list-inside">
                  {results.errors.map((err, i) => (
                    <li key={i} className="text-destructive">{err}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <p className="mt-2">Redirecting to projects page...</p>
          </div>
        </div>
      );
    }
    
    // For in-progress deletion, show a progress indicator
    return (
      <div className="mt-4 border rounded-md p-4 bg-muted/50">
        <h3 className="text-lg font-medium mb-2">Deleting Project...</h3>
        <Progress value={
          deletionStatus.stage === 'jobs' ? 25 :
          deletionStatus.stage === 'bucket' ? 50 :
          deletionStatus.stage === 'project' ? 75 : 0
        } className="h-2 mb-4" />
        
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            {deletionStatus.stage === 'jobs' ? 
              <Loader2 className="h-4 w-4 animate-spin" /> : 
              (deletionStatus.stage === 'bucket' || deletionStatus.stage === 'project' || deletionStatus.stage === 'complete') ? 
                <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                <div className="h-4 w-4" />}
            Deleting associated jobs
          </p>
          <p className="flex items-center gap-2">
            {deletionStatus.stage === 'bucket' ? 
              <Loader2 className="h-4 w-4 animate-spin" /> : 
              (deletionStatus.stage && ['project', 'complete'].includes(deletionStatus.stage)) ? 
                <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                <div className="h-4 w-4" />}
            Removing GCP storage bucket
          </p>
          <p className="flex items-center gap-2">
            {deletionStatus.stage === 'project' ? 
              <Loader2 className="h-4 w-4 animate-spin" /> : 
              (deletionStatus.stage === 'complete' as any) ? 
                <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                <div className="h-4 w-4" />}
            Deleting project record
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Manage your project information and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as "active" | "archived" | "deleted")}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-retention">Data Retention (Days)</Label>
            <Input
              id="data-retention"
              type="number"
              min="1"
              max="365"
              value={dataRetentionDays}
              onChange={(e) => setDataRetentionDays(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Data older than this will be automatically deleted
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-archive"
              checked={isAutoArchiveEnabled}
              onCheckedChange={setIsAutoArchiveEnabled}
              disabled={loading}
            />
            <Label htmlFor="auto-archive">
              Automatically archive inactive projects
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>

      {renderDeletionStatus()}

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            These actions cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Archive Project</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Archive this project to make it read-only. You can unarchive it later.
            </p>
            <Button 
              variant="outline" 
              disabled={loading || status === "archived"}
              onClick={handleArchive}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
              Archive Project
            </Button>
          </div>

          <div>
            <h3 className="font-medium mb-1">Delete Project</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete this project and all associated data, including jobs and storage bucket. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading || deletionStatus.inProgress}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete Project and All Resources
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      This will permanently delete the project "{project.name}" and all associated resources, including:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>All data generation jobs in this project</li>
                      <li>The Google Cloud Storage bucket and all stored data</li>
                      <li>All project settings and configurations</li>
                    </ul>
                    <div className="mt-4 bg-muted p-3 rounded-md">
                      <Label htmlFor="confirm-delete" className="font-medium text-destructive">
                        Type "{project.name}" to confirm deletion:
                      </Label>
                      <Input 
                        id="confirm-delete"
                        className="mt-2"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Project name"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteConfirmText !== project.name}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete Project"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 