"use client"; // Add the directive

import React, { useState, useEffect } from 'react';
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
import { BackgroundBeams } from "@/components/ui/background-beams"; // Import BackgroundBeams
import { Footer } from "@/components/landing/footer"; // Import Footer

// Define team members data
const teamMembers = [
  /*{
    name: "Joey Zeng",
    designation: "CEO & Co Founder",
    quote: "I think I might be allergic to grass.",
    src: "/joey.png", // Placeholder image path
  },*/
  {
    name: "Hrishikesh Hari",
    designation: "Co Founder",
    quote: "Sunbum Sunscreen actually tastes pretty good.",
    src: "/hrishy.png", // Placeholder for Shrek image
  },
  {
    name: "Sarah Yang",
    designation: "Co Founder",
    quote: "If your favorite dinosaur is a T-rex, you're a red flag.",
    src: "/sarahh.png", // Another placeholder image path
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
  const [animationKey, setAnimationKey] = useState(0); // State for remounting effect

  useEffect(() => {
    // Set up interval to change the key every 10 seconds
    const intervalId = setInterval(() => {
      setAnimationKey(prevKey => prevKey + 1);
    }, 10000); // 10 seconds

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Run only once on mount

  return (
    <>
      {/* Hero Section - Updated Layout */}
      {/* Use flex-row, items-center, justify-between */}
      <div className="relative flex flex-col items-center text-center pt-32 mb-96 h-[40rem]"> {/* Add relative positioning and height */}
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" /> {/* Add BackgroundBeams */}
        {/* Add z-10 to ensure content is above beams */}
        <div className="relative z-10 w-full max-w-3xl flex flex-col items-center"> 
          <div className="flex items-center justify-center mb-6"> {/* Changed justify-center to justify-start */}
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
            key={animationKey} // Add key to force remount
            words={newSubheading}
            className="text-xl font-semibold text-gray-300 mb-4 min-h-[60px]" // Keep min-height and styles
            // duration prop can be used if needed, defaults to 0.5
          />
          <p className="text-lg text-gray-400 max-w-3xl mb-6"> {/* Add bottom margin to paragraph */}
            We are a synthetic data generation company called Synoptic. Synoptic has developed a three-stage synthetic data generation pipeline combining cutting-edge LLMs with privacy-preserving techniques. PII/PHI is accurately identified by Gemini Flash 2.5, anonymized via differential privacy, and then used by a distilled DeepSeek model to generate cost-effective, feature-preserving synthetic data.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4"> {/* Use flex and gap for spacing */}
            {/* Wrap TealMagicButton with Link */}
            <Link href="/tide">
              <TealMagicButton> {/* Existing button */}
                Meet Tide
              </TealMagicButton>
            </Link>
            {/* Add Request a Demo button with Link */}
            <Link href="/#waitlist"> {/* Updated Link to point to waitlist section on landing page */}
              <MagicButton> {/* Use original button component */}
                Request A Demo
              </MagicButton>
            </Link>
          </div>
        </div>

        {/* Right Content Block - Orbiting Circles REMOVED */}
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
      <div className="mb-48"> {/* Margin bottom for spacing */}
        <h2 className="text-5xl font-bold mb-8 text-center text-white">Meet the Team</h2> {/* Title styling */}
        <AnimatedTestimonials testimonials={teamMembers} />
      </div>

      {/* Where we are Section */}
      <div className="mb-48 text-center"> {/* Add margin bottom and center text */}
        <h2 className="text-5xl font-bold mb-8 text-white">Where We Are</h2>
        <div className="w-full max-w-4xl mx-auto"> {/* Wrapper div for sizing - Increased size */} 
         <WorldMap dots={mapLocations} /> {/* Pass locations to the map component */}
        </div>
      </div>

      {/* Rest of the about page content can go here */}
      <Footer /> {/* Add Footer component */}
    </>
  );
} 