'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import DecagonModel from './DecagonModel';
import AnimatedBackground from './AnimatedBackground';

export default function HeroSection() {
  return (
    <div className="relative">
      {/* 3D Model Section */}
      <div className="relative min-h-[90vh] flex items-center justify-center rounded-[2rem] overflow-hidden mt-[-5rem]">
        {/* Radial gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,rgb(255,255,255)_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,rgb(17,24,39)_70%)] pointer-events-none" />
        
        {/* Background 3D Model */}
        <div className="absolute inset-0 flex items-center justify-center">
          <DecagonModel />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 text-center max-w-5xl mx-auto px-4 translate-y-[-2rem]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
              The world is running out of data.
            </h1>
            <h2 className="text-3xl md:text-5xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-cyan-300">
              We&apos;re the solution.
            </h2>
          </motion.div>
        </div>

        {/* Gradient Overlay for transition */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-[rgb(17,24,39)] pointer-events-none z-[1]" />
      </div>

      {/* Original Hero Section */}
      <section className="relative overflow-hidden bg-white dark:bg-dark-primary rounded-[2rem] -mt-[6rem]">
        <AnimatedBackground />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 pt-36 pb-24 max-w-6xl">
          <div className="text-center mb-8">
            <div className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-6 py-2 rounded-full text-sm font-medium mb-6">
              🎉 Now in Public Beta
            </div>

            <h2 className="text-5xl md:text-7xl font-bold mb-8">
              <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 animate-gradient">
                Synthetic Data Generation
              </span>
              <span className="block text-3xl md:text-4xl mt-4 text-gray-900 dark:text-white">
                for the AI Era
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
              Generate high-quality, privacy-compliant synthetic data to accelerate your AI and machine learning projects. 
              Powered by our novel ML model combining Gemini and DeepSeek architecture, backed by Carnegie Mellon professors.
            </p>

            <div className="flex justify-center">
              <Link
                href="#waitlist"
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-blue-700 transition-all duration-300 min-w-[200px] hover:scale-105 shadow-lg"
              >
                Join Waitlist
                <FiArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 