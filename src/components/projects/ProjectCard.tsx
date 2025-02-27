"use client";

import { useState } from "react";
import Link from "next/link";
import { FiFolder, FiMoreVertical, FiEdit2, FiTrash2 } from "react-icons/fi";
import { Project } from "@/lib/models/project";
import { DEFAULT_PROJECT_SETTINGS } from "@/lib/models/project";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  onUpdate: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export default function ProjectCard({
  project,
  onUpdate,
  onDelete,
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Ensure settings exist or use defaults
  const settings = project.settings || DEFAULT_PROJECT_SETTINGS;

  // Truncate description if it's longer than 100 characters
  const isLongDescription = project.description?.length > 100;
  const truncatedDescription = isLongDescription 
    ? `${project.description.substring(0, 100)}...` 
    : project.description;

  const handleDelete = async () => {
    if (!project.id) return;

    if (!confirm("Are you sure you want to archive this project?")) return;

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to archive project");
      }

      onDelete(project.id);
    } catch (error) {
      console.error("Error archiving project:", error);
      alert("Failed to archive project");
    }
  };

  return (
    <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] border-2 border-gray-200/80 dark:border-gray-700 transition-all duration-200">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <FiFolder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
                title={project.name}
              >
                {project.name}
              </Link>
              <div className="relative">
                <p 
                  className={cn(
                    "text-sm text-gray-600 dark:text-gray-400",
                    !showFullDescription && "line-clamp-2"
                  )}
                >
                  {showFullDescription ? project.description : truncatedDescription}
                </p>
                {isLongDescription && (
                  <button
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    {showFullDescription ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="relative flex-shrink-0 ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <FiMoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-primary rounded-xl shadow-lg py-1 z-10">
                <Link
                  href={`/dashboard/projects/${project.id}/settings`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setShowMenu(false)}
                >
                  <FiEdit2 className="w-4 h-4" />
                  Edit Project
                </Link>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Archive Project
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-dark-primary rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Storage</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={`${settings?.maxStorageGB || DEFAULT_PROJECT_SETTINGS.maxStorageGB} GB`}>
              {settings?.maxStorageGB || DEFAULT_PROJECT_SETTINGS.maxStorageGB} GB
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-dark-primary rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Retention
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={`${settings?.dataRetentionDays || DEFAULT_PROJECT_SETTINGS.dataRetentionDays} days`}>
              {settings?.dataRetentionDays || DEFAULT_PROJECT_SETTINGS.dataRetentionDays} days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
