"use client";

import * as React from "react";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { PipelineScroll } from "@/components/ui/pipeline-scroll";

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

      {/* Re-add placeholder section for scroll-out verification */}
      <section className="h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        <h2 className="text-center text-3xl font-bold text-black dark:text-white">
          Next Section After Pipeline
        </h2>
      </section>

      {/* <Footer /> You might want to add a shared footer later */}
    </div>
  );
} 