'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import DecagonModel from './DecagonModel';
import WaveParticleBackground from './ui/WaveParticleBackground';

export default function HeroSection() {
  return (
    <div className="relative">
      {/*/3D Model Section - Temporarily removed
      <div className="relative min-h-[90vh] flex items-center justify-center rounded-[2rem] overflow-hidden mt-[-5rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,rgb(255,255,255)_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,rgb(17,24,39)_70%)] pointer-events-none" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <DecagonModel />
        </div>

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

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-[rgb(17,24,39)] pointer-events-none z-[1]" />
      </div>
      */}

      {/* Original Hero Section */}
      <section className="relative overflow-hidden bg-[#060B10] dark:bg-[#060B10] rounded-[2rem] pt-12">
        <WaveParticleBackground />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 pt-24 pb-24 max-w-6xl">
          <div className="text-center">
            <div className="inline-block bg-[rgba(86,102,251,0.1)] dark:bg-[rgba(86,102,251,0.2)] text-blue-400 dark:text-blue-300 px-6 py-2 rounded-full text-sm font-medium mb-12">
              🎉 Now in Private Beta
            </div>

            <div className="mb-12">
              <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-[1.4] tracking-tight">
                <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-400 dark:from-blue-400 dark:to-indigo-300 animate-gradient py-4">
                  Synthetic Data Generation
                </span>
                <span className="block text-3xl md:text-4xl mt-6 text-white dark:text-white">
                  for the AI Era
                </span>
              </h2>
            </div>
            
            <p className="text-xl md:text-2xl text-gray-300 dark:text-gray-300 mb-12 max-w-3xl mx-auto">
              Generate high-quality, privacy-compliant synthetic data to accelerate your AI and machine learning projects. 
              Powered by our novel ML model combining Gemini and DeepSeek architecture, backed by Carnegie Mellon professors.
            </p>

            <div className="flex justify-center">
              <Link
                href="#waitlist"
                className="flex items-center justify-center gap-2 bg-[rgb(86,102,251)] text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-[rgb(76,92,241)] transition-all duration-300 min-w-[200px] hover:scale-105 shadow-lg"
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