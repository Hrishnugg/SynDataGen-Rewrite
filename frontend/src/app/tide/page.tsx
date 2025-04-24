"use client";

import * as React from "react";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { PipelineScroll } from "@/components/ui/pipeline-scroll";
import Image from "next/image";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { ChatSection } from "@/components/tide/chat-section";
import { Footer } from "@/components/landing/footer";
import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";

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

// Placeholder definitions for Chat Input
const chatPlaceholders = [
  "Ask Tide: What are the key trends in my dataset?",
  "Generate a report comparing Q1 and Q2 sales.",
  "Identify potential outliers in user activity.",
  "Explain the PII anonymization process.",
  "How accurate is the generated synthetic data?",
];

const handleChatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log("Chat input changed:", e.target.value);
  // Placeholder function - implement actual logic later
};

const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  console.log("Chat form submitted");
  // Placeholder function - implement actual logic later
};

// Re-add pipelineContent definition
const pipelineContent = [
  {
    title: "1. Pre-processing & Curation",
    description:
      "Input data is chunked for efficient batch processing. We then assess data quality and carefully curate a refined dataset optimized for few-shot learning by our downstream generation models.",
    content: null, // Placeholder for potential future visual content
  },
  {
    title: "2. PII Identification with Gemini",
    description:
      "Utilizing a fine-tuned Gemini Flash 2.5 model with its full 1M token context window, we rapidly identify PII and PHI across massive datasets. Gemini's superior needle-in-a-haystack capability ensures high accuracy, while LoRA minimizes fine-tuning costs.",
    content: null,
  },
  {
    title: "3. Privacy via Anonymization",
    description:
      "Marked data undergoes rigorous anonymization using differential privacy techniques like DP-SGD. We introduce carefully calibrated noise via Laplace or Gaussian distributions to guarantee privacy while preserving the essential statistical characteristics.",
    content: null,
  },
  {
    title: "4. Synthetic Data Generation with DeepSeek",
    description:
      "A fine-tuned DeepSeek R1 model processes the anonymized data to generate high-fidelity synthetic data. Its reasoning capabilities excel at understanding complex patterns, leading to synthetic datasets achieving 90-95% accuracy, optimized via cost-effective LoRA fine-tuning.",
    content: null,
  },
];

export default function TidePage() {
  return (
    <div className="flex flex-col min-h-screen bg-black relative">
      {/* Add both star components as background layers */}
      <StarsBackground className="absolute inset-0 z-0" />
      <ShootingStars className="absolute inset-0 z-0" />

      {/* Hero Section based on ThreeDMarqueeDemoSecond structure */}
      <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden z-10">
        {/* Semi-transparent overlay for text readability */}
        <div className="absolute inset-0 z-10 h-full w-full bg-gradient-to-b from-black/60 via-black/80 to-black/90" />

        {/* Marquee Background */}
        <ThreeDMarquee
          className="pointer-events-none absolute inset-0 h-full w-full"
          images={marqueeImages}
        />

        {/* Overlay Content - Centered */}
        <div className="relative z-20 flex flex-col items-center px-4">
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold text-center text-white mb-6 flex items-center justify-center flex-wrap">
            Meet <AuroraText colors={['#14b8a6', '#4ade80', '#14b8a6']} className="ml-4">Tide</AuroraText>
            <img 
              src="/tide 3d transparent.png" 
              alt="Tide Logo" 
              className="inline-block h-16 md:h-20 lg:h-24 w-auto ml-2 md:ml-4 align-middle"
            />
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

      {/* Use the new PipelineScroll component */}
      <PipelineScroll content={pipelineContent} />

      {/* New Data Visualizer Section */}
      <section className="py-20 bg-black">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center px-4">
          {/* Left Column: Text */}
          <div className="text-neutral-800 dark:text-neutral-200">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore Your Data Visually
            </h2>
            <p className="text-base md:text-lg mb-6">
              Tide includes a powerful, interactive visualizer. Dive deep into
              your generated datasets, compare distributions, identify correlations,
              and validate data quality with intuitive charts and summaries.
              Ensure your synthetic data perfectly aligns with real-world patterns
              before deployment.
            </p>
            {/* Optional: Add a button or link here if needed */}
            {/* <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Learn More</button> */}
          </div>

          {/* Right Column: Image Placeholder */}
          <div className="flex justify-center md:justify-end">
            <Image
              src="/placeholder-visualizer-large.jpg" // Placeholder for large visualizer
              alt="Data Visualizer Interface Placeholder"
              width={700} // Larger width
              height={438} // Corresponding height (16:10 ratio)
              className="rounded-lg shadow-xl object-cover w-full h-auto max-w-2xl" // Ensure responsiveness
            />
          </div>
        </div>
      </section>
      {/* End New Data Visualizer Section */}

      {/* Integrate the new ChatSection component */}
      <ChatSection
        placeholders={chatPlaceholders}
        onChange={handleChatChange}
        onSubmit={handleChatSubmit}
      />

      {/* Re-add placeholder section for scroll-out verification */}
      <section className="h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        <h2 className="text-center text-3xl font-bold text-black dark:text-white">
          Next Section After Pipeline
        </h2>
      </section>

      <Footer />
    </div>
  );
} 