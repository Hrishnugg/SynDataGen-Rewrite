'use client';

import { useSession } from 'next-auth/react';
import { FiGrid, FiSettings } from 'react-icons/fi';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <main className="pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow p-6">
          {/* Welcome Message */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Welcome, {session?.user?.name}!
          </h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Projects Card */}
            <div className="bg-gray-50 dark:bg-dark-primary rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <FiGrid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Projects
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    0
                  </p>
                </div>
              </div>
            </div>

            {/* Settings Card */}
            <div className="bg-gray-50 dark:bg-dark-primary rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <FiSettings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Settings
                  </p>
                  <Link
                    href="/dashboard/settings"
                    className="text-purple-600 dark:text-purple-400 text-sm font-medium hover:underline"
                  >
                    Manage Account
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Message */}
          <div className="bg-gray-50 dark:bg-dark-primary rounded-xl p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Dashboard Features Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              We're working hard to bring you powerful tools for managing your synthetic data generation projects.
              Stay tuned for updates!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
} 