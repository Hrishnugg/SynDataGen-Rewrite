import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFolder,
} from "@tabler/icons-react";

// Main navigation items for the authenticated section sidebar
export const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: IconChartBar,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: IconFolder,
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: IconDatabase,
  },
];

// Consider adding types for these items later if needed
// export type NavItem = { title: string; url: string; icon: React.ElementType }; 