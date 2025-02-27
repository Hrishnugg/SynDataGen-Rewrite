import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { ThemeProvider } from "@/context/ThemeContext";
import DashboardLayoutManager from "@/components/dashboard/DashboardLayoutManager";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-primary">
      <DashboardHeader />
      <DashboardLayoutManager>
        {children}
      </DashboardLayoutManager>
    </div>
  );
}
