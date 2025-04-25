"use client";

import React from "react";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { cn } from "@/lib/utils";

interface ChatSectionProps {
  placeholders: string[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export const ChatSection: React.FC<ChatSectionProps> = ({
  placeholders,
  onChange,
  onSubmit,
}) => {
  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center px-4">
        {/* Left Column: Chat Input */}
        <div className="flex flex-col items-start">
          {" "}
          {/* Consistent left alignment */}
          <h3 className="text-2xl font-semibold mb-1 text-neutral-300">
            Talk to Tide
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-left mb-3">
            Interact with your data using natural language.
          </p>
          <PlaceholdersAndVanishInput
            placeholders={placeholders}
            onChange={onChange}
            onSubmit={onSubmit}
          />
        </div>

        {/* Right Column: Text Description */}
        {/* Ensure text color contrasts with black background */}
        <div className="text-neutral-200 order-first md:order-last">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Chat with Your Data
          </h2>
          <p className="text-base md:text-lg mb-6">
            Go beyond dashboards. Tide's conversational AI allows you to ask
            questions, request summaries, generate reports, and gain deeper
            insights directly from your datasets. Understand complex patterns
            and get answers faster than ever before.
          </p>
        </div>
      </div>
    </section>
  );
}; 