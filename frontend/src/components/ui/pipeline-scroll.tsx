"use client";
import React, { useEffect, useRef, useState } from "react";
// Using non-framer motion imports to avoid potential issues
import { useMotionValueEvent, useScroll } from "motion/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import AnimeVisualizer from "./AnimeVisualizer"; // Import the new component
import { StarsBackground } from "./stars-background"; // Import stars
import { ShootingStars } from "./shooting-stars"; // Import shooting stars

// Define the props type - simplified as it manages its own scroll
type PipelineScrollProps = {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode | any;
  }[];
  contentClassName?: string; // Keep this for optional styling of the right pane
};

// Rename component to PipelineScroll
export const PipelineScroll = ({
  content,
  contentClassName,
}: PipelineScrollProps) => {
  const [activeCard, setActiveCard] = React.useState(0);
  // Ref for the tall outer container that drives the scroll animation
  const outerContainerRef = useRef<HTMLDivElement>(null);
  // Ref for the sticky content wrapper (might be useful for positioning/offsets later)
  const contentRef = useRef<HTMLDivElement>(null);

  // useScroll now targets the outer container within this component
  const { scrollYProgress } = useScroll({
    target: outerContainerRef,
    offset: ["start start", "end end"], // Animate over the full height of the outer container
  });
  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    // Calculate based on progress (0 to 1) * number of cards to get the current index
    const currentCardIndex = Math.min(Math.floor(latest * cardLength), cardLength - 1);
    setActiveCard(currentCardIndex);

    // --- Alternative calculation using closest breakpoint (can be less smooth) ---
    // const closestBreakpointIndex = cardsBreakpoints.reduce(
    //   (acc, breakpoint, index) => {
    //     const distance = Math.abs(latest - breakpoint);
    //     if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
    //       return index;
    //     }
    //     return acc;
    //   },
    //   0,
    // );
    // setActiveCard(closestBreakpointIndex);
  });

  // Removed backgroundColors, linearGradients, and related state/effect

  // Determine the height multiplier based on the number of content items
  // e.g., 4 items might correspond to 400vh. Adjust multiplier as needed for feel.
  const heightMultiplier = content.length * 100; // 100vh per item

  return (
    // Tall outer container with black background, drives the scroll effect
    <div
      ref={outerContainerRef}
      className="relative bg-black" // Relative positioning already present
      style={{ height: `${heightMultiplier}vh` }} 
    >
      {/* Add star backgrounds here, behind the sticky content */}
      <StarsBackground className="absolute inset-0 z-0" />
      <ShootingStars className="absolute inset-0 z-0" />

      {/* Sticky container for the content */}
      {/* Added z-10 to ensure content is above stars */}
      <div ref={contentRef} className="sticky top-0 flex h-screen items-center justify-center space-x-10 overflow-hidden p-10 z-10">
         {/* Left Text Column - Modified for single item fade animation */}
         <div className="relative flex items-center px-4" style={{ height: 'auto' }}> {/* Ensure this container doesn't impose height, let items-center work */}
           <div className="w-2xl"> {/* Changed max-w-2xl to w-2xl for consistent spacing */}
             {/* Render only the active card's content, wrapped in motion.div for animation */}
             {content[activeCard] && (
                <motion.div
                    key={activeCard} // Trigger animation on change
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }} // Added ease for smoother animation
                 >
                    <h2
                     // Removed motion props, handled by parent
                     className="text-4xl font-bold text-slate-100"
                   >
                     {content[activeCard].title}
                   </h2>
                    <p
                     // Removed motion props, handled by parent
                     className="text-xl mt-10 max-w-sm text-slate-300"
                   >
                     {content[activeCard].description}
                   </p>
                  </motion.div>
             )}
           </div>
         </div>
         {/* Right Content Area - Replaced with AnimeVisualizer */}
         <div
           // Removed background style and direct content rendering
           // Keep size and layout classes, pass contentClassName if needed for border/etc.
           className={cn(
             "hidden h-120 w-120 overflow-hidden rounded-md lg:block", // Keep base layout
             "bg-black/50 backdrop-blur-md", // Add semi-transparent black and backdrop blur
             contentClassName,
           )}
         >
           {/* Render the AnimeVisualizer, passing the active card index */}
           <AnimeVisualizer activeSectionIndex={activeCard} />
         </div>
      </div>
    </div>
  );
}; 