import * as React from "react";
import { IconTrendingUp } from "@tabler/icons-react"; // Keep if using icons

import { Badge } from "@/components/shadcn/badge";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction, CardFooter
} from "@/components/shadcn/card";

// Define the props interface for project-specific metrics
interface ProjectMetricCardsProps {
  storageUsed: string;
  storageRemaining: string;
  storageTotal: string;
  creditsUsed: number;
  creditsRemaining: number;
  creditsTotal: number;
  activeJobs: number;
  datasets: number;
  // Add any other project-specific metrics if needed
}

export function ProjectMetricCards({ 
  storageUsed, storageRemaining, storageTotal, 
  creditsUsed, creditsRemaining, creditsTotal,
  activeJobs,
  datasets
}: ProjectMetricCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Storage Used Card */}
      <Card>
        <CardHeader>
          <CardDescription>Storage Used</CardDescription>
          <CardTitle className="text-2xl font-semibold">{storageUsed}</CardTitle>
          <CardAction>
            <Badge variant="secondary">+5%</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            Growth this week
          </div>
          <p className="text-xs text-muted-foreground">
            {storageRemaining} of {storageTotal} remaining
          </p>
        </CardFooter>
      </Card>

      {/* Credits Used Card */}
      <Card>
        <CardHeader>
          <CardDescription>Credits Used</CardDescription>
          <CardTitle className="text-2xl font-semibold">{creditsUsed}</CardTitle>
          <CardAction>
            <Badge variant="secondary">+15</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            Consumed today
          </div>
          <p className="text-xs text-muted-foreground">
            {creditsRemaining} of {creditsTotal} remaining
          </p>
        </CardFooter>
      </Card>

      {/* Active Jobs Card */}
      <Card>
        <CardHeader>
          <CardDescription>Active Jobs</CardDescription>
          <CardTitle className="text-2xl font-semibold">{activeJobs}</CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            Real-time count
          </div>
          <p className="text-xs text-muted-foreground">
            Currently running
          </p>
        </CardFooter>
      </Card>

      {/* Datasets Card */}
      <Card>
        <CardHeader>
          <CardDescription>Datasets</CardDescription>
          <CardTitle className="text-2xl font-semibold">{datasets}</CardTitle>
          <CardAction>
            <Badge variant="secondary">+1</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="font-medium">
            Added this month
          </div>
          <p className="text-xs text-muted-foreground">
             Total datasets generated
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 