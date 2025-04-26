"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/shadcn/sidebar"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter 
} from "@/components/shadcn/card"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from "@/components/shadcn/chart"
import { DataTable } from "@/components/data-table" // Reusing DataTable for user analytics
import { Badge } from "@/components/shadcn/badge"
import { IconAlertCircle, IconArrowDownRight, IconArrowUpRight, IconClockHour4, IconDatabase, IconFileAnalytics, IconListCheck, IconReceipt2, IconUsersGroup } from "@tabler/icons-react"
// Import Recharts components
import {
  AreaChart as RechartsAreaChart,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  Area, Bar, Line, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label
} from "recharts"

// --- Mock Data ---

// 1. KPI Cards Data
const kpiData = {
  totalDatasets: 145,
  totalRecords: 12_560_890,
  avgGenTimePer1k: 0.8, // seconds
  jobsCompleted: 580,
  jobsFailed: 15,
  pipelineVersion: "v2.3.1",
  estimatedCost: 456.78, // USD
}

// 2. Throughput Data (Time-series)
const throughputData = [
  { date: "2024-07-01", "Datasets Created": 5, "Records Generated": 150000 },
  { date: "2024-07-02", "Datasets Created": 7, "Records Generated": 210000 },
  { date: "2024-07-03", "Datasets Created": 6, "Records Generated": 180000 },
  { date: "2024-07-04", "Datasets Created": 8, "Records Generated": 250000 },
  { date: "2024-07-05", "Datasets Created": 4, "Records Generated": 120000 },
  { date: "2024-07-06", "Datasets Created": 9, "Records Generated": 300000 },
  { date: "2024-07-07", "Datasets Created": 5, "Records Generated": 160000 },
];

// 3. Quality & Fidelity Data
const qualityData = {
  distributionDrift: 0.08, // Avg KL-divergence
  correlationPreservation: 0.92, // Avg Pearson score
  rareCategoryCoverage: 85, // %
  outlierPreservation: 78, // %
}

// Mock data for a feature comparison chart
const featureDistributionData = [
  { feature: 'Age', 'Real Data': 40, 'Synthetic Data': 38 },
  { feature: 'Income', 'Real Data': 30, 'Synthetic Data': 32 },
  { feature: 'Score', 'Real Data': 20, 'Synthetic Data': 19 },
  { feature: 'Group', 'Real Data': 10, 'Synthetic Data': 11 },
];

// 4. Privacy & Compliance Data
const privacyData = {
  piiAccuracyTP: 99.5, // % True Positive
  piiAccuracyFN: 0.1, // % False Negative
  avgEpsilon: 1.5,
  cumulativeEpsilon: 15.8,
  reIdRisk: 0.02, // % Estimated Risk
  avgNoiseScale: 0.5, // Avg Sigma/Scale
}

// 5. Resource Utilization Data
const resourceData = [
  { time: "10:00", "GPU Utilization (%)": 65, "CPU Utilization (%)": 40 },
  { time: "11:00", "GPU Utilization (%)": 70, "CPU Utilization (%)": 45 },
  { time: "12:00", "GPU Utilization (%)": 85, "CPU Utilization (%)": 50 },
  { time: "13:00", "GPU Utilization (%)": 75, "CPU Utilization (%)": 48 },
  { time: "14:00", "GPU Utilization (%)": 80, "CPU Utilization (%)": 55 },
];
const avgMemoryFootprint = 8.5; // GB
const avgQueueWaitTime = 120; // seconds

// 6. User & Workspace Analytics Data
const userActivityData = [
  { id: 1, user: "Alice Smith", role: "Data Scientist", datasetsGenerated: 25, computeSpent: 75.50 },
  { id: 2, user: "Bob Johnson", role: "Analyst", datasetsGenerated: 15, computeSpent: 45.20 },
  { id: 3, user: "Charlie Brown", role: "App Service", datasetsGenerated: 55, computeSpent: 150.00 },
  { id: 4, user: "David Lee", role: "Data Scientist", datasetsGenerated: 10, computeSpent: 30.80 },
];
const usageSplitData = [
  { name: 'API Usage', value: 70 },
  { name: 'UI Usage', value: 30 },
];

// 7. Alerts & Anomalies Data
const alertsData = [
  { id: 1, severity: "High", message: "Job failures exceeded 5% threshold in the last hour.", time: "2024-07-23 14:30" },
  { id: 2, severity: "Medium", message: "Distribution drift increased significantly for 'Medical Imaging Dataset'.", time: "2024-07-23 11:15" },
  { id: 3, severity: "Low", message: "Cumulative privacy budget approaching limit (85% used).", time: "2024-07-23 09:00" },
  { id: 4, severity: "Medium", message: "GPU cluster utilization high (>90%) for 15 minutes.", time: "2024-07-22 18:45" },
];

// Columns for User Activity Table
const userActivityColumns = [
  { header: "User", accessorKey: "user" },
  { header: "Role", accessorKey: "role" },
  { header: "Datasets Generated", accessorKey: "datasetsGenerated" },
  { header: "Compute Spent ($)", accessorKey: "computeSpent" },
];

// --- Chart Config Definitions ---

const throughputChartConfig = {
  "Records Generated": {
    label: "Records Generated",
    color: "hsl(var(--chart-1))",
  },
  "Datasets Created": {
    label: "Datasets Created",
    color: "hsl(var(--chart-2))", // Use a different chart color variable
  },
} satisfies ChartConfig

const featureDistributionChartConfig = {
  "Real Data": {
    label: "Real Data",
    color: "hsl(var(--chart-1))",
  },
  "Synthetic Data": {
    label: "Synthetic Data",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const resourceChartConfig = {
  "GPU Utilization (%)": {
    label: "GPU %",
    color: "hsl(var(--chart-1))",
  },
  "CPU Utilization (%)": {
    label: "CPU %",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

const usageSplitChartConfig = {
  value: { // Use 'value' as the key if that's what Pie uses
    label: "Usage",
  },
  "API Usage": {
    label: "API Usage",
    color: "hsl(var(--chart-1))",
  },
  "UI Usage": {
    label: "UI Usage",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

// --- Analytics Page Component ---
export default function AnalyticsPage() {
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
        <SiteHeader title="Analytics" />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            
            {/* 1. Top-Level Summary (KPI Cards) */}
            <h2 className="text-xl font-semibold text-foreground md:text-2xl">Analytics Overview</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Datasets</CardTitle>
                  <IconDatabase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpiData.totalDatasets.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                   <IconFileAnalytics className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpiData.totalRecords.toLocaleString()}</div>
                   <p className="text-xs text-muted-foreground">Across all datasets</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Gen Time / 1k</CardTitle>
                  <IconClockHour4 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpiData.avgGenTimePer1k}s</div>
                </CardContent>
              </Card>
               <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Job Success Rate</CardTitle>
                   <IconListCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((kpiData.jobsCompleted / (kpiData.jobsCompleted + kpiData.jobsFailed)) * 100).toFixed(1)}%
                  </div>
                   <p className="text-xs text-muted-foreground">
                    {kpiData.jobsCompleted} completed / {kpiData.jobsFailed} failed
                  </p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Version</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{kpiData.pipelineVersion}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Est. Cost (Month)</CardTitle>
                  <IconReceipt2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${kpiData.estimatedCost.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* 2. Throughput Over Time */}
             <h2 className="mt-6 text-xl font-semibold text-foreground md:text-2xl">Throughput</h2>
             <Card>
               <CardHeader>
                 <CardTitle>Generation Activity Over Time</CardTitle>
                 <CardDescription>Daily datasets created and records generated.</CardDescription>
               </CardHeader>
               <CardContent className="h-72">
                 <ChartContainer config={throughputChartConfig} className="h-full w-full">
                   <RechartsAreaChart data={throughputData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                     <defs>
                       <linearGradient id="fillRecords" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="var(--color-records-generated)" stopOpacity={0.8}/>
                         <stop offset="95%" stopColor="var(--color-records-generated)" stopOpacity={0.1}/>
                       </linearGradient>
                       <linearGradient id="fillDatasets" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="var(--color-datasets-created)" stopOpacity={0.8}/>
                         <stop offset="95%" stopColor="var(--color-datasets-created)" stopOpacity={0.1}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid vertical={false} />
                     <XAxis 
                       dataKey="date" 
                       tickLine={false} 
                       axisLine={false} 
                       tickMargin={8} 
                     />
                     <YAxis />
                     <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                     <Area dataKey="Records Generated" type="natural" fill="url(#fillRecords)" stroke="var(--color-records-generated)" stackId="a" />
                     <Area dataKey="Datasets Created" type="natural" fill="url(#fillDatasets)" stroke="var(--color-datasets-created)" stackId="a" />
                     <ChartLegend content={<ChartLegendContent />} />
                   </RechartsAreaChart>
                 </ChartContainer>
               </CardContent>
             </Card>
            
             {/* 3. Quality & Fidelity Metrics */}
             <h2 className="mt-6 text-xl font-semibold text-foreground md:text-2xl">Data Quality & Fidelity</h2>
             <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
               <Card>
                 <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-medium">Distribution Drift (KL)</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold">{qualityData.distributionDrift.toFixed(3)}</div>
                   <p className="text-xs text-muted-foreground">Lower is better</p>
                 </CardContent>
               </Card>
               <Card>
                 <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-medium">Correlation Preservation</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold">{qualityData.correlationPreservation.toFixed(3)}</div>
                    <p className="text-xs text-muted-foreground">Closer to 1 is better</p>
                 </CardContent>
               </Card>
                <Card>
                 <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-medium">Rare Category Coverage</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold">{qualityData.rareCategoryCoverage}%</div>
                    <p className="text-xs text-muted-foreground">Higher is better</p>
                 </CardContent>
               </Card>
                <Card>
                 <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-medium">Outlier Preservation</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="text-2xl font-bold">{qualityData.outlierPreservation}%</div>
                   <p className="text-xs text-muted-foreground">Higher is better</p>
                 </CardContent>
               </Card>
             </div>
              <Card className="mt-4">
                 <CardHeader>
                   <CardTitle>Feature Distribution Comparison</CardTitle>
                   <CardDescription>Example: Count distribution for key features.</CardDescription>
                 </CardHeader>
                 <CardContent className="h-72">
                   <ChartContainer config={featureDistributionChartConfig} className="h-full w-full">
                     <RechartsBarChart data={featureDistributionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                       <CartesianGrid vertical={false} />
                       <XAxis 
                         dataKey="feature" 
                         tickLine={false} 
                         axisLine={false} 
                         tickMargin={8} 
                       />
                       <YAxis />
                       <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                       <Bar dataKey="Real Data" fill="var(--color-real-data)" radius={4} />
                       <Bar dataKey="Synthetic Data" fill="var(--color-synthetic-data)" radius={4} />
                       <ChartLegend content={<ChartLegendContent />} />
                     </RechartsBarChart>
                   </ChartContainer>
                 </CardContent>
               </Card>

             {/* 4. Privacy & Compliance Metrics */}
             <h2 className="mt-6 text-xl font-semibold text-foreground md:text-2xl">Privacy & Compliance</h2>
             <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>PII Detection Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2">
                        <span className="text-lg font-semibold">{privacyData.piiAccuracyTP}%</span>
                        <span className="ml-2 text-sm text-muted-foreground">True Positive</span>
                    </div>
                     <div>
                        <span className="text-lg font-semibold">{privacyData.piiAccuracyFN}%</span>
                        <span className="ml-2 text-sm text-muted-foreground">False Negative</span>
                    </div>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader>
                    <CardTitle>Differential Privacy (ε)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2">
                        <span className="text-lg font-semibold">{privacyData.avgEpsilon}</span>
                        <span className="ml-2 text-sm text-muted-foreground">Avg. Epsilon per Job</span>
                    </div>
                     <div>
                        <span className="text-lg font-semibold">{privacyData.cumulativeEpsilon}</span>
                        <span className="ml-2 text-sm text-muted-foreground">Cumulative Budget Used</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Re-identification Risk</CardTitle>
                     <CardDescription>Estimated probability</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{privacyData.reIdRisk}%</div>
                  </CardContent>
                </Card>
             </div>

            {/* 5. Resource Utilization & Performance */}
            <h2 className="mt-6 text-xl font-semibold text-foreground md:text-2xl">Resource Utilization</h2>
             <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Compute Utilization Over Time</CardTitle>
                  </CardHeader>
                   <CardContent className="h-72">
                     <ChartContainer config={resourceChartConfig} className="h-full w-full">
                       <RechartsLineChart data={resourceData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                         <CartesianGrid vertical={false} />
                         <XAxis 
                           dataKey="time" 
                           tickLine={false} 
                           axisLine={false} 
                           tickMargin={8} 
                         />
                         <YAxis />
                         <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                         <Line type="monotone" dataKey="GPU Utilization (%)" stroke="var(--color-gpu-utilization----)" strokeWidth={2} dot={false} />
                         <Line type="monotone" dataKey="CPU Utilization (%)" stroke="var(--color-cpu-utilization----)" strokeWidth={2} dot={false} />
                         <ChartLegend content={<ChartLegendContent />} />
                       </RechartsLineChart>
                     </ChartContainer>
                   </CardContent>
                </Card>
                 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1">
                     <Card>
                         <CardHeader>
                             <CardTitle>Avg. Memory Footprint</CardTitle>
                             <CardDescription>Per generation job</CardDescription>
                         </CardHeader>
                         <CardContent>
                             <div className="text-2xl font-bold">{avgMemoryFootprint} GB</div>
                         </CardContent>
                     </Card>
                     <Card>
                         <CardHeader>
                             <CardTitle>Avg. Queue Wait Time</CardTitle>
                         </CardHeader>
                         <CardContent>
                              <div className="text-2xl font-bold">{avgQueueWaitTime}s</div>
                         </CardContent>
                     </Card>
                 </div>
             </div>

            {/* 6. User & Workspace Analytics */}
            <h2 className="mt-6 text-xl font-semibold text-foreground md:text-2xl">User & Workspace Activity</h2>
             <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>User Activity</CardTitle>
                    <CardDescription>Datasets generated and compute spent by user.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {/* Pass columns and data to the existing DataTable */}
                      {/* Note: DataTable component needs to be flexible enough */}
                       <p className="text-sm text-muted-foreground">(DataTable Component Placeholder - Requires props for columns/data)</p>
                       {/* <DataTable columns={userActivityColumns} data={userActivityData} /> */}
                  </CardContent>
                </Card>
                 <Card>
                     <CardHeader>
                         <CardTitle>Usage Split (API vs UI)</CardTitle>
                     </CardHeader>
                     <CardContent className="flex items-center justify-center h-48">
                         <ChartContainer config={usageSplitChartConfig} className="h-full w-full">
                           <RechartsPieChart >
                              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="name" />} />
                              <Pie 
                                data={usageSplitData} 
                                dataKey="value" 
                                nameKey="name" 
                                innerRadius={60} 
                                outerRadius={80} 
                                strokeWidth={1}
                              />
                              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                           </RechartsPieChart>
                         </ChartContainer>
                     </CardContent>
                     <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 font-medium leading-none">
                            API: {usageSplitData.find(i => i.name === 'API Usage')?.value}%
                        </div>
                         <div className="leading-none text-muted-foreground">
                            UI: {usageSplitData.find(i => i.name === 'UI Usage')?.value}%
                         </div>
                     </CardFooter>
                 </Card>
             </div>


            {/* 7. Alerts & Anomalies */}
             <h2 className="mt-6 text-xl font-semibold text-foreground md:text-2xl">Alerts & Anomalies</h2>
             <Card>
               <CardHeader>
                 <CardTitle>Recent System Alerts</CardTitle>
               </CardHeader>
               <CardContent>
                 <ul className="space-y-3">
                   {alertsData.map((alert) => (
                     <li key={alert.id} className="flex items-start gap-3">
                       <IconAlertCircle 
                         className={`h-5 w-5 mt-0.5 ${
                           alert.severity === 'High' ? 'text-red-500' : 
                           alert.severity === 'Medium' ? 'text-yellow-500' : 'text-blue-500'
                         }`} 
                       />
                       <div>
                         <p className="text-sm font-medium">{alert.message}</p>
                         <p className="text-xs text-muted-foreground">{alert.time}</p>
                       </div>
                     </li>
                   ))}
                 </ul>
               </CardContent>
             </Card>

            {/* 8. Drill-down & Comparison Tools (Placeholder) */}
             <h2 className="mt-6 text-xl font-semibold text-foreground md:text-2xl">Analysis Tools</h2>
              <Card>
               <CardHeader>
                 <CardTitle>Drill-down & Comparison</CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-sm text-muted-foreground">
                   Interactive tools for dataset comparison, filtering, and report exports will be available here. (Placeholder for future implementation)
                 </p>
               </CardContent>
             </Card>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}