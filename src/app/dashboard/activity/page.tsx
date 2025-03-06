"use client";

import { useState, useEffect } from "react";
import { FiActivity, FiClock, FiCalendar } from "react-icons/fi";

type ActivityLog = {
  id: string;
  action: string;
  resource: string;
  timestamp: string;
  user: string;
  status: "success" | "warning" | "error";
  details?: string;
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data loading - in a real app, this would fetch from an API
    const loadData = async () => {
      setLoading(true);
      try {
        // Mock data for initial development
        const mockActivities: ActivityLog[] = [
          {
            id: "act-1",
            action: "Created",
            resource: "Project: Marketing Data",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            user: "Current User",
            status: "success",
          },
          {
            id: "act-2",
            action: "Generated",
            resource: "Dataset: Customer Records",
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
            user: "Current User",
            status: "success",
            details: "1,000 records created successfully",
          },
          {
            id: "act-3",
            action: "Attempted",
            resource: "Authentication",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
            user: "Unknown User",
            status: "error",
            details: "Failed login attempt from unusual IP",
          },
          {
            id: "act-4",
            action: "Updated",
            resource: "Project: Sales Analytics",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            user: "Current User",
            status: "success",
          },
          {
            id: "act-5",
            action: "Deleted",
            resource: "Dataset: Test Data",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
            user: "Current User",
            status: "warning",
          },
        ];

        // Sort by timestamp (newest first)
        mockActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(mockActivities);
      } catch (error) {
        console.error("Error loading activity data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Format timestamp in a human-readable way
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get status badge color
  const getStatusColor = (status: ActivityLog["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FiActivity className="text-primary" />
          Activity Log
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-secondary rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium">Recent Activity</h2>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.length === 0 ? (
              <li className="p-4 text-center text-gray-500">
                No activity to show.
              </li>
            ) : (
              activities.map((activity) => (
                <li key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex flex-col sm:flex-row justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {activity.action} {activity.resource}
                      </p>
                      {activity.details && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {activity.details}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col sm:items-end mt-2 sm:mt-0">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <FiClock className="mr-1" />
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                            activity.status
                          )}`}
                        >
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}