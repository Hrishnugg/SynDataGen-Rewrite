'use client';

import { useState } from 'react';
import { FiX, FiLoader } from 'react-icons/fi';
import { Project, CreateProjectInput } from '@/lib/models/project';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onProjectCreated
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: '',
    ownerId: '',
    settings: {
      dataRetentionDays: 30,
      maxStorageGB: 50
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const project = await response.json();
      onProjectCreated(project);
      setFormData({
        name: '',
        description: '',
        ownerId: '',
        settings: {
          dataRetentionDays: 30,
          maxStorageGB: 50
        }
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Create New Project
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Project Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="retention"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Data Retention (days)
              </label>
              <input
                type="number"
                id="retention"
                name="retention"
                value={formData.settings?.dataRetentionDays}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      dataRetentionDays: parseInt(e.target.value)
                    }
                  }))
                }
                min={1}
                max={365}
                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="storage"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Storage Limit (GB)
              </label>
              <input
                type="number"
                id="storage"
                name="storage"
                value={formData.settings?.maxStorageGB}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      maxStorageGB: parseInt(e.target.value)
                    }
                  }))
                }
                min={1}
                max={1000}
                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 