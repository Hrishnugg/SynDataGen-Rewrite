"use client"; // Add the directive

import React from 'react';
import Image from 'next/image'; // Import the Next.js Image component
import Link from 'next/link'; // Import Link
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"; // Import the effect component
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials"; // Import testimonials component
import { WorldMap } from "@/components/ui/world-map"; // Import the world map component
import { TealMagicButton } from "@/components/ui/bmagic-button-teal";
// Import the original button component
import { Button as MagicButton } from "@/components/ui/bmagic-button";
// Import OrbitingCircles
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";

// Define team members data
const teamMembers = [
  {
    name: "Joey Zeng",
    designation: "CEO & Co Founder",
    quote: "Astra inclinant, sed non obligant. The stars incline us, they do not blind us.",
    src: "/placeholder-person.png", // Placeholder image path
  },
  {
    name: "Hrishikesh Hari",
    designation: "CTO & Co Founder",
    quote: "Sunbum Sunscreen actually tastes pretty good.",
    src: "/shrek-placeholder.png", // Placeholder for Shrek image
  },
  {
    name: "Sarah Yang",
    designation: "Co Founder",
    quote: "If your favorite dinosaur is a T-rex, you're a red flag.",
    src: "/placeholder-person-2.png", // Another placeholder image path
  },
  // Add more team members here as needed
];

// Define locations for the world map
const mapLocations = [
  { start: { lat: 30.0, lng: -121.87 }, end: { lat: 40.44, lng: -79.99 } }, // Pleasanton -> Pittsburgh
  { start: { lat: 40.44, lng: -79.99 }, end: { lat: 41.50, lng: -81.69 } }, // Pittsburgh -> Cleveland
  { start: { lat: 38.50, lng: -76.69 }, end: { lat: 40.12, lng: -88.24 } }, // Cleveland -> Champaign
  { start: { lat: 35.12, lng: -73.24 }, end: { lat: 38.69, lng: -75.39 } }, // Champaign -> Georgetown
];

export default function AboutPage() {
  const newSubheading = "The Synthetic Data Company- The Future of Data Generated Today";

  return (
    <div className="container mx-auto px-4 py-16"> {/* Basic container and padding */}
      {/* Hero Section - Updated Layout */}
      {/* Use flex-row, items-center, justify-between */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-64">
        {/* Left Content Block */}
        <div className="w-full md:w-1/2 text-left">
          <div className="flex items-center justify-start mb-6"> {/* Changed justify-center to justify-start */}
            <Image
              src="/synopticlogo3d.png" // Path to the logo in the public directory
              alt="Synoptic Logo"
              width={100} // Specify width (adjust as needed)
              height={100} // Specify height (adjust as needed)
              className="mr-4" // Margin to the right of the logo
            />
            <h1 className="text-7xl font-bold text-white">Synoptic</h1> {/* Large white text */}
          </div>
          {/* Render TextGenerateEffect directly */}
          <TextGenerateEffect
            words={newSubheading}
            className="text-xl font-semibold text-gray-300 mb-4 min-h-[60px]" // Keep min-height and styles
            // duration prop can be used if needed, defaults to 0.5
          />
          <p className="text-lg text-gray-400 max-w-3xl mb-6"> {/* Add bottom margin to paragraph */}
            We are a synthetic data generation company called Synoptic. Synoptic has developed a three-stage synthetic data generation pipeline combining cutting-edge LLMs with privacy-preserving techniques. PII/PHI is accurately identified by Gemini Flash 2.5, anonymized via differential privacy, and then used by a distilled DeepSeek model to generate cost-effective, feature-preserving synthetic data.
          </p>
          <div className="mt-6 flex items-center gap-4"> {/* Use flex and gap for spacing */}
            <TealMagicButton> {/* Existing button */}
              Meet Tide
            </TealMagicButton>
            {/* Add Request a Demo button with Link */}
            <Link href="#waitlist"> {/* Link to waitlist section (adjust if needed) */}
              <MagicButton> {/* Use original button component */}
                Request A Demo
              </MagicButton>
            </Link>
          </div>
        </div>

        {/* Right Content Block - Orbiting Circles */}
        {/* Added relative positioning and size constraints */}
        <div className="w-full md:w-1/2 flex justify-center items-center relative h-96 mt-16 md:mt-0">
          <OrbitingCircles
            className="size-[30px] border border-slate-100/20 bg-slate-800/80"
            radius={180} // Increased radius
            duration={30} // Slower duration
          >
            {/* Placeholder Children - Replace with actual icons/images */}
            <div className="text-white text-xs">DB</div>
            <div className="text-white text-xs">AI</div>
            <div className="text-white text-xs">API</div>
            <div className="text-white text-xs">UI</div>
            <div className="text-white text-xs">?</div>
          </OrbitingCircles>
           {/* Optional: Central Element */}
           {/* <div className="absolute size-12 bg-slate-700 rounded-full"></div> */}
        </div>
      </div>

      {/* Mission Section - DELETE THIS BLOCK */}
      {/* 
      <div className="text-center mb-96">
        <h2 className="text-4xl font-bold mb-4 text-white">Mission</h2> 
        <TextGenerateEffect
          words="To bring about a new era of data generation."
          className="text-2xl text-gray-400"
        />
      </div>
      */}
      {/* End of deleted Mission Section block */}

      {/* Meet the Team Section */}
      <div className="mb-24"> {/* Margin bottom for spacing */}
        <h2 className="text-5xl font-bold mb-8 text-center text-white">Meet the Team</h2> {/* Title styling */}
        <AnimatedTestimonials testimonials={teamMembers} />
      </div>

      {/* Where we are Section */}
      <div className="mb-24 text-center"> {/* Add margin bottom and center text */}
        <h2 className="text-5xl font-bold mb-8 text-white">Where We Are</h2>
        <WorldMap dots={mapLocations} /> {/* Pass locations to the map component */}
      </div>

      {/* Rest of the about page content can go here */}
    </div>
  );
} 