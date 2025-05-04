'use client';

import React, { useState, useEffect } from 'react';
import { useUpdateProjectMutation } from '@/features/projects/projectApiSlice';
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Textarea } from "@/components/shadcn/textarea";
import { Label } from "@/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { toast } from "sonner";

// TODO: Import Project type from a shared location
interface ProjectSettings {
  dataRetentionDays: number;
  maxStorageGB: number;
}
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  settings: ProjectSettings;
  // ... other fields
}

interface ProjectUpdateFormProps {
  project: Project;
}

export function ProjectUpdateForm({ project }: ProjectUpdateFormProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [retentionDays, setRetentionDays] = useState(project.settings.dataRetentionDays);
  const [maxStorage, setMaxStorage] = useState(project.settings.maxStorageGB);
  const [status, setStatus] = useState<'active' | 'archived'>(project.status);

  const [updateProject, { isLoading, isError, error }] = useUpdateProjectMutation();

  // Reset form if the project prop changes (e.g., data refetched)
  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
    setRetentionDays(project.settings.dataRetentionDays);
    setMaxStorage(project.settings.maxStorageGB);
    setStatus(project.status);
  }, [project]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const updates: Partial<Project> & { settings?: Partial<ProjectSettings> } = {};
    let settingsUpdates: Partial<ProjectSettings> = {};

    if (name !== project.name) updates.name = name;
    if (description !== project.description) updates.description = description;
    if (status !== project.status) updates.status = status;
    if (retentionDays !== project.settings.dataRetentionDays) settingsUpdates.dataRetentionDays = retentionDays;
    if (maxStorage !== project.settings.maxStorageGB) settingsUpdates.maxStorageGB = maxStorage;

    if (Object.keys(settingsUpdates).length > 0) {
      updates.settings = settingsUpdates;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes detected.");
      return;
    }

    try {
      await updateProject({ projectId: project.id, updates }).unwrap();
      toast.success("Project updated successfully!");
    } catch (err: any) {
      console.error("Failed to update project:", err);
      toast.error(err?.data?.message || "Failed to update project.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="projectName">Project Name</Label>
        <Input 
          id="projectName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="projectDescription">Description</Label>
        <Textarea
          id="projectDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="retentionDays">Data Retention (Days)</Label>
          <Input 
            id="retentionDays"
            type="number"
            min="1"
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 1)} // Ensure positive integer
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="maxStorage">Max Storage (GB)</Label>
          <Input 
            id="maxStorage"
            type="number"
            min="1"
            value={maxStorage}
            onChange={(e) => setMaxStorage(parseInt(e.target.value, 10) || 1)} // Ensure positive integer
            required
          />
        </div>
      </div>
       <div className="grid gap-2">
          <Label htmlFor="projectStatus">Status</Label>
           <Select value={status} onValueChange={(value: 'active' | 'archived') => setStatus(value)}>
             <SelectTrigger id="projectStatus">
               <SelectValue placeholder="Select status" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="active">Active</SelectItem>
               <SelectItem value="archived">Archived</SelectItem>
             </SelectContent>
           </Select>
        </div>

      {isError && (
        <p className="text-sm text-red-500 dark:text-red-400">
          {/* @ts-ignore */} 
          Error: {error?.data?.message || 'Update failed.'}
        </p>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
} 