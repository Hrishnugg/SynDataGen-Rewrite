"use client";

import * as React from "react";
import { useRef } from "react";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TextAnimate } from "@/components/magicui/text-animate";
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

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

// Define content for the StickyScroll component based on the pipeline description
const pipelineContent = [
  {
    title: "1. Pre-processing & Curation",
    description:
      "Input data is chunked for efficient batch processing. We then assess data quality and carefully curate a refined dataset optimized for few-shot learning by our downstream generation models.",
    content: null, // Optional: Add React components or images here later
  },
  {
    title: "2. PII Identification with Gemini",
    description:
      "Utilizing a fine-tuned Gemini Flash 2.5 model (ideally distilled) with its full 1M token context window, we rapidly identify and mark Personally Identifiable Information (PII) and Protected Health Information (PHI) across massive datasets. Gemini's superior needle-in-a-haystack capability ensures high accuracy, while techniques like LoRA minimize fine-tuning costs.",
    content: null,
  },
  {
    title: "3. Privacy via Anonymization",
    description:
      "Marked data undergoes rigorous anonymization using differential privacy techniques like DP-SGD. We introduce carefully calibrated noise via Laplace or Gaussian distributions to guarantee privacy while preserving the essential statistical characteristics and utility of the original data.",
    content: null,
  },
  {
    title: "4. Synthetic Data Generation with DeepSeek",
    description:
      "A fine-tuned DeepSeek R1 model processes the anonymized data to generate high-fidelity synthetic data. As a frontier reasoner model, DeepSeek R1 excels at understanding complex patterns and relationships within the data, leading to synthetic datasets achieving 90-95% accuracy. This leverages the model's reasoning capabilities for superior quality generation, optimized further through cost-effective LoRA fine-tuning.",
    content: null,
  },
];

export default function TidePage() {
  const scrollContainerRef = useRef(null);

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

      {/* Tall Container for Scroll Pinning Effect */}
      <div ref={scrollContainerRef} className="relative h-[400vh] bg-black">
        <StickyScroll content={pipelineContent} scrollContainerRef={scrollContainerRef} />
      </div>

      {/* Placeholder for future sections below the pinned section */}
      <section className="h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
        <h2 className="text-center text-3xl font-bold text-black dark:text-white">
          Next Section After Pipeline
        </h2>
      </section>

      {/* <Footer /> You might want to add a shared footer later */}
    </div>
  );
} 