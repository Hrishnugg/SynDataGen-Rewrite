"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, Project } from "@/app/dashboard/projects/columns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { useState } from "react"

interface ProjectDataTableProps {
  projects: Project[]
  onCreateProject?: () => void
  onRefresh?: () => void
}

export function ProjectDataTable({ projects, onCreateProject, onRefresh }: ProjectDataTableProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = () => {
    if (onRefresh) {
      setIsRefreshing(true);
      
      // Call the onRefresh prop
      onRefresh();
      
      // Reset the refreshing state after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Projects</CardTitle>
        <div className="flex space-x-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={onCreateProject} 
            className="ml-auto" 
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={projects} 
          filterColumn="name"
          filterPlaceholder="Filter projects..." 
        />
      </CardContent>
    </Card>
  )
} 