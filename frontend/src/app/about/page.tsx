"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// Import Buttons and Modal
import { TealMagicButton } from "@/components/ui/bmagic-button-teal";
import { Button as MagicButton } from "@/components/ui/bmagic-button";
import { WaitlistModal } from "@/components/modals/WaitlistModal";

// Import Background
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";

// Import AnimatedTestimonials
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";

// Import WorldMap
import { WorldMap } from "@/components/ui/world-map";

// Import Footer
import { Footer } from "@/components/landing/footer";

// --- Define Memoized Wrappers --- 
const MemoizedGridPattern = React.memo(AnimatedGridPattern);
const MemoizedTestimonials = React.memo(AnimatedTestimonials);
const MemoizedWorldMap = React.memo(WorldMap);
// --- End Memoized Wrappers --- 

// Define team members data
const teamMembers = [
  {
    name: "Hrishikesh Hari",
    designation: "Co Founder",
    quote: "Sunbum Sunscreen actually tastes pretty good.",
    src: "/hrishy.png",
  },
  {
    name: "Sarah Yang",
    designation: "Co Founder",
    quote: "If your favorite dinosaur is a T-rex, you're a red flag.",
    src: "/sarahh.png",
  },
  // Add more team members here if needed
];

// Define locations for the world map
const mapLocations = [
    { start: { lat: 30.0, lng: -121.87 }, end: { lat: 40.44, lng: -79.99 } }, // Pleasanton -> Pittsburgh
    { start: { lat: 40.44, lng: -79.99 }, end: { lat: 41.50, lng: -81.69 } }, // Pittsburgh -> Cleveland
    { start: { lat: 38.50, lng: -76.69 }, end: { lat: 40.12, lng: -88.24 } }, // Cleveland -> Champaign
    { start: { lat: 35.12, lng: -73.24 }, end: { lat: 38.69, lng: -75.39 } }, // Champaign -> Georgetown
];

export default function AboutPage() {
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const subheading = "The Synthetic Data Company - The Future of Data Generated Today";
  const description = "We are a synthetic data generation company called Synoptic. Synoptic has developed a three-stage synthetic data generation pipeline combining cutting-edge LLMs with privacy-preserving techniques. PII/PHI is accurately identified by Gemini Flash 2.5, anonymized via differential privacy, and then used by a distilled DeepSeek model to generate cost-effective, feature-preserving synthetic data.";

  return (
    <>
      {/* Hero Section Container */}
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-20 pb-20 md:pt-32 md:pb-32">
        {/* Background Grid - USE MEMOIZED VERSION */}
        <MemoizedGridPattern
          className="absolute inset-0 -z-10 h-full w-full fill-white/[0.05] stroke-white/[0.05] [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"
          numSquares={50}
          maxOpacity={0.1}
          duration={3}
          repeatDelay={1}
        />

        {/* Content Container */}
        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center px-4 text-center">
          {/* Logo and Title */}
          <div className="mb-6 flex items-center justify-center">
            <Image
              src="/synopticlogo3d.png"
              alt="Synoptic Logo"
              width={100}
              height={100}
              className="mr-4"
              priority
            />
            <h1 className="text-6xl font-bold text-white md:text-7xl">Synoptic</h1>
          </div>

          {/* Subheading */}
          <p className="mb-4 text-lg font-semibold text-gray-300 md:text-xl">
            {subheading}
          </p>

          {/* Description */}
          <p className="mb-8 max-w-3xl text-base text-gray-400 md:text-lg">
            {description}
          </p>

          {/* Buttons */}
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/tide">
              <TealMagicButton>Meet Tide</TealMagicButton>
            </Link>
            <MagicButton onClick={() => setIsWaitlistModalOpen(true)}>
              Request A Demo
            </MagicButton>
          </div>
        </div>
      </div>

      {/* Modal Component (conditionally rendered) */}
      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
      />

      {/* Meet the Team Section - USE MEMOIZED VERSION */}
      <div className="w-full py-16 md:py-24">
        <h2 className="mb-12 text-center text-4xl font-bold text-white md:text-5xl">
          Meet the Team
        </h2>
        <div className="px-4">
          <MemoizedTestimonials testimonials={teamMembers} />
        </div>
      </div>

      {/* Where We Are Section - USE MEMOIZED VERSION */}
      <div className="w-full py-16 text-center md:py-24">
        <h2 className="mb-12 text-4xl font-bold text-white md:text-5xl">
          Where We Are
        </h2>
        <div className="mx-auto w-full max-w-4xl px-4">
          <MemoizedWorldMap dots={mapLocations} />
        </div>
      </div>

      {/* Add Footer */}
      <Footer />
    </>
  );
} 