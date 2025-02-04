'use client';

import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-dark-secondary mt-12">
      <div className="mx-auto max-w-7xl overflow-hidden px-6 py-12">
        <div className="border-t border-gray-900/10 dark:border-gray-700 pt-8">
          <div className="text-center">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              nGrams.ai
            </Link>
          </div>
          <p className="mt-4 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
            &copy; {currentYear} nGrams.ai. All rights reserved.
          </p>
          <p className="mt-2 text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
            Empowering AI with Privacy-First Synthetic Data
          </p>
        </div>
      </div>
    </footer>
  );
} 