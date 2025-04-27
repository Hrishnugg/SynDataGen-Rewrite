"use client";

import React from 'react';
import { Footer } from "@/components/landing/footer"; // Import Footer
import { BackgroundBeams } from "@/components/ui/background-beams"; // Import BackgroundBeams

export default function SocialsPage() {
  const pageTitle = "Connect With Us";
  const pageSubtitle = "Follow us on our social channels.";

  return (
    <>
      {/* Hero Section */}
      <div className="relative flex flex-col items-center text-center pt-32 mb-16 h-[20rem]"> {/* Adjusted height */}
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="relative z-10 w-full max-w-3xl flex flex-col items-center">
          <h1 className="text-7xl font-bold text-white mb-4">{pageTitle}</h1>
          <p className="text-xl font-semibold text-gray-300 mb-4">{pageSubtitle}</p>
          {/* Placeholder for social links/content */}
          <div className="mt-8">
            <p className="text-gray-400">Social media links coming soon!</p>
            {/* Example: <a href="#" className="text-teal-400 hover:text-teal-300 mx-2">LinkedIn</a> */}
            {/* Example: <a href="#" className="text-teal-400 hover:text-teal-300 mx-2">Twitter</a> */}
          </div>
        </div>
      </div>

      <Footer /> {/* Add Footer component */}
    </>
  );
} 