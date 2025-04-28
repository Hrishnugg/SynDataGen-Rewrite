"use client"; // Add the directive

import React from 'react';
import Link from 'next/link'; // Import Link
import { TextGenerateEffect } from "@/components/ui/text-generate-effect"; // Import the effect component
// import { BackgroundBeams } from "@/components/ui/background-beams"; // Removed BackgroundBeams import
import { Footer } from "@/components/landing/footer"; // Import Footer
import { GlowingEffect } from "@/components/ui/glowing-effect"; // Import GlowingEffect
import { Button as MagicButton } from "@/components/ui/bmagic-button"; // Import the magic button
import { ShootingStars } from "@/components/ui/shooting-stars"; // Import ShootingStars
import { StarsBackground } from "@/components/ui/stars-background"; // Import StarsBackground

export default function PricingPage() {
  const pageTitle = "Pricing Plans";
  const pageSubtitle = "Choose the plan that fits your needs.";

  return (
    // Main wrapper for relative positioning context and full height/bg
    <div className="relative min-h-screen w-full bg-black overflow-hidden">
      {/* New background effects covering the entire page */}
      <StarsBackground className="absolute inset-0 z-0" />
      <ShootingStars className="absolute inset-0 z-0" />
      {/* <BackgroundBeams className="absolute inset-0 z-0" /> Removed BackgroundBeams */}
      {/* Wrapper for content, layered above beams */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Hero Section - Removed relative and h-[20rem] */}
        <div className="flex flex-col items-center text-center pt-32 mb-16">
          {/* Removed BackgroundBeams from here */}
          <div className="w-full max-w-3xl flex flex-col items-center">
            <h1 className="text-7xl font-bold text-white mb-4">{pageTitle}</h1>
            <TextGenerateEffect
              words={pageSubtitle}
              className="text-xl font-semibold text-gray-300 mb-4"
            />
          </div>
        </div>

        {/* Pricing Tiers Section Placeholder - Added flex-grow */}
        <div className="mb-48 text-center px-8 flex-grow">
          <h2 className="text-5xl font-bold mb-12 text-white">Our Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Basic Plan */}
            <div className="relative group isolate flex flex-col rounded-2xl bg-gradient-to-br from-black to-[#060e25] shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)] p-8">
               <GlowingEffect disabled={false} glow={true} className="rounded-2xl" />
               <h3 className="text-2xl font-bold mb-4 text-white">Basic</h3>
               <p className="text-gray-400 mb-6">Ideal for individuals and small teams starting out.</p>
               <p className="text-4xl font-bold text-white mb-6">$20/month</p>
               <ul className="text-gray-400 space-y-2 mb-8 text-center flex-grow">
                 <li>250,000 Records Monthly</li>
               </ul>
               <MagicButton className="mt-auto">
                 Get Started
               </MagicButton>
             </div>
             {/* Pro Plan */}
             <div className="relative group isolate flex flex-col rounded-2xl bg-gradient-to-br from-black to-[#060e25] shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)] p-8">
               <GlowingEffect disabled={false} glow={true} className="rounded-2xl" />
               <h3 className="text-2xl font-bold mb-4 text-white">Pro</h3>
               <p className="text-gray-400 mb-6">Perfect for growing businesses and professionals.</p>
               <p className="text-4xl font-bold text-white mb-6">$80/month</p>
               <ul className="text-gray-400 space-y-2 mb-8 text-center flex-grow">
                 <li>1,000,000 Records Monthly</li>
               </ul>
               <MagicButton className="mt-auto">
                 Choose Pro
               </MagicButton>
             </div>
             {/* Ultra Plan */}
             <div className="relative group isolate flex flex-col rounded-2xl bg-gradient-to-br from-black to-[#060e25] shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)] p-8">
               <GlowingEffect disabled={false} glow={true} className="rounded-2xl" />
               <h3 className="text-2xl font-bold mb-4 text-white">Ultra</h3>
               <p className="text-gray-400 mb-6">For power users needing advanced capabilities.</p>
               <p className="text-4xl font-bold text-white mb-6">$200/month</p>
               <ul className="text-gray-400 space-y-2 mb-8 text-center flex-grow">
                 <li>5,000,000 Records Monthly</li>
               </ul>
               <MagicButton className="mt-auto">
                 Go Ultra
               </MagicButton>
             </div>
             {/* Enterprise Plan */}
             <div className="relative group isolate flex flex-col rounded-2xl bg-gradient-to-br from-black to-[#060e25] shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)] p-8 md:col-span-3">
               <GlowingEffect disabled={false} glow={true} className="rounded-2xl" />
               <h3 className="text-2xl font-bold mb-4 text-white">Enterprise</h3>
               <p className="text-gray-400 mb-6">Custom solutions, dedicated infrastructure, and premium support for large-scale deployments.</p>
               <p className="text-4xl font-bold text-white mb-6">Contact Us</p>
               <ul className="text-gray-400 space-y-2 mb-8 text-center flex-grow">
                 <li>White Glove Services</li>
                 <li>Custom Integrations</li>
                 <li>Volume Discounts</li>
                 <li>Advanced Security Options</li>
               </ul>
               <Link href="/#waitlist" className="mt-auto" legacyBehavior>
                 <MagicButton>
                   Contact Sales
                 </MagicButton>
               </Link>
             </div>
           </div>
        </div>

        <Footer /> {/* Footer pushed to bottom by flex-grow */}
      </div>
    </div>
  );
} 