import { ThemeProvider } from "@/context/ThemeContext";
import DashboardLayoutManager from "@/features/dashboard/components/DashboardLayoutManager";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-primary">
      <DashboardLayoutManager>
        {children}
      </DashboardLayoutManager>
    </div>
  );
}
