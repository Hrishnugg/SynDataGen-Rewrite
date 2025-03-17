"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { toast } from "sonner"

// Define project data type
export type Project = {
  id: string
  name: string
  description?: string
  status: "active" | "archived" | "draft"
  createdAt: string
  updatedAt?: string
  owner?: string
  teamMembers?: { userId: string, role?: string }[]
}

// Component for the delete project button with confirmation
function DeleteProjectButton({ project }: { project: Project }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();
  
  const handleDelete = async () => {
    if (confirmText !== project.name) {
      toast.error("Confirmation text doesn't match project name");
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.details || "Failed to delete project");
      }
      
      const results = await response.json();
      
      toast.success("Project deleted", {
        description: `The project and all associated resources have been deleted successfully. ${results.deletionResults?.jobs || 0} jobs were removed.`
      });
      
      // Emit a custom event to notify the projects page to refresh
      const refreshEvent = new CustomEvent('refreshProjectsList');
      window.dispatchEvent(refreshEvent);
      
      // Refresh the page to update the project list
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete project", {
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
          Delete project
        </DropdownMenuItem>
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
              <Label htmlFor="confirm-delete-dt" className="font-medium text-destructive">
                Type "{project.name}" to confirm deletion:
              </Label>
              <Input 
                id="confirm-delete-dt"
                className="mt-2"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
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
            disabled={confirmText !== project.name || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <Link 
        href={`/dashboard/projects/${row.original.id}`} 
        className="font-medium text-primary hover:underline"
      >
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate text-muted-foreground">
        {row.getValue("description") || "No description"}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      
      return (
        <Badge 
          variant={
            status === "active" 
              ? "default" 
              : status === "archived" 
              ? "secondary" 
              : "outline"
          }
        >
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      // Format date as MM/DD/YYYY
      return <div>{date.toLocaleDateString()}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const project = row.original
      const router = useRouter()

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(project.id)}
            >
              Copy project ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
              View project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}>
              Edit project
            </DropdownMenuItem>
            <DeleteProjectButton project={project} />
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 