'use client'

import * as React from "react";
import { useState, useRef, useEffect } from 'react'; // Add useRef and useEffect
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/shadcn/sidebar";
import {
  CardContainer,
  CardBody,
  CardItem,
} from "@/components/ui/3d-card"; // Assuming this is the correct path
import { DataTable, ColumnDef } from "@/components/data-table"; // Import ColumnDef here
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Badge } from "@/components/shadcn/badge"; // For status in Card view
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shadcn/card"; // For styling within 3d-card
import { Button } from "@/components/shadcn/button"; // Use standard Button for actions
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"; // Import HoverBorderGradient
import { ProjectCreationModal } from "@/components/ProjectCreationModal"; // Import the modal
import { IconPlus, IconTrash, IconLoader } from "@tabler/icons-react"; // Icon for button
import { 
  useListProjectsQuery, 
  useCreateProjectMutation, 
  useDeleteProjectMutation 
} from "@/features/projects/projectApiSlice"; // Import project hooks
import { toast } from "sonner"; // Assuming sonner for notifications
import Link from 'next/link'; // Add Link import

// Define the Project data structure (matching projectApiSlice.ts)
type Role = 'owner' | 'admin' | 'member' | 'viewer';
interface ProjectSettings {
  dataRetentionDays: number;
  maxStorageGB: number;
}
interface ProjectStorage {
  bucketName: string;
  region: string;
  usedStorageBytes?: number;
  bucketURI?: string; 
}
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  settings: ProjectSettings;
  storage: ProjectStorage;
  teamMembers: { [userId: string]: Role };
  createdAt: string;
  updatedAt: string;
}

// Placeholder for when data is loading or empty
const LoadingOverlay = () => (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
    <IconLoader className="h-8 w-8 animate-spin text-primary" />
  </div>
);
const EmptyState = ({ onOpenCreateModal }: { onOpenCreateModal: () => void }) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
    <h3 className="text-xl font-medium">No projects yet</h3>
    <p className="mb-4 mt-2 text-sm text-muted-foreground">
      Get started by creating your first project.
    </p>
    <Button onClick={onOpenCreateModal}>
      <IconPlus className="mr-2 h-4 w-4" /> Create Project
    </Button>
  </div>
);

// Define Columns for the DataTable
const projectTableColumns: ColumnDef<Project>[] = [
  {
    id: "select",
    header: ({ table }) => {
      // Use ref and useEffect for indeterminate state
      const headerCheckboxRef = useRef<HTMLInputElement>(null!)
      const isIndeterminate = table.getIsSomePageRowsSelected();
      const isChecked = table.getIsAllPageRowsSelected();

      useEffect(() => {
        if (headerCheckboxRef.current) {
          headerCheckboxRef.current.indeterminate = isIndeterminate;
        }
      }, [isIndeterminate]);

      return (
        <div className="flex items-center justify-center">
          <input 
            ref={headerCheckboxRef}
            type="checkbox"
            checked={isChecked} // Only pass boolean
            onChange={(event) => table.toggleAllPageRowsSelected(!!event.target.checked)}
            aria-label="Select all"
            className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <input 
           type="checkbox"
           checked={row.getIsSelected()}
           onChange={(value) => row.toggleSelected(!!value.target.checked)}
           aria-label="Select row"
           className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: () => <div className="w-full text-left">Project Name</div>,
    cell: ({ row }) => {
      return (
        <Link href={`/projects/${row.original.id}`} className="font-medium hover:underline">
          {row.original.name}
        </Link>
      );
    },
    enableHiding: false,
  },
  {
    id: "description",
    header: () => <div className="w-full text-left">Description</div>,
    cell: ({ row }) => <div className="truncate max-w-xs">{row.original.description}</div>,
  },
  {
    accessorKey: "status",
    header: () => <div className="w-full text-left">Status</div>,
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant="outline"
          className={`border-transparent px-2.5 py-0.5 text-xs capitalize 
            ${
              status === "active"
                ? "bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-100"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-100"
            }`}
        >
           {status}
        </Badge>
      );
    },
  },
  {
    id: "storage",
    header: () => <div className="text-right">Bucket</div>,
    cell: ({ row }) => <div className="text-right truncate">{row.original.storage?.bucketName ?? 'N/A'}</div>,
  },
  {
    accessorKey: "createdAt",
    header: () => <div className="text-right">Created</div>,
    cell: ({ row }) => <div className="text-right">{new Date(row.original.createdAt).toLocaleDateString()}</div>,
  },
  // Note: Actions column (like delete) is omitted here for simplicity
  // It could be added back if needed, potentially passing handleDeleteProject
];

export default function ProjectsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ limit: 10, offset: 0 });

  // Fetch projects using RTK Query hook
  const { data: projectsData, isLoading, isError, error, refetch } = useListProjectsQuery({
    status: 'active', // Example: fetch only active projects initially
    limit: pagination.limit,
    offset: pagination.offset,
  });

  // Create project mutation hook
  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

  // Delete project mutation hook
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  // Handler for submitting the new project
  const handleCreateProjectSubmit = async (details: {
    name: string;
    description: string;
    settings: { dataRetentionDays: number; maxStorageGB: number };
  }): Promise<boolean> => {
    try {
      await createProject(details).unwrap();
      toast.success("Project created successfully!");
      // No need to manually refetch if invalidatesTags is set correctly
      // refetch(); 
      return true; // Indicate success to close modal
    } catch (err: any) {
      console.error("Project creation failed:", err);
      toast.error(err?.data?.message || "Failed to create project.");
      return false; // Indicate failure
    }
  };

  // Handler for deleting a project
  const handleDeleteProject = async (projectId: string) => {
    // TODO: Add confirmation dialog here
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteProject(projectId).unwrap();
      toast.success("Project deleted successfully!");
      // refetch(); // Invalidation should handle this
    } catch (err: any) {
      console.error("Project deletion failed:", err);
      toast.error(err?.data?.message || "Failed to delete project.");
    }
  };

  // Prepare data for table/cards
  const projects = projectsData?.projects || [];
  const totalProjects = projectsData?.total || 0;

  // Render logic
  const renderContent = () => {
    if (isLoading) {
      return <LoadingOverlay />;
    }
    if (isError) {
      return <div className="text-center text-red-500">Error loading projects: {JSON.stringify(error)}</div>;
    }
    if (projects.length === 0) {
      return <EmptyState onOpenCreateModal={() => setIsCreateModalOpen(true)} />;
    }
    return (
      <Tabs defaultValue="card" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="inline-grid grid-cols-2 md:w-[300px]">
            <TabsTrigger value="card">Card View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
          <HoverBorderGradient
            containerClassName="rounded-md"
            as="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-1 h-9 px-4 text-sm"
          >
             <IconPlus className="h-4 w-4 mr-1" />
             <span>Create Project</span>
          </HoverBorderGradient>
        </div>
        <TabsContent value="card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <CardContainer key={project.id} className="inter-var">
                <CardBody className="flex flex-col bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto min-h-[24rem] rounded-xl p-6 border">
                  <div className="flex justify-between items-center w-full mb-2">
                    <CardItem
                      translateZ="50"
                      className="text-xl font-bold text-neutral-600 dark:text-white"
                    >
                      {project.name}
                    </CardItem>
                    <CardItem translateZ="50">
                       <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} disabled={isDeleting}>
                         <IconTrash className="h-4 w-4 text-destructive" />
                       </Button>
                    </CardItem>
                  </div>
                  <Link href={`/projects/${project.id}`} className="flex flex-col flex-grow">
                    <CardItem
                      as="p"
                      translateZ="60"
                      className="text-neutral-500 text-sm max-w-sm mt-1 dark:text-neutral-300"
                    >
                      {project.description} | Created: {new Date(project.createdAt).toLocaleDateString()}
                    </CardItem>
                    <CardItem translateZ="100" className="w-full mt-4">
                      <div className="h-20 w-full bg-neutral-200 dark:bg-neutral-700 rounded-md flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400">
                        Bucket: {project.storage?.bucketName}
                      </div>
                    </CardItem>
                    <div className="flex justify-between items-center mt-auto pt-4">
                      <CardItem
                        translateZ={20}
                        className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white"
                      >
                        Storage: N/A
                      </CardItem>
                      <CardItem
                        translateZ={20}
                        as="div"
                        className="text-xs font-bold"
                      >
                        <Badge
                          className={`px-3 py-1 rounded-full text-xs font-medium border-transparent capitalize 
                            ${project.status === 'active' ? 'bg-green-900/80 text-green-100' :
                              'bg-yellow-900/80 text-yellow-100'
                            }`}
                        >
                          {project.status}
                        </Badge>
                      </CardItem>
                    </div>
                  </Link>
                </CardBody>
              </CardContainer>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="table">
           {/* Pass the defined columns to DataTable */}
          <DataTable columns={projectTableColumns} data={projects} /> 
        </TabsContent>
        {/* TODO: Implement Pagination Controls using totalProjects, pagination state, and setPagination */} 
      </Tabs>
    );
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 md:p-6 relative"> {/* Added relative for overlay */}
          <h1 className="text-2xl font-semibold mb-4">Projects</h1>
          {renderContent()}
          {/* Show overlay only when not initially loading but performing actions */}
          {(isCreating || isDeleting) && <LoadingOverlay />} 
        </div>
      </SidebarInset>

      {/* Render the Modal */}
      <ProjectCreationModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreateProject={handleCreateProjectSubmit}
        isCreating={isCreating} // Pass loading state to modal
      />
    </SidebarProvider>
  );
} 