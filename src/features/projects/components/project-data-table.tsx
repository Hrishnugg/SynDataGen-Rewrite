"use client"

import { DataTable } from "@/components/ui/data-table"
import { columns, Project } from "@/app/dashboard/projects/columns"
import { Card, CardContent } from "@/components/ui/card"

interface ProjectDataTableProps {
  projects: Project[]
  onCreateProject?: () => void
  onRefresh?: () => void
}

export function ProjectDataTable({ projects }: ProjectDataTableProps) {
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
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