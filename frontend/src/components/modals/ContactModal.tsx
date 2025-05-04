'use client';

import React from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/shadcn/dialog";
import { LiquidButton } from "@/components/animate-ui/buttons/liquid"; // Import LiquidButton
import { Button } from "@/components/shadcn/button"; // For the close icon button
import { IconX } from "@tabler/icons-react";
import { GlowingEffect } from "@/components/ui/glowing-effect"; // Import GlowingEffect

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  if (!isOpen) return null;

  const handleDemoClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent default button behavior if any
    onClose(); // Close the modal first
    // Use timeout to ensure modal closing animation finishes before scroll
    setTimeout(() => {
      const waitlistSection = document.getElementById('waitlist');
      if (waitlistSection) {
        waitlistSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Fallback if section not found (e.g., on a different page)
        window.location.href = '/#waitlist'; 
      }
    }, 150); // Adjust timeout as needed based on modal close animation duration
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Reset DialogContent styles - remove relative/overflow */}
      {/* Add p-0 to prevent default padding interfering with inner div */}
      <DialogContent className="sm:max-w-[475px] border-neutral-700 bg-black/50 backdrop-blur-lg p-1 border shadow-lg"> 
        {/* Inner wrapper for effect and content */}
        <div className="relative overflow-hidden rounded-lg bg-black text-white">
          {/* Place GlowingEffect inside wrapper */}
          <GlowingEffect 
            glow={true} 
            disabled={false} 
            className="rounded-lg" 
            spread={90}
            borderWidth={8}
            blur={8}
          />

          {/* Header inside wrapper (no z-index needed) */}
          <DialogHeader className="relative pt-6 px-6"> {/* Keep relative for positioning text */}
            <DialogTitle className="text-xl font-semibold">Contact Us</DialogTitle>
            <DialogDescription className="text-neutral-400 pt-2">
              Thank you for your interest in Synoptic Labs and our product Tide! Please select the option below that fits your needs best.
            </DialogDescription>
          </DialogHeader>
          
          {/* Footer inside wrapper (no z-index needed) */}
          <DialogFooter className="relative px-6 pb-6 pt-4 flex flex-col sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0">
            <a href="mailto:hello@synoptica.dev" className="w-full sm:w-auto">
              <LiquidButton variant="outline" size="default" className="w-full sm:w-auto border-primary text-primary hover:text-primary-foreground">
                Email
              </LiquidButton>
            </a>
            {/* We handle navigation manually after closing the modal */}
            <LiquidButton variant="default" size="default" className="w-full sm:w-auto" onClick={handleDemoClick}>
              Demo
            </LiquidButton>
          </DialogFooter>
        </div>
        {/* Default close button should still render correctly via DialogContent */}
      </DialogContent>
    </Dialog>
  );
} 