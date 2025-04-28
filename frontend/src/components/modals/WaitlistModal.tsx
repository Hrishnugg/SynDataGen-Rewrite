'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  // DialogFooter, // Removed as form has its own button
  // DialogClose, // Removed
} from "@/components/shadcn/dialog";
// import WaitlistSection from "@/components/waitlist-section"; // Removed old import
import { WaitlistForm } from "@/components/forms/WaitlistForm"; // Import the new form component
// import { Button } from '@/components/shadcn/button'; // Removed as form has its own button

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Removed padding/max-width from DialogContent as BackgroundGradient in form handles it */}
      <DialogContent className="bg-transparent border-none shadow-none p-0 overflow-hidden"> 
        {/* Removed DialogHeader as title/description are now in WaitlistForm */}
        
        {/* Render the waitlist form directly */}
        <WaitlistForm />

        {/* Removed DialogFooter and DialogClose */}
      </DialogContent>
    </Dialog>
  );
} 