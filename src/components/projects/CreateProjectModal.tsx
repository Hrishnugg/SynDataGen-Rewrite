"use client";

import { useState } from "react";
import { Project, CreateProjectInput } from "@/lib/models/project";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Define form validation schema
const projectFormSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters" }),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }),
  settings: z.object({
    dataRetentionDays: z.number().min(1).max(365),
    recordCount: z.number().min(100).max(10000000),
  }),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
}: CreateProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [creationSteps, setCreationSteps] = useState({
    creatingDraft: false,
    creatingBucket: false,
    draftCreated: false,
    bucketCreated: false,
    projectCompleted: false
  });

  // Initialize form with default values
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      settings: {
        dataRetentionDays: 30,
        recordCount: 50000,
      },
    },
  });

  const handleSubmit = async (values: ProjectFormValues) => {
    console.log("Creating project with values:", values);
    setError("");
    setIsLoading(true);
    setCreationSteps({
      creatingDraft: true,
      creatingBucket: false,
      draftCreated: false,
      bucketCreated: false,
      projectCompleted: false
    });

    try {
      // Transform the form values to match the CreateProjectInput
      const projectData: CreateProjectInput = {
        name: values.name,
        description: values.description,
        ownerId: "", // This will be set on the server
        settings: {
          dataRetentionDays: values.settings.dataRetentionDays,
          maxStorageGB: Math.ceil(values.settings.recordCount / 10000), // Convert record count to estimated storage
        },
      };

      console.log("Sending project creation request:", projectData);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      // Update creation stages based on headers if available
      setCreationSteps(prev => ({...prev, draftCreated: true, creatingBucket: true}));
      console.log("Project creation response status:", response.status);
      
      if (!response.ok) {
        const data = await response.json();
        console.error("Project creation failed:", data);
        throw new Error(data.error || data.details || "Failed to create project");
      }

      // The project has been created with storage bucket
      setCreationSteps(prev => ({...prev, bucketCreated: true, projectCompleted: true}));
      
      const project = await response.json();
      console.log("Project created successfully:", project);
      
      toast.success("Project created successfully", {
        description: `${values.name} has been created with dedicated storage bucket.`,
        duration: 5000
      });
      
      // Reset form first
      form.reset();
      
      // Call onProjectCreated after a short delay to ensure form reset completes
      setTimeout(() => {
        console.log("Calling onProjectCreated with project:", project);
        onProjectCreated(project);
      }, 500);
    } catch (error) {
      console.error("Error creating project:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create project",
      );
      
      toast.error("Failed to create project", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderCreationProgress = () => {
    if (!isLoading && !creationSteps.draftCreated) return null;
    
    return (
      <div className="space-y-3 mt-4 border rounded-md p-3 bg-muted/50">
        <h3 className="text-sm font-medium">Creation Progress</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            {creationSteps.draftCreated ? 
              <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
              <Loader2 className="h-4 w-4 animate-spin" />}
            Creating project in database
          </li>
          <li className="flex items-center gap-2">
            {!creationSteps.creatingBucket ? 
              <div className="h-4 w-4" /> :
              creationSteps.bucketCreated ? 
                <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                <Loader2 className="h-4 w-4 animate-spin" />}
            Allocating dedicated GCP storage bucket
          </li>
          <li className="flex items-center gap-2">
            {!creationSteps.bucketCreated ? 
              <div className="h-4 w-4" /> :
              creationSteps.projectCompleted ? 
                <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                <Loader2 className="h-4 w-4 animate-spin" />}
            Finalizing project setup
          </li>
        </ul>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Only allow closing if not in the middle of creation
        if (!isLoading) {
          onClose();
        } else {
          toast.warning("Please wait until project creation completes");
        }
      }
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your synthetic data generation jobs. Each project gets its own dedicated storage bucket in Google Cloud.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter project name" 
                          {...field} 
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for your project
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the purpose of this project" 
                          {...field}
                          rows={4}
                          className="w-full resize-none"
                        />
                      </FormControl>
                      <FormDescription>
                        Briefly describe what kind of data this project will generate
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4 pt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="settings.dataRetentionDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Retention (days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                min={1} 
                                max={365}
                              />
                            </FormControl>
                            <FormDescription>
                              How long to keep generated data in the storage bucket
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="settings.recordCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Record Count (Estimate)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                min={100} 
                                max={10000000}
                              />
                            </FormControl>
                            <FormDescription>
                              Estimated number of records to generate
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {renderCreationProgress()}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
