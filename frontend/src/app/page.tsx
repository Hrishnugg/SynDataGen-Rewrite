"use client";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Navbar as ResizableNavbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarLogo,
  NavbarButton,
} from "@/components/landing/resizable-navbar";
import { WavyBackground } from "@/components/ui/wavy-background";
import { SparklesCore } from "@/components/ui/sparkles";
import { Button as MagicButton } from "@/components/ui/bmagic-button";
import Link from "next/link";
import { FeaturesGrid } from '@/components/landing/features-grid';
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import WaitlistSection from "@/components/waitlist-section";
import { Footer } from "@/components/landing/footer";
import { LogosWithBlurFlip } from "@/components/landing/logos-with-blur-flip";

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navItems = [
    { name: "Features", link: "#features" },
    { name: "Partners", link: "#partners" },
    { name: "Contact", link: "#waitlist" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      <ResizableNavbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex gap-2 items-center">
            {isMounted ? (
              <HoverBorderGradient
                containerClassName="rounded-full"
                as="a"
                href="/auth/login"
                className="text-sm font-medium"
              >
                Login
              </HoverBorderGradient>
            ) : (
              <NavbarButton href="/auth/login" variant="secondary">
                Login
              </NavbarButton>
            )}
            <Link href="/auth/signup" className="no-underline" legacyBehavior>
              <button className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-sm font-medium leading-6 text-white inline-block">
                <span className="absolute inset-0 overflow-hidden rounded-full">
                  <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </span>
                <div className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-2 px-4 ring-1 ring-white/10 ">
                  <span>
                    Sign Up
                  </span>
                  <svg fill="none" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.75 8.75L14.25 12L10.75 15.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  </svg>
                </div>
                <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
              </button>
            </Link>
          </div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>
          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            <NavItems
              items={navItems}
              className="flex flex-col items-start gap-4"
              onItemClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="flex flex-col gap-2 w-full mt-4">
              {isMounted ? (
                <HoverBorderGradient
                  containerClassName="rounded-full w-full"
                  as="a"
                  href="/auth/login"
                  className="text-sm font-medium text-center"
                >
                  Login
                </HoverBorderGradient>
              ) : (
                <NavbarButton href="/auth/login" variant="secondary" className="w-full">
                  Login
                </NavbarButton>
              )}
              <Link href="/auth/signup" className="no-underline w-full" legacyBehavior>
                <button className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-sm font-medium leading-6 text-white inline-block w-full">
                  <span className="absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </span>
                  <div className="relative flex space-x-2 items-center justify-center z-10 rounded-full bg-zinc-950 py-2 px-4 ring-1 ring-white/10 ">
                    <span>
                      Sign Up
                    </span>
                    <svg fill="none" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg">
                       <path d="M10.75 8.75L14.25 12L10.75 15.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
                </button>
              </Link>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </ResizableNavbar>
      <WavyBackground id="top" className="flex-grow flex flex-col items-center justify-center pb-40">
         <h1 className="md:text-7xl text-4xl lg:text-8xl font-bold text-center text-white relative z-8 mb-4">
           Synoptic
         </h1>

         <div className="w-full md:w-[40rem] h-0 relative">
            <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
            <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
            <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
            <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />
         </div>

         <p className="text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto my-6 text-center text-lg relative z-10">
           Power your AI models, test applications, and ensure privacy with realistic, scalable synthetic data generated by Synoptic.
         </p>
         <div className="flex flex-col sm:flex-row items-center gap-4 mt-6 relative z-10">
           <Link href="#waitlist" legacyBehavior>
             <MagicButton>
                Request A Demo
             </MagicButton>
           </Link>
         </div>
      </WavyBackground>
      <div id="partners" className="-mt-8 mb-32 scroll-mt-10">
        <LogosWithBlurFlip />
      </div>
      <div id="features" className="mb-20 scroll-mt-55">
        <FeaturesGrid />
      </div>
      <div id="waitlist" className="mb-32 scroll-mt-20">
        <WaitlistSection />
      </div>
      <Footer />
    </div>
  );
}
