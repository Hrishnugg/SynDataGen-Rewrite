'use client';

import { useEffect, useState } from 'react';

export default function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      // Calculate how far the user has scrolled
      const scrollPx = document.documentElement.scrollTop;
      // Calculate the height of the scrollable content
      const winHeightPx =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      // Convert the scroll distance to a percentage
      const scrolled = `${scrollPx / winHeightPx * 100}%`;
      
      setScrollProgress(scrollPx / winHeightPx * 100);
    };

    // Add scroll event listener
    window.addEventListener('scroll', updateScrollProgress);

    // Initial calculation
    updateScrollProgress();

    // Cleanup
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 z-50">
      <div
        style={{ width: `${scrollProgress}%` }}
        className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 dark:from-blue-400 dark:via-indigo-400 dark:to-blue-400 transition-all duration-100"
      />
    </div>
  );
} 