"use client";
import React, { useEffect, useRef, useState } from "react";
// Using non-framer motion imports to avoid potential issues
import { useMotionValueEvent, useScroll } from "motion/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

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
      className={cn("relative bg-black", `h-[${heightMultiplier}vh]`)} // Dynamically set height
    >
      {/* Sticky container for the content */}
      <div ref={contentRef} className="sticky top-0 flex h-screen items-center justify-center space-x-10 overflow-hidden p-10">
         {/* Left Text Column */}
         <div className="relative flex items-start px-4">
           <div className="max-w-2xl">
             {content.map((item, index) => (
               <div key={item.title + index} className="my-20"> {/* Adjust vertical spacing if needed */}
                 <motion.h2
                   initial={{ opacity: 0 }}
                   animate={{ opacity: activeCard === index ? 1 : 0.3 }}
                   className="text-2xl font-bold text-slate-100"
                 >
                   {item.title}
                 </motion.h2>
                 <motion.p
                   initial={{ opacity: 0 }}
                   animate={{ opacity: activeCard === index ? 1 : 0.3 }}
                   className="text-kg mt-10 max-w-sm text-slate-300" // Ensure text color contrasts with black bg
                 >
                   {item.description}
                 </motion.p>
               </div>
             ))}
             {/* Add padding at the bottom if needed, maybe less than before */}
             <div className="h-20" />
           </div>
         </div>
         {/* Right Content Area */}
         <div
           // Removed background style
           className={cn(
             "hidden h-60 w-80 overflow-hidden rounded-md bg-neutral-800 lg:block", // Changed bg-white to bg-neutral-800
             contentClassName,
           )}
         >
           {/* Render content based on activeCard */}
           {content[activeCard]?.content ?? null}
         </div>
      </div>
    </div>
  );
}; 