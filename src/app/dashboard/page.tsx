'use client';

import { useSession } from 'next-auth/react';
import { FiSettings } from 'react-icons/fi';
import Link from 'next/link';
import ProjectList from '@/components/projects/ProjectList';

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <main className="pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow p-6">
          {/* Welcome Message */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome, {session?.user?.name}!
            </h1>

            {/* Settings Card */}
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-dark-primary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FiSettings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Settings
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Manage Account
                </p>
              </div>
            </Link>
          </div>

          {/* Projects Section */}
          <ProjectList />
        </div>
      </div>
    </main>
  );
} 