'use client';

import Link from 'next/link';
import { FiGithub, FiTwitter, FiLinkedin, FiMail } from 'react-icons/fi';

const navigation = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'Enterprise', href: '#enterprise' },
    { name: 'Security', href: '#security' },
    { name: 'Pricing', href: '#pricing' },
  ],
  company: [
    { name: 'About', href: '#about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/careers' },
    { name: 'Contact', href: '/contact' },
  ],
  legal: [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
    { name: 'License', href: '/license' },
  ],
  social: [
    {
      name: 'Twitter',
      href: 'https://twitter.com/ngramsai',
      icon: FiTwitter,
    },
    {
      name: 'GitHub',
      href: 'https://github.com/ngramsai',
      icon: FiGithub,
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/ngramsai',
      icon: FiLinkedin,
    },
    {
      name: 'Email',
      href: 'mailto:hello@ngrams.ai',
      icon: FiMail,
    },
  ],
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-dark-secondary mt-24">
      <div className="mx-auto max-w-7xl overflow-hidden px-6 py-20">
        <nav className="-mb-6 columns-2 sm:flex sm:justify-center sm:space-x-12" aria-label="Footer">
          <div className="pb-6">
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Product</div>
            {navigation.product.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 mb-2"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pb-6">
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Company</div>
            {navigation.company.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 mb-2"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pb-6">
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</div>
            {navigation.legal.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-sm leading-6 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 mb-2"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        <div className="mt-10 flex justify-center space-x-10">
          {navigation.social.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="sr-only">{item.name}</span>
              <item.icon className="h-6 w-6" aria-hidden="true" />
            </Link>
          ))}
        </div>

        <div className="mt-10 border-t border-gray-900/10 dark:border-gray-700 pt-8">
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