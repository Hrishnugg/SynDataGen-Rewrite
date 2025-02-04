'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';
import AnimatedBackground from './AnimatedBackground';

const HeroSection = () => {
  const textRefs = {
    badge: useRef<HTMLDivElement>(null),
    title: useRef<HTMLHeadingElement>(null),
    subtitle: useRef<HTMLSpanElement>(null),
    description: useRef<HTMLParagraphElement>(null),
    cta: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    // Staggered animation for text elements
    const elements = Object.values(textRefs);
    elements.forEach((ref, index) => {
      if (ref.current) {
        ref.current.style.opacity = '0';
        ref.current.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
          if (ref.current) {
            ref.current.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            ref.current.style.opacity = '1';
            ref.current.style.transform = 'translateY(0)';
          }
        }, 200 * index);
      }
    });
  }, []);

  return (
    <section className="relative bg-white dark:bg-dark-primary overflow-hidden">
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 pt-32 pb-24 max-w-6xl">
        <div className="text-center mb-8">
          <div
            ref={textRefs.badge}
            className="inline-block bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-6"
          >
            🎉 Now in Public Beta
          </div>
          
          <h1 ref={textRefs.title} className="text-5xl md:text-7xl font-bold mb-8">
            <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 animate-gradient">
              Synthetic Data Generation
            </span>
            <span
              ref={textRefs.subtitle}
              className="block text-3xl md:text-4xl mt-4 text-gray-900 dark:text-white"
            >
              for the AI Era
            </span>
          </h1>
          
          <p
            ref={textRefs.description}
            className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto"
          >
            Generate high-quality, privacy-compliant synthetic data to accelerate your AI and machine learning projects. Powered by our novel ML model combining Gemini and DeepSeek architecture, backed by Carnegie Mellon professors.
          </p>
          
          <div
            ref={textRefs.cta}
            className="flex justify-center"
          >
            <Link
              href="#waitlist"
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all duration-300 min-w-[200px] hover:scale-105"
            >
              Join Waitlist
              <FiArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 