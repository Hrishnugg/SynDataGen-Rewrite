'use client'

import * as React from "react";
import { useParams } from 'next/navigation';
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/shadcn/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shadcn/card";
import { IconLoader, IconAlertTriangle } from "@tabler/icons-react";
import { useGetDatasetContentQuery } from '@/features/projects/projectApiSlice';
import { DataViewerTable } from "@/components/data-viewer-table"; 
import { ChatSidebar } from '@/components/chat-sidebar';

// Placeholder for loading state
const LoadingOverlay = () => (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <IconLoader className="h-10 w-10 animate-spin text-primary" />
  </div>
);

// Placeholder data structure - replace with actual API response type
interface DatasetContent {
  data: Record<string, any>[];
  // Add other relevant fields like metadata if needed
}

export default function DatasetViewerPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const datasetId = params?.datasetId as string;

  // --- Use the actual data fetching hook ---
  const {
    data: datasetContent,
    isLoading,
    isError,
    error
  } = useGetDatasetContentQuery(
    { projectId: projectId!, datasetId: datasetId! },
    {
      skip: !projectId || !datasetId,
    }
  );
  // --- End data fetching ---

  // Decode datasetId for display purposes if it's encoded
  const displayDatasetId = datasetId ? decodeURIComponent(datasetId) : "Unknown Dataset";

  const pageTitle = datasetId ? `Dataset: ${displayDatasetId}` : "Dataset Viewer";

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
        <SiteHeader title={pageTitle} />
        <div className="flex flex-1 p-4 md:p-6 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle>Dataset Content</CardTitle>
              <CardDescription>Viewing content for dataset: {displayDatasetId}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col relative overflow-hidden">
              {isLoading && <LoadingOverlay />}

              {isError && (
                <div className="flex flex-col items-center justify-center h-full text-destructive">
                  <IconAlertTriangle className="h-12 w-12 mb-4" />
                  <p className="text-xl font-semibold">Error loading dataset content.</p>
                  <p className="text-sm text-muted-foreground">Please try again later.</p>
                </div>
              )}

              {!isLoading && !isError && (!datasetContent || !datasetContent.data || datasetContent.data.length === 0) && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>No content found for this dataset.</p>
                </div>
              )}

              {!isLoading && !isError && datasetContent?.data && datasetContent.data.length > 0 && (
                <div className="flex-1">
                  <DataViewerTable data={datasetContent.data} />
                </div>
              )}
            </CardContent>
          </Card>

          <ChatSidebar />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 