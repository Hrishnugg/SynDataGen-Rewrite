"use client";

import { useState, useEffect } from "react";
import DashboardSidebar from "./DashboardSidebar";

interface DashboardLayoutManagerProps {
  children: React.ReactNode;
}

export default function DashboardLayoutManager({ children }: DashboardLayoutManagerProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Check localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setIsSidebarCollapsed(savedState === "true");
    }
  }, []);
  
  // Listen for changes to the sidebar collapsed state
  useEffect(() => {
    const handleSidebarChange = () => {
      const isCollapsed = document.body.dataset.sidebarCollapsed === "true";
      setIsSidebarCollapsed(isCollapsed);
    };
    
    // Create a MutationObserver to watch for data-attribute changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" && 
          mutation.attributeName === "data-sidebar-collapsed"
        ) {
          handleSidebarChange();
        }
      });
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-sidebar-collapsed"]
    });
    
    // Initial check
    handleSidebarChange();
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return (
    <div className="flex flex-col md:flex-row pt-16">
      <div className={`md:fixed md:left-0 md:top-16 md:bottom-0 overflow-y-auto transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? "md:w-16" : "md:w-64"
      }`}>
        <DashboardSidebar />
      </div>
      <main className={`flex-1 p-6 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
      }`}>
        {children}
      </main>
    </div>
  );
} 