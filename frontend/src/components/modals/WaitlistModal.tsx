'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/shadcn/dialog";
// import WaitlistSection from "@/components/waitlist-section"; // Removed old import
import { WaitlistForm } from "@/components/forms/WaitlistForm"; // Import the new form component
import { Button } from "@/components/shadcn/button"; // Import Button for styling the close trigger
import { IconX } from "@tabler/icons-react"; // Import X icon

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  if (!isOpen) return null;

  // Handler to be called when the form is submitted successfully
  const handleFormSubmitted = () => {
    onClose(); // Call the original onClose passed from the parent page
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 overflow-hidden border-none shadow-none bg-transparent">
        {/* Add DialogHeader and DialogTitle for accessibility */}
        <DialogHeader className="sr-only"> {/* Use sr-only to hide visually but keep for screen readers */}
          <DialogTitle>Request Demo or Join Waitlist</DialogTitle>
          {/* Optional: Add a description if needed, also sr-only */}
          {/* <DialogDescription>Submit the form below.</DialogDescription> */}
        </DialogHeader>

        {/* Close button */}
        <DialogClose asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Close" 
            className="absolute top-4 right-4 z-50 text-white opacity-70 hover:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0" 
          >
            <IconX className="h-6 w-6" />
          </Button>
        </DialogClose>
        
        {/* Waitlist form */}
        <WaitlistForm onSubmitted={handleFormSubmitted} />
      </DialogContent>
    </Dialog>
  );
} 