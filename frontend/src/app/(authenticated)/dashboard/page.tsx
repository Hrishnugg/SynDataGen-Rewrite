import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/shadcn/sidebar"

// Define mock data matching the new schema
const mockData = [
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

export default function Page() {
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
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={mockData} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
