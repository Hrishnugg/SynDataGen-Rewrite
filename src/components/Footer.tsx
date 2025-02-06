'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-dark-primary">
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col items-center">
          {/* Logo */}
          <Link href="/" className="mb-8">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Synoptic
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <Link
              href="#features"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#waitlist"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Join Waitlist
            </Link>
          </div>

          {/* Company Address */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            <p>Synoptic</p>
            <p>1111B S Governors Ave STE 26703</p>
            <p>Dover, DE 19904</p>
          </div>

          {/* Copyright */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Synoptic. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
} 