'use client'

import * as React from "react";
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
import { DataTable } from "@/components/data-table"; // Remove ColumnDef import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Badge } from "@/components/shadcn/badge"; // For status in Card view
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shadcn/card"; // For styling within 3d-card
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"; // Import HoverBorderGradient

// Define the Project data structure
type Project = {
  id: number;
  name: string;
  type: string;
  status: "Active" | "Archived" | "Error";
  storage_total: string;
  date_created: string;
  creator: string;
};

// Reusing the mock data from dashboard for now
const mockData: Project[] = [
  {
    id: 1,
    name: "Customer Churn Analysis",
    type: "CSV",
    status: "Archived",
    storage_total: "1.2 GB",
    date_created: "2024-07-15",
    creator: "Alice Smith",
  },
  {
    id: 2,
    name: "Synthetic User Profiles",
    type: "JSON",
    status: "Active",
    storage_total: "500 MB",
    date_created: "2024-07-20",
    creator: "Bob Johnson",
  },
  {
    id: 3,
    name: "Medical Imaging Dataset",
    type: "DICOM",
    status: "Archived",
    storage_total: "15.8 GB",
    date_created: "2024-06-10",
    creator: "Charlie Brown",
  },
  {
    id: 4,
    name: "Financial Transactions Log",
    type: "Parquet",
    status: "Error",
    storage_total: "N/A",
    date_created: "2024-07-22",
    creator: "Alice Smith",
  },
   {
    id: 5,
    name: "E-commerce Product Catalog",
    type: "JSONL",
    status: "Archived",
    storage_total: "850 MB",
    date_created: "2024-05-01",
    creator: "David Lee",
  },
   {
    id: 6,
    name: "Network Traffic Simulation",
    type: "PCAP",
    status: "Active",
    storage_total: "3.1 GB",
    date_created: "2024-07-18",
    creator: "Bob Johnson",
  }
];

// Remove the columns definition as DataTable uses its internal one
// const columns: ColumnDef<Project>[] = [
//   { accessorKey: "name", header: "Name" },
//   { accessorKey: "type", header: "Type" },
//   { accessorKey: "status", header: "Status" },
//   { accessorKey: "storage_total", header: "Size" },
//   { accessorKey: "date_created", header: "Created" },
//   { accessorKey: "creator", header: "Creator" },
// ];

export default function ProjectsPage() {
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
        <div className="flex flex-1 flex-col p-4 md:p-6">
          <h1 className="text-2xl font-semibold mb-4">Projects</h1>

          <Tabs defaultValue="card" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="inline-grid grid-cols-2 md:w-[300px]">
                <TabsTrigger value="card">Card View</TabsTrigger>
                <TabsTrigger value="table">Table View</TabsTrigger>
              </TabsList>
              <HoverBorderGradient
                containerClassName="rounded-md shadow-2xl"
                className="dark:bg-black bg-black text-white dark:text-white text-sm font-medium lg:text-base"
              >
                Create Project
              </HoverBorderGradient>
            </div>
            <TabsContent value="card">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockData.map((project) => (
                  <CardContainer key={project.id} className="inter-var">
                    <CardBody className="flex flex-col bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto min-h-[24rem] rounded-xl p-6 border">
                      <CardItem
                        translateZ="50"
                        className="text-xl font-bold text-neutral-600 dark:text-white"
                      >
                        {project.name}
                      </CardItem>
                      <CardItem
                        as="p"
                        translateZ="60"
                        className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
                      >
                        Type: {project.type} | Created by: {project.creator} on {project.date_created}
                      </CardItem>
                      <CardItem translateZ="100" className="w-full mt-4">
                        {/* You can add an image or more details here if needed */}
                        <div className="h-20 w-full bg-neutral-200 dark:bg-neutral-700 rounded-md flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400">
                          Project description placeholder
                        </div>
                      </CardItem>
                      <div className="flex justify-between items-center mt-auto">
                        <CardItem
                          translateZ={20}
                          className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white"
                        >
                          Size: {project.storage_total}
                        </CardItem>
                        <CardItem
                          translateZ={20}
                          as="button"
                          className="text-xs font-bold"
                        >
                           <Badge
                             className={`px-3 py-1 rounded-full text-xs font-medium border-transparent capitalize 
                               ${project.status === 'Active' ? 'bg-green-900/80 text-green-100' :
                                project.status === 'Archived' ? 'bg-yellow-900/80 text-yellow-100' :
                                'bg-red-900/80 text-red-100'
                               }`}
                           >
                            {project.status}
                           </Badge>
                        </CardItem>
                      </div>
                    </CardBody>
                  </CardContainer>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="table">
               {/* Ensure DataTable component is correctly imported and props are passed */}
              <DataTable data={mockData} /> {/* Remove columns prop */}
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 