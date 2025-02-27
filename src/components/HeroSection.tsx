"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { useEffect, useState } from "react";
import StaticBackground from "./ui/StaticBackground";
import ClientOnly from "./ClientOnly";
import { isBrowser } from "@/utils/isBrowser";
import dynamic from "next/dynamic";

// Import the vanilla Three.js components with dynamic imports to prevent any SSR loading
const VanillaThreeBackground = dynamic(
  () => import("./three/VanillaThreeBackground"),
  { ssr: false }
);

const VanillaThreeDecagon = dynamic(
  () => import("./three/VanillaThreeDecagon"),
  { ssr: false }
);

// Simple placeholders
const DecagonModelPlaceholder = () => (
  <div className="h-[900px] w-full translate-y-20 flex items-center justify-center">
    <div className="w-full h-full rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Loading 3D Model...</div>
    </div>
  </div>
);

export default function HeroSection() {
  // Track mouse position for particle effects
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    // Skip if not in browser
    if (!isBrowser()) return;
    
    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      // Convert mouse position to normalized coordinates (-1 to 1)
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center w-full z-20 overflow-hidden">
      {/* Background with client-only wrapper */}
      <div className="absolute inset-0 w-full h-full z-0">
        <ClientOnly fallback={<StaticBackground />}>
          <VanillaThreeBackground />
        </ClientOnly>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative flex flex-col lg:flex-row items-center justify-between z-10 py-12 lg:py-24">
        {/* Left text content */}
        <div className="w-full lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 dark:text-white">
            Data Synthesis <span className="text-blue-600 dark:text-blue-400">Reimagined</span>
          </h1>
          <p className="text-xl mb-8 text-gray-700 dark:text-gray-300 max-w-2xl mx-auto lg:mx-0">
            Generate production-quality synthetic datasets with our advanced cloud-native platform. Designed for developers and data scientists who need realistic data without privacy risks.
          </p>
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            <a
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-3 text-lg transition-colors duration-300"
            >
              Get Started
            </a>
            <a
              href="/docs"
              className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-lg px-6 py-3 text-lg transition-colors duration-300"
            >
              Documentation
            </a>
          </div>
        </div>

        {/* Right 3D model */}
        <div className="w-full lg:w-1/2 relative">
          <div className="aspect-square w-full max-w-lg mx-auto">
            <ClientOnly fallback={<DecagonModelPlaceholder />}>
              <VanillaThreeDecagon />
            </ClientOnly>
          </div>
        </div>
      </div>
    </section>
  );
}
