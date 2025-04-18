"use client";
import React, { useEffect, useRef, useState } from "react";
// TODO: TEMPORARY WORKAROUND FOR https://github.com/framer/motion/issues/2978
// import { useMotionValueEvent, useScroll } from "framer-motion";
// import { motion } from "framer-motion";
import { useMotionValueEvent, useScroll } from "motion/react"; // Using non-framer version
import { motion } from "motion/react"; // Using non-framer version
import { cn } from "@/lib/utils";

// Define the props type to include scrollContainerRef
type StickyScrollProps = {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode | any;
  }[];
  contentClassName?: string;
  // Allow the ref object itself to be potentially null or hold an HTMLElement
  scrollContainerRef: React.RefObject<HTMLElement | null>;
};

export const StickyScroll = ({
  content,
  contentClassName,
  scrollContainerRef, // Destructure the prop
}: StickyScrollProps) => {
  const [activeCard, setActiveCard] = React.useState(0);
  // This ref might not be needed anymore, but keeping it for now in case we need to target the sticky element itself later
  const contentRef = useRef<any>(null);

  // Use the passed ref as the target for scroll progress
  const { scrollYProgress } = useScroll({
    target: scrollContainerRef, // Target the tall container from TidePage
    offset: ["start start", "end end"], // Map scroll 0-1 over the entire container height
  });
  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce(
      (acc, breakpoint, index) => {
        const distance = Math.abs(latest - breakpoint);
        if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
          return index;
        }
        return acc;
      },
      0,
    );
    setActiveCard(closestBreakpointIndex);
  });

  // Removed backgroundColors and linearGradients arrays and the useEffect for backgroundGradient
  // as the background is now handled by the parent container in TidePage.

  return (
    // This outer div is no longer a motion component and doesn't need the ref for scroll tracking
    <div className="relative h-full">
      {/* This div becomes sticky within the tall parent */}
      <div ref={contentRef} className="sticky top-0 flex h-screen items-center justify-center space-x-10 p-10">
        {/* Left Text Column */}
        <div className="relative flex items-start px-4">
          <div className="max-w-2xl">
            {content.map((item, index) => (
              <div key={item.title + index} className="my-20">
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: activeCard === index ? 1 : 0.3,
                  }}
                  className="text-2xl font-bold text-slate-100"
                >
                  {item.title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: activeCard === index ? 1 : 0.3,
                  }}
                  className="text-kg mt-10 max-w-sm text-slate-300"
                >
                  {item.description}
                </motion.p>
              </div>
            ))}
            {/* This div adds padding at the bottom of the text column to prevent abrupt ending */}
            <div className="h-40" /> 
          </div>
        </div>
        {/* Right Content Area (remains sticky alongside the text) */}
        <div
          // Removed style={{ background: backgroundGradient }}
          className={cn(
            "sticky top-10 hidden h-60 w-80 overflow-hidden rounded-md bg-white lg:block", // Kept original styles for the placeholder, adjust as needed
            contentClassName,
          )}
        >
          {/* Render content for the active card */}
          {content[activeCard].content ?? null}
        </div>
      </div>
    </div>
  );
};
