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
import { WaitlistForm } from "@/components/forms/WaitlistForm";
import { Button } from "@/components/shadcn/button";
import { IconX } from "@tabler/icons-react";

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  if (!isOpen) return null;

  const handleFormSubmitted = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 overflow-hidden border-none shadow-none bg-transparent">
        <DialogHeader className="absolute left-4 top-4 text-left text-white opacity-0 pointer-events-none">
          <DialogTitle>Join the Waitlist</DialogTitle>
          <DialogDescription>
            Fill out the form below to join the waitlist for early access.
          </DialogDescription>
        </DialogHeader>

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
        
        <WaitlistForm onSubmitted={handleFormSubmitted} />
      </DialogContent>
    </Dialog>
  );
} 