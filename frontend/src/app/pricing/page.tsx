"use client"; // Add the directive

import React from 'react';
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"; // Import the effect component
import { BackgroundBeams } from "@/components/ui/background-beams"; // Import BackgroundBeams
import { Footer } from "@/components/landing/footer"; // Import Footer

export default function PricingPage() {
  const pageTitle = "Pricing Plans";
  const pageSubtitle = "Choose the plan that fits your needs.";

  return (
    <>
      {/* Hero Section */}
      <div className="relative flex flex-col items-center text-center pt-32 mb-16 h-[20rem]"> {/* Adjusted height */}
        <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
        <div className="relative z-10 w-full max-w-3xl flex flex-col items-center">
          <h1 className="text-7xl font-bold text-white mb-4">{pageTitle}</h1>
          <TextGenerateEffect
            words={pageSubtitle}
            className="text-xl font-semibold text-gray-300 mb-4"
          />
        </div>
      </div>

      {/* Pricing Tiers Section Placeholder */}
      <div className="mb-48 text-center px-8">
        <h2 className="text-5xl font-bold mb-12 text-white">Our Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Placeholder for Plan 1 */}
          <div className="bg-neutral-800 p-8 rounded-lg border border-neutral-700">
            <h3 className="text-2xl font-bold mb-4 text-white">Basic</h3>
            <p className="text-gray-400 mb-6">Ideal for individuals and small teams starting out.</p>
            <p className="text-4xl font-bold text-white mb-6">$X/month</p>
            <ul className="text-gray-400 space-y-2 mb-8 text-left">
              <li>Feature A</li>
              <li>Feature B</li>
              <li>Feature C</li>
            </ul>
            <button className="bg-teal-500 text-white px-6 py-2 rounded hover:bg-teal-600 transition-colors">
              Get Started
            </button>
          </div>
          {/* Placeholder for Plan 2 */}
          <div className="bg-neutral-800 p-8 rounded-lg border border-neutral-700">
            <h3 className="text-2xl font-bold mb-4 text-white">Pro</h3>
            <p className="text-gray-400 mb-6">Perfect for growing businesses and professionals.</p>
            <p className="text-4xl font-bold text-white mb-6">$Y/month</p>
            <ul className="text-gray-400 space-y-2 mb-8 text-left">
              <li>All Basic Features</li>
              <li>Feature D</li>
              <li>Feature E</li>
            </ul>
            <button className="bg-teal-500 text-white px-6 py-2 rounded hover:bg-teal-600 transition-colors">
              Choose Pro
            </button>
          </div>
          {/* Placeholder for Plan 3 */}
          <div className="bg-neutral-800 p-8 rounded-lg border border-neutral-700">
            <h3 className="text-2xl font-bold mb-4 text-white">Enterprise</h3>
            <p className="text-gray-400 mb-6">Tailored solutions for large organizations.</p>
            <p className="text-4xl font-bold text-white mb-6">Contact Us</p>
             <ul className="text-gray-400 space-y-2 mb-8 text-left">
              <li>All Pro Features</li>
              <li>Feature F</li>
              <li>Dedicated Support</li>
            </ul>
           <button className="bg-teal-500 text-white px-6 py-2 rounded hover:bg-teal-600 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>

      {/* Add more sections as needed */}
      <Footer /> {/* Add Footer component */}
    </>
  );
} 