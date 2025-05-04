"use client"; // Client component directive at the top

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { AuroraText } from "@/components/magicui/aurora-text";
import { ContactModal } from "@/components/modals/ContactModal";

// Define and export the NavbarWrapper component
export function NavbarWrapper() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const tideColors = ["#BBFAF5", "#69BECC", "#5CB9BF", "#2D98A0"];

  const navItems = [
    { 
      name: <AuroraText colors={tideColors}>Tide</AuroraText>,
      link: "/tide" 
    },
    { name: "Features", link: "/#features" },
    { name: "Pricing", link: "/pricing" },
    { name: "About", link: "/about" },
    { 
      name: "Contact", 
      onClick: () => {
        console.log("Setting isContactModalOpen = true");
        setIsContactModalOpen(true);
      }
    },
  ];

  return (
    <>
      <ResizableNavbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} onItemClick={() => setIsMobileMenuOpen(false)} />
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
            <Link href="/auth/signup" className="no-underline">
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
              onItemClick={() => {
                setIsMobileMenuOpen(false); 
              }}
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
              <Link href="/auth/signup" className="no-underline w-full">
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
      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </>
  );
} 