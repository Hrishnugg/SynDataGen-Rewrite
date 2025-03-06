"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { 
  FiHome, 
  FiUsers, 
  FiSettings, 
  FiFolder, 
  FiActivity, 
  FiDatabase,
  FiShield,
  FiServer,
  FiChevronLeft,
  FiChevronRight,
  FiMenu
} from "react-icons/fi";

const DashboardSidebar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  
  // Check if user is admin
  const isAdmin = (session?.user as any)?.role === "admin";

  // Load collapsed state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setCollapsed(savedState === "true");
    }
  }, []);

  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", collapsed.toString());
    
    // Also update a data attribute on the document body for responsive layout adjustments
    document.body.dataset.sidebarCollapsed = collapsed.toString();
  }, [collapsed]);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <FiHome className="w-5 h-5" />,
      active: pathname === "/dashboard",
    },
    {
      title: "Projects",
      href: "/dashboard/projects",
      icon: <FiFolder className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/projects"),
    },
    {
      title: "Data Generation",
      href: "/dashboard/data-generation",
      icon: <FiDatabase className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/data-generation"),
    },
    {
      title: "Activity",
      href: "/dashboard/activity",
      icon: <FiActivity className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/activity"),
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: <FiSettings className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/settings"),
    },
  ];

  const adminNavItems = [
    {
      title: "Customers",
      href: "/dashboard/admin/customers",
      icon: <FiUsers className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/admin/customers"),
    },
    {
      title: "Service Accounts",
      href: "/dashboard/admin/service-accounts",
      icon: <FiServer className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/admin/service-accounts"),
    },
    {
      title: "Security",
      href: "/dashboard/admin/security",
      icon: <FiShield className="w-5 h-5" />,
      active: pathname.startsWith("/dashboard/admin/security"),
    },
  ];

  return (
    <aside className={cn(
      "h-full bg-white dark:bg-dark-secondary shadow-sm transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-full"
    )}>
      <div className="p-4 overflow-y-auto h-full relative">
        {/* Toggle button */}
        <button 
          onClick={toggleSidebar}
          className="absolute top-4 right-3 p-1.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
        </button>

        <nav className="space-y-6 mt-8">
          <div>
            {!collapsed && (
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Main
              </h3>
            )}
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      collapsed ? "justify-center" : "",
                      item.active
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    )}
                    title={collapsed ? item.title : ""}
                  >
                    {item.icon}
                    {!collapsed && item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {isAdmin && (
            <div>
              {!collapsed && (
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Admin
                </h3>
              )}
              <ul className="space-y-1">
                {adminNavItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        collapsed ? "justify-center" : "",
                        item.active
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                      title={collapsed ? item.title : ""}
                    >
                      {item.icon}
                      {!collapsed && item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
};

export default DashboardSidebar; 