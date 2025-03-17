"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { PartyPopper } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";

// Import DreamyParticles component with dynamic import to prevent SSR issues
const DreamyParticlesBackground = dynamic(
  () => import("@/components/ui/DreamyParticles"),
  { ssr: false }
);

export default function HeroSection() {
  // Get the current theme from our custom ThemeContext
  const { theme } = useTheme();
  
  // Map our theme to the ThemedParticles theme prop ('dark' or 'light')
  // Ensure it always has a valid value
  const particleTheme = theme === 'light' ? 'light' : 'dark';
  
  // Dynamic styles based on theme
  const textColor = theme === 'light' ? 'text-gray-900' : 'text-white';
  const textShadow = theme === 'light' 
    ? '0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(255, 255, 255, 0.8)' 
    : '0 4px 6px rgba(0, 0, 0, 0.5)';
  const subtitleTextShadow = theme === 'light'
    ? '0 1px 3px rgba(0, 0, 0, 0.2), 0 0 6px rgba(255, 255, 255, 0.8)'
    : '0 2px 4px rgba(0, 0, 0, 0.5)';
  const paragraphBg = theme === 'light' 
    ? 'bg-white/60 backdrop-blur-md text-gray-800 shadow-md' 
    : 'backdrop-blur-sm bg-black/20 text-white';

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center w-full overflow-hidden bg-gray-950 dark:bg-gray-950">
      {/* Particle Background container - using specific style configuration to ensure mouse events work */}
      <div 
        className="absolute inset-0 w-full h-full" 
        style={{ 
          zIndex: 0,
          pointerEvents: 'auto',
          touchAction: 'none' // Prevent touch actions from interfering with mouse events
        }}
      >
        <DreamyParticlesBackground />
      </div>

      {/* Content overlay with specific z-index to layer above particles but not block mouse events */}
      <div 
        className="container mx-auto px-4 relative py-16 md:py-24 flex flex-col items-center justify-center text-center"
        style={{ 
          zIndex: 10,
          pointerEvents: 'none' // Make content container transparent to pointer events by default
        }}
      >
        {/* Each interactive element needs pointer-events-auto to be clickable */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-indigo-900/60 backdrop-blur-md border border-indigo-700/40 rounded-full px-6 py-2 mb-8 inline-flex items-center shadow-lg"
          style={{ pointerEvents: 'auto' }} // Enable pointer events for this element
        >
          <PartyPopper className="h-5 w-5 text-indigo-300 mr-2" />
          <span className="text-white font-medium">Now in Private Beta</span>
        </motion.div>

        {/* Main heading with better contrast */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`text-5xl md:text-7xl font-extrabold mb-4 ${textColor}`}
          style={{ 
            textShadow: textShadow
          }}
        >
          Synthetic Data Generation
        </motion.h1>

        {/* Subtitle with enhanced visibility */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`text-4xl font-bold mb-16 ${textColor}`}
          style={{ 
            textShadow: subtitleTextShadow
          }}
        >
          for the AI Era
        </motion.h2>

        {/* Spacer to create more vertical distance */}
        <div className="h-8 md:h-16"></div>

        {/* Description paragraph with better contrast */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className={`text-xl max-w-3xl mx-auto mb-12 p-4 rounded-xl ${paragraphBg}`}
        >
          Generate high-quality, privacy-compliant synthetic data to
          accelerate your AI and machine learning projects. Powered by our
          novel ML model combining Gemini and DeepSeek architecture,
          backed by Carnegie Mellon professors.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{ pointerEvents: 'auto' }} // Enable pointer events for this element
          className="mt-6"
        >
          <Link 
            href="/waitlist" 
            className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-8 py-4 text-lg transition-colors duration-300 shadow-lg hover:shadow-xl"
          >
            Join Waitlist <FiArrowRight className="ml-2" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
