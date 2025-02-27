"use client";

import { useSession } from "next-auth/react";
import ProjectList from "@/components/projects/ProjectList";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <main>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow p-6">
          {/* Welcome Message */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome, {session?.user?.name}!
            </h1>
          </div>

          {/* Projects Section */}
          <ProjectList />
        </div>
      </div>
    </main>
  );
}
