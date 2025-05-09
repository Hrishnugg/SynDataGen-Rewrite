"use client"; // Add the directive

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image'; // Import the Next.js Image component
import Link from 'next/link'; // Import Link
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"; // Import the effect component
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials"; // Import testimonials component
import { WorldMap } from "@/components/ui/world-map"; // Import the world map component
import { TealMagicButton } from "@/components/ui/bmagic-button-teal";
// Import the original button component
import { Button as MagicButton } from "@/components/ui/bmagic-button";
// Import BackgroundBeams
import { BackgroundBeams } from "@/components/ui/background-beams"; // Import BackgroundBeams
import { Footer } from "@/components/landing/footer"; // Import Footer
import './about-animations.css'; // Import the CSS file
import { WaitlistModal } from "@/components/modals/WaitlistModal"; // Import the new modal


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
  const heroRef = useRef<HTMLDivElement>(null); // Ref for the hero section
  const testimonialsRef = useRef<HTMLDivElement>(null); // Ref for the testimonials section
  const mapRef = useRef<HTMLDivElement>(null); // Ref for the map section
  const [animationKey, setAnimationKey] = useState(0); // State for remounting effect
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false); // State for modal visibility


  useEffect(() => {
    const options = { threshold: 0 }; // Trigger as soon as 1px is visible

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-visible');
        } else {
          entry.target.classList.remove('section-visible');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, options);

    const elements = [heroRef.current, testimonialsRef.current, mapRef.current];
    
    elements.forEach(el => {
      if (el) observer.observe(el);
    });

    return () => {
      elements.forEach(el => {
        if (el) observer.unobserve(el);
      });
    };
  }, []); // Run only once on mount

  return (
    <>
      {/* Hero Section - Add initial visibility class? Or handle via CSS */}
      <div ref={heroRef} className="about-section relative flex flex-col items-center text-center pt-32 mb-96 h-[40rem]"> 
        {/* Remove motion wrapper */}
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" /> 
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
          {/* Remove motion wrapper */}
          <TextGenerateEffect
             words={newSubheading}
             className="text-xl font-semibold text-gray-300 mb-4 min-h-[60px]" 
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
            {/* Change Request a Demo button to open modal */}
            <MagicButton onClick={() => setIsWaitlistModalOpen(true)}> 
              Request A Demo
            </MagicButton>
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
      <div ref={testimonialsRef} className="about-section mb-48"> 
        <h2 className="text-5xl font-bold mb-8 text-center text-white">Meet the Team</h2> 
        {/* Remove motion wrapper */}
        <AnimatedTestimonials testimonials={teamMembers} /> 
      </div>
      {/* Where we are Section */}
      <div ref={mapRef} className="about-section mb-48 text-center"> 
        <h2 className="text-5xl font-bold mb-8 text-white">Where We Are</h2>
        <div className="w-full max-w-4xl mx-auto"> 
         {/* Remove motion wrapper */} 
         <WorldMap dots={mapLocations} /> 
        </div>
      </div>
      {/* Rest of the about page content can go here */}
      <Footer /> {/* Add Footer component */}

      {/* Render Waitlist Modal Conditionally */}
      <WaitlistModal 
        isOpen={isWaitlistModalOpen} 
        onClose={() => setIsWaitlistModalOpen(false)} 
      />
    </>
  );
} 