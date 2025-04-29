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
      {/* Removed 'relative' and other custom styles to restore default positioning */}
      <DialogContent className="p-0 overflow-hidden border-none shadow-none bg-transparent"> {/* Keep p-0, remove relative */}
        {/* Add the close button */}
        <DialogClose asChild> 
          {/* Keep absolute positioning - should now be relative to dialog content area */}
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Close" 
            className="absolute top-4 right-4 z-50 text-white opacity-70 hover:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0" 
          >
            <IconX className="h-6 w-6" /> {/* Icon color inherits */} 
          </Button>
        </DialogClose>
        
        {/* Render the waitlist form directly */}
        <WaitlistForm onSubmitted={handleFormSubmitted} />
      </DialogContent>
    </Dialog>
  );
} 