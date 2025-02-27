"use client";

import { useState, useEffect } from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  // Default theme state with direct DOM manipulation as fallback
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  
  // Try to use the theme context, but fall back to direct manipulation if not available
  const themeContext = (() => {
    try {
      return useTheme();
    } catch (error) {
      // If context is not available, return a local implementation
      return {
        theme: currentTheme,
        toggleTheme: () => {
          const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
          setCurrentTheme(newTheme);
          
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
          }
        }
      };
    }
  })();
  
  const { theme, toggleTheme } = themeContext;
  
  // Initialize theme on mount
  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setCurrentTheme('dark');
    } else {
      setCurrentTheme('light');
    }
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      {(theme === 'dark' || currentTheme === 'dark') ? (
        <FiSun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      ) : (
        <FiMoon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      )}
    </button>
  );
}
