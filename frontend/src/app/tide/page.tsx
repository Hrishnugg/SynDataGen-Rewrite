"use client";

import * as React from "react";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TextAnimate } from "@/components/magicui/text-animate";

// Define the base images provided by the user
const baseImages = [
  "/gcpdashboard1.png",
  "/gcpdashboard2.png",
  "/gcpdashboard3.png",
  "/gcpdashboard4.png",
  "/gcpdashboard5.png",
  "/dashboard.png",
];

// Repeat the base images to get exactly 48 total images (6 columns * 8 images/column)
const targetImageCount = 48;
const numRepetitions = Math.ceil(targetImageCount / baseImages.length); // Calculate how many full repetitions needed
let marqueeImages: string[] = []; // Explicitly type as string array
for (let i = 0; i < numRepetitions; i++) {
  marqueeImages = marqueeImages.concat(baseImages);
}
marqueeImages = marqueeImages.slice(0, targetImageCount); // Ensure exactly 48 images

export default function TidePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black">
      {/* Hero Section based on ThreeDMarqueeDemoSecond structure */}
      <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        {/* Semi-transparent overlay for text readability */}
        <div className="absolute inset-0 z-10 h-full w-full bg-gradient-to-b from-black/60 via-black/80 to-black/90" />

        {/* Marquee Background */}
        <ThreeDMarquee
          className="pointer-events-none absolute inset-0 h-full w-full"
          images={marqueeImages}
        />

        {/* Overlay Content - Centered */}
        <div className="relative z-20 flex flex-col items-center px-4">
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold text-center text-white mb-6">
            Meet <AuroraText colors={['#14b8a6', '#4ade80', '#14b8a6']}>Tide</AuroraText>
          </h1>

          <TextAnimate
            as="p"
            animation="slideUp"
            by="word"
            className="text-center text-lg md:text-xl lg:text-2xl text-neutral-300"
            once={false}
            startOnView={false}
          >
            The world's most cost-to-quality efficient data generation platform.
          </TextAnimate>
        </div>
      </div>

      {/* Placeholder for future sections */}
      {/* <section className="py-20">
        <h2 className="text-center text-3xl font-bold dark:text-white">Features</h2>
        {/* Feature content goes here */}
      {/* </section> */}

      {/* <Footer /> You might want to add a shared footer later */}
    </div>
  );
} 