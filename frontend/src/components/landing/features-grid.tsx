"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { motion, useAnimationControls, Variants } from "motion/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { IconUpload, IconCheck } from "@tabler/icons-react";
import { TextRevealCard } from "@/components/ui/text-reveal-card";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { IntegrationSkeleton } from "./integration-skeleton";
import { PipelineSkeleton } from "./pipeline-skeleton";
import { PerformanceSkeleton } from "./performance-skeleton";

// Moved Card structure definitions before FeaturesGrid
const CardSkeletonBody = ({ children, className, }: { children: React.ReactNode; className?: string; }) => {
  return <div className={cn("flex-grow", className)}>{children}</div>;
};

const CardContent = ({ children, className, }: { children: React.ReactNode; className?: string; }) => {
  return <div className={cn("p-6", className)}>{children}</div>;
};

const CardTitle = ({ children, className, }: { children: React.ReactNode; className?: string; }) => {
  return ( <h3 className={cn("font-sans text-base font-medium tracking-tight text-neutral-800 dark:text-neutral-100", className)} > {children} </h3> );
};

const CardDescription = ({ children, className, }: { children: React.ReactNode; className?: string; }) => {
  return ( <p className={cn("mt-2 max-w-xs font-sans text-sm font-normal tracking-tight text-neutral-600 dark:text-neutral-400", className)} > {children} </p> );
};

const Card = ({ children, className, }: { children: React.ReactNode; className?: string; }) => {
  return (
    <motion.div 
      whileHover="animate" 
      className={cn( "relative group isolate flex flex-col rounded-2xl bg-gradient-to-br from-black to-[#060e25] shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]", className, )}
    >
      <GlowingEffect disabled={false} glow={true} className="rounded-2xl" /> 
      {children}
    </motion.div>
  );
};

// Rebuilding Skeleton for Realistic Data Card with refined loop
const RealisticDataSkeleton = () => {
  const controls = useAnimationControls();

  // Variants for the motion wrapper (controls fade + stagger)
  const wrapperVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.1 
      } 
    },
  };

  // Variants for individual rows (fade in + slide up)
  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }, // Added duration
  };

  const headers = ["ID", "Name", "Value"];
  const rowsData = [
    // Using 9 rows for a slightly shorter sequence example
    ["001", "Alpha", "12.34"],
    ["002", "Bravo", "56.78"],
    ["003", "Charlie", "90.12"],
    ["004", "Delta", "34.56"],
    ["005", "Echo", "78.90"],
    ["006", "Foxtrot", "21.09"],
    ["007", "Golf", "87.65"],
    ["008", "Hotel", "43.21"],
    ["009", "India", "09.87"],
    // Add 9 more rows
    ["010", "Juliet", "54.32"],
    ["011", "Kilo", "10.98"],
    ["012", "Lima", "76.54"],
    ["013", "Mike", "32.10"],
    ["014", "November", "98.76"],
    ["015", "Oscar", "54.32"],
    ["016", "Papa", "10.98"],
    ["017", "Quebec", "76.54"],
    ["018", "Romeo", "32.10"],
  ];

  // Animation timing
  const staggerDuration = rowsData.length * 0.1;
  const loopPause = 2000; // 2 seconds pause
  const fadeOutDuration = 500; // 0.5 seconds fade out

  useEffect(() => {
    let isMounted = true;
    const sequence = async () => {
      // Start hidden (setting initial state directly)
      controls.set("hidden");
      // Small delay before first animation
      await new Promise(resolve => setTimeout(resolve, 50)); 
      
      while (isMounted) {
        // 1. Animate wrapper to visible (triggers row stagger)
        await controls.start("visible");
        // 2. Wait for stagger animation + loop pause
        await new Promise(resolve => setTimeout(resolve, staggerDuration * 1000 + loopPause));
        if (!isMounted) break;
        // 3. Animate wrapper opacity to 0 (smooth fade out)
        await controls.start({ opacity: 0, transition: { duration: fadeOutDuration / 1000 } });
        // 4. Wait for fade out + buffer before reset/loop
        await new Promise(resolve => setTimeout(resolve, fadeOutDuration + 50));
        if (!isMounted) break;
        // 5. Instantly reset to hidden (no animation) before next loop
        controls.set("hidden"); 
      }
    };

    sequence();

    return () => {
      isMounted = false;
      controls.stop();
    };
  }, [controls, staggerDuration]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      {/* Glassy container (non-motion) */}
      <div className="w-full max-w-xs rounded-md border border-neutral-700 bg-gradient-to-br from-black to-[#060e25] p-3 shadow-inner">
        {/* Motion wrapper for content fade and stagger control */}
        <motion.div
          variants={wrapperVariants}
          initial="hidden"
          animate={controls}
        >
          {/* Header Row - Static inside motion wrapper */}
          <div className="grid grid-cols-3 gap-2 border-b border-neutral-600 pb-1 text-xs font-medium text-neutral-400 opacity-80">
            {headers.map((header) => (
              <div key={header} className="truncate text-center">{header}</div>
            ))}
          </div>

          {/* Body Rows - Inherit animation */}
          <div className="mt-2 space-y-1">
            {rowsData.map((row, rowIndex) => (
              <motion.div
                key={rowIndex}
                className="grid grid-cols-3 gap-2 text-xs text-neutral-200"
                variants={rowVariants}
                // Inherits initial/animate state from parent wrapper
              >
                {row.map((cell, cellIndex) => (
                  <div key={cellIndex} className="truncate rounded bg-neutral-700/50 px-1 py-0.5 text-center font-mono text-[10px]">{cell}</div>
                ))}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      <p className="mt-2 text-xs text-neutral-500">Generating data...</p>
    </div>
  );
};

// New Skeleton V1 for Scale Testing Card (Multiplying Icons)
const ScaleTestingSkeleton_V1 = () => {
  const controls = useAnimationControls();
  const numIcons = 9; // Grid of 3x3 icons
  const icons = Array.from({ length: numIcons });

  const wrapperVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 } // Faster stagger for icons
    },
  };

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { duration: 0.4 } 
    },
  };

  // Animation timing
  const staggerDuration = numIcons * 0.05;
  const loopPause = 1500; // 1.5 seconds pause
  const fadeOutDuration = 300; // 0.3 seconds fade out

  useEffect(() => {
    let isMounted = true;
    const sequence = async () => {
      controls.set("hidden");
      await new Promise(resolve => setTimeout(resolve, 50));
      while (isMounted) {
        await controls.start("visible");
        await new Promise(resolve => setTimeout(resolve, staggerDuration * 1000 + loopPause));
        if (!isMounted) break;
        await controls.start({ opacity: 0, transition: { duration: fadeOutDuration / 1000 } });
        await new Promise(resolve => setTimeout(resolve, fadeOutDuration + 50));
        if (!isMounted) break;
        controls.set("hidden");
      }
    };
    sequence();
    return () => { isMounted = false; controls.stop(); };
  }, [controls, staggerDuration]);

  return (
    <div className="flex h-full items-center justify-center p-4">
      <motion.div
        className="grid grid-cols-3 gap-4"
        variants={wrapperVariants}
        initial="hidden"
        animate={controls}
      >
        {icons.map((_, i) => (
          <motion.div key={i} variants={iconVariants} className="text-center">
            {/* Using IconCheck from tabler-icons */}
            <IconCheck size={24} className="mx-auto text-neutral-600 dark:text-neutral-400" /> 
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

// Rewriting Skeleton V2 for Scale Testing Card (Persistent Structure + Variant Control)
const ScaleTestingSkeleton_V2_Grid = () => {
  const controls = useAnimationControls();
  const [phase, setPhase] = useState<'initialPulsePhase' | 'gridFillPhase' | 'hidden'>('hidden');

  const rows = 7;
  const cols = 12;
  const totalCells = rows * cols;
  const cells = Array.from({ length: totalCells });

  // Animation timing constants
  const initialPulseDuration = 3000; // Increased from 2000ms 
  const cellStagger = 0.01; 
  const loopPause = 1000; 
  const fadeOutDuration = 500; // Increased fade duration
  const gridFillDuration = totalCells * cellStagger; 

  // Define green colors
  const initialGreen = "#047857"; // green-700
  const pulseGreen = "#4ade80"; // green-400

  // --- Parent Container Variants --- 
  const containerVariants: Variants = {
    hidden: {
      opacity: 0,
      transition: { duration: fadeOutDuration / 1000 } // Use updated duration
    },
    initialPulsePhase: {
      opacity: 1, 
      transition: { duration: 0.1 } 
    },
    gridFillPhase: {
      opacity: 1,
      transition: {
        staggerChildren: cellStagger,
        delayChildren: 0.1, 
      }
    }
  };

  // --- Cell Variants --- 
  const cellVariants: Variants = {
    hidden: { 
      opacity: 0, 
      scale: 0.5, 
      backgroundColor: initialGreen, 
      // Ensure fade duration matches container's exit
      transition: { duration: fadeOutDuration / 1000 } 
    },
    // Restore initial pulse definition within the variant
    initialPulsePhase: (i: number) => ({
      opacity: i === 0 ? 1 : 0, 
      scale: i === 0 ? 1 : 0.5,
      backgroundColor: i === 0 ? [initialGreen, pulseGreen, initialGreen] : initialGreen, 
      transition: {
        default: { duration: 0.1, delay: 0.1 }, 
        backgroundColor: i === 0 ? { 
          duration: 0.7, 
          repeat: Infinity, 
          repeatType: "mirror", 
          ease: "easeInOut", 
          delay: 0.2 
        } : { duration: 0 }
      }
    }),
    gridFillPhase: {
      opacity: 1,
      scale: 1,
      backgroundColor: pulseGreen,
      transition: { default: { duration: 0.4 } }
    }
  };

  // --- Animation Effects --- 

  // Effect 1: Manages the phase transitions over time (No changes needed here)
  useEffect(() => {
    let isMounted = true;
    const sequence = async () => {
      // Initial state sync
      setPhase("hidden");
      controls.set("hidden");
      await new Promise(r => setTimeout(r, 100)); 
      while (isMounted) {
        // Phase 1: Set phase, then trigger parent variant
        setPhase("initialPulsePhase");
        await controls.start("initialPulsePhase");
        await new Promise(r => setTimeout(r, initialPulseDuration));
        if (!isMounted) break;

        // Phase 2: Set phase, then trigger parent variant
        setPhase("gridFillPhase");
        await controls.start("gridFillPhase");
        await new Promise(r => setTimeout(r, gridFillDuration * 1000 + loopPause));
        if (!isMounted) break;

        // Phase 3: Trigger parent variant (hides cells)
        await controls.start("hidden");
        // Wait for the updated fade out duration + buffer
        await new Promise(r => setTimeout(r, fadeOutDuration + 100)); 
        if (!isMounted) break;
      }
    };
    sequence();
    return () => { isMounted = false; controls.stop(); };
    // Dependencies don't need phase here, as effect drives the phase
  }, [controls, initialPulseDuration, gridFillDuration, loopPause, fadeOutDuration]);

  // Effect 2: Triggers animations based on the current phase (Simplified Reset)
  useEffect(() => {
    if (phase === "gridFillPhase") {
      // Start the grid fill (staggered via container variant)
      controls.start("gridFillPhase");
    } else if (phase === "hidden") {
      // Start the exit animation (container variant handles fade)
      controls.start("hidden");
    } else if (phase === "initialPulsePhase") {
       // Start the initial pulse phase (container variant triggers cell 0)
       controls.start("initialPulsePhase");
    }
  }, [phase, controls]);

  return (
    <div className="flex h-full items-center justify-center p-4 min-h-[120px]">
      <motion.div
        key="persistent-grid-container" 
        className={`grid gap-1`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          width: "100%",
          maxWidth: "240px",
        }}
        variants={containerVariants} // Use parent variants
        initial="hidden"
        animate={controls} // Controlled by effect reacting to phase
      >
        {cells.map((_, i) => (
            <motion.div
              key={`cell-${i}`}
              custom={i}
              variants={cellVariants} // Use cell variants
              className="aspect-square rounded-[2px] bg-green-700"
              // REMOVED conditional animate prop
            />
        ))}
      </motion.div>
    </div>
  );
};

// New Skeleton V3 for Scale Testing Card (Particle Flow)
const ScaleTestingSkeleton_V3_Particles = () => {
  const controls = useAnimationControls();
  const numParticles = 50; // Number of particles in one burst
  const particles = Array.from({ length: numParticles });
  const containerSize = 160; // Approx size in px for calculating edges

  // Animation timing
  const emissionStagger = 0.02; // Time between particle emissions
  const particleDuration = 1.5; // Time for a particle to travel and fade (seconds)
  const loopPause = 500; // Pause after burst (ms)
  const fadeOutDuration = 300; // Container fade out (ms)

  const totalEmissionDuration = numParticles * emissionStagger;

  // Variants for the container to orchestrate stagger
  const wrapperVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: emissionStagger,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: fadeOutDuration / 1000 },
    },
  };

  // Variants for individual particles
  const particleVariants: Variants = {
    hidden: { 
      x: "0%", // Start at center horizontally (relative to own size)
      y: "0%", // Start at center vertically (relative to own size)
      opacity: 0, 
    },
    visible: () => { // Use function to generate random target per particle
      // Calculate random target position near edges
      const angle = Math.random() * Math.PI * 2;
      const radius = containerSize / 2 - 10; // Target near edge
      const targetX = Math.cos(angle) * radius;
      const targetY = Math.sin(angle) * radius;
      
      return {
        x: `${targetX}px`, // Animate transform x
        y: `${targetY}px`, // Animate transform y
        opacity: [0.7, 0], // Fade in slightly then fade out
        scale: [0.5, 1], // Pop in
        transition: {
          duration: particleDuration,
          ease: "linear", // Constant speed outwards
          opacity: { duration: particleDuration * 0.8, delay: particleDuration * 0.2 }, // Start fading later
          scale: { duration: 0.2 } // Quick pop
        },
      };
    },
  };

  // Animation sequence effect
  useEffect(() => {
    let isMounted = true;
    const sequence = async () => {
      controls.set("hidden");
      await new Promise((resolve) => setTimeout(resolve, 50));

      while (isMounted) {
        // 1. Start emission (stagger particles via container)
        await controls.start("visible");
        // 2. Wait for emission + particle lifetime + pause
        // Need to wait long enough for last particle to roughly finish
        await new Promise((resolve) =>
          setTimeout(resolve, (totalEmissionDuration + particleDuration) * 1000 + loopPause)
        );
        if (!isMounted) break;
        // 3. Fade out container (implicitly hides particles)
        await controls.start("exit");
        // 4. Wait for fade out + buffer
        await new Promise((resolve) =>
          setTimeout(resolve, fadeOutDuration + 50)
        );
        if (!isMounted) break;
        // 5. Reset instantly
        controls.set("hidden");
      }
    };

    sequence();

    return () => {
      isMounted = false;
      controls.stop();
    };
  }, [controls, totalEmissionDuration]); // Dependencies

  return (
    <div 
      className="relative flex h-full items-center justify-center overflow-hidden p-4" 
      style={{ width: `${containerSize}px`, height: `${containerSize}px`, margin: 'auto' }}
    >
      {/* Container to control particle staggering */}
      <motion.div
        className="absolute inset-0" // Covers the parent area
        variants={wrapperVariants}
        initial="hidden"
        animate={controls}
      >
        {particles.map((_, i) => (
          <motion.div
            key={i}
            variants={particleVariants}
            // Particles start hidden and animate to visible via parent stagger
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-blue-500"
            style={{ x: "-50%", y: "-50%" }} // Center the particle div itself initially
          ></motion.div>
        ))}
      </motion.div>
    </div>
  );
};

// Moved Skeleton definitions before FeaturesGrid
const SkeletonOne = () => {
    // Simplified SkeletonOne - Original logic remains for structure
    const avatars = [
        { src: "/next.svg", score: 69 },
        { src: "/next.svg", score: 94 },
        { src: "/next.svg", score: 92 },
        { src: "/next.svg", score: 98 },
      ];
    const [active, setActive] = useState(avatars[0]); // Start with first for simplicity

    useEffect(() => {
        const interval = setInterval(() => {
          setActive((prev) => {
            const currentIndex = avatars.indexOf(prev);
            const nextIndex = (currentIndex + 1) % avatars.length;
            return avatars[nextIndex];
          });
        }, 2000);
        return () => clearInterval(interval);
      }, []); // Added empty dependency array

    const Highlighter = () => { // ... (keep original Highlighter)
        return (
            <motion.div layoutId="highlighter" className="absolute inset-0">
              <div className="absolute -left-px -top-px h-4 w-4 rounded-tl-lg border-l-2 border-t-2 border-blue-500 bg-transparent"></div>
              <div className="absolute -right-px -top-px h-4 w-4 rounded-tr-lg border-r-2 border-t-2 border-blue-500 bg-transparent"></div>
              <div className="absolute -bottom-px -left-px h-4 w-4 rounded-bl-lg border-b-2 border-l-2 border-blue-500 bg-transparent"></div>
              <div className="absolute -bottom-px -right-px h-4 w-4 rounded-br-lg border-b-2 border-r-2 border-blue-500 bg-transparent"></div>
            </motion.div>
          );
    };
    const Score = () => { // ... (keep original Score)
        return (
            <motion.span
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5, repeat: 0 }} // reduced delay
              className="absolute inset-x-0 bottom-4 m-auto h-fit w-fit rounded-md border border-neutral-100 bg-white px-2 py-1 text-xs text-black"
            >
              score <span className="font-bold">{active.score}</span>
            </motion.span>
          );
    };

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 justify-center gap-4">
        {avatars.map((avatar, index) => (
          <motion.div
            key={`avatar-${index}-avatar-skeleton-one`}
            className="relative"
            animate={{ opacity: active.src === avatar.src ? 1 : 0.5, scale: active.src === avatar.src ? 0.95 : 1 }} // Simplified animation
            transition={{ duration: 0.5 }} // Faster transition
          >
            {active.src === avatar.src && <Highlighter />}
            {active.src === avatar.src && <Score />}
            <Image
              key={`avatar-${index}`}
              src={avatar.src} alt="avatar" width={100} height={140}
              className="h-[140px] w-full rounded-lg object-contain" // Adjusted height and object-fit
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SkeletonTwo = () => {
    // SkeletonTwo is no longer used directly by the FeaturesGrid for the Privacy card,
    // but might be used by Card 7 or other future cards. Keep it for now.
    // Simplified SkeletonTwo
     const Cursor = ({ // ... (keep original Cursor)
        className, textClassName, text,
      }: { className?: string; textClassName?: string; text?: string; }) => {
        return (
          <div className={cn("absolute z-30 h-4 w-4 transition-all duration-200", className)}>
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("h-4 w-4 transition duration-200", className)}>
              <path d="M3.08365 1.18326C2.89589 1.11581 2.70538 1.04739 2.54453 1.00558C2.39192 0.965918 2.09732 0.900171 1.78145 1.00956C1.41932 1.13497 1.13472 1.41956 1.00932 1.78169C0.899927 2.09756 0.965674 2.39216 1.00533 2.54477C1.04714 2.70562 1.11557 2.89613 1.18301 3.0839L5.9571 16.3833C6.04091 16.6168 6.12128 16.8408 6.2006 17.0133C6.26761 17.1591 6.42 17.4781 6.75133 17.6584C7.11364 17.8555 7.54987 17.8612 7.91722 17.6737C8.25317 17.5021 8.41388 17.1873 8.48469 17.0433C8.56852 16.8729 8.65474 16.6511 8.74464 16.4198L10.8936 10.8939L16.4196 8.74489C16.6509 8.655 16.8726 8.56879 17.043 8.48498C17.187 8.41416 17.5018 8.25346 17.6734 7.91751C17.8609 7.55016 17.8552 7.11392 17.6581 6.75162C17.4778 6.42029 17.1589 6.2679 17.0131 6.20089C16.8405 6.12157 16.6165 6.0412 16.383 5.9574L3.08365 1.18326Z" fill="var(--blue-900)" stroke="var(--blue-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className={cn("absolute left-3 top-3 whitespace-pre rounded-md p-1 text-[10px] text-neutral-500 transition duration-200", textClassName)}> {text ?? "User"} </div>
          </div>
        );
      };
      const Container = ({ // ... (keep original Container)
        className, children,
      }: { className?: string; children: React.ReactNode; }) => {
        return (
          <div className={cn("relative z-20 w-fit rounded-lg border border-neutral-100 p-0.5 shadow-sm dark:border-neutral-600", className)}>
            <div className={cn("flex h-10 items-center justify-center rounded-[5px] bg-neutral-100 px-2 text-xs text-neutral-600 shadow-lg dark:bg-[rgba(248,248,248,0.01)] dark:text-neutral-400",)}> {children} </div>
          </div>
        );
      };
      const CircleWithLine = ({ className }: { className?: string }) => { // ... (keep original CircleWithLine)
        const id = useId();
        return (
          <div className={cn("flex flex-col items-center justify-center", className)}>
            <div className={cn(`h-3 w-3 rounded-full border border-neutral-200 bg-neutral-100 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] dark:border-[rgba(255,255,255,0.2)] dark:bg-[rgba(248,248,248,0.02)]`,)}/>
            <svg xmlns="http://www.w3.org/2000/svg" width="2" height="100" viewBox="0 0 2 100" fill="none" className="h-24 dark:text-white"> {/* Reduced height */}
              <path d="M1 100V1" stroke={`url(#${id})`} strokeOpacity="0.1" strokeWidth="1.5" strokeLinecap="round" />
              <defs> <linearGradient id={id} x1="1.5" y1="1" x2="1.5" y2="100" gradientUnits="userSpaceOnUse"> <stop stopColor="currentColor" stopOpacity="0.05" /> <stop offset="0.530519" stopColor="currentColor" stopOpacity="0.5" /> <stop offset="1" stopColor="currentColor" stopOpacity="0.05" /> </linearGradient> </defs>
            </svg>
          </div>
        );
      };

    return (
        <div className="group/bento relative flex h-full flex-col justify-center overflow-hidden px-2 py-4"> {/* Adjusted padding/height */}
          <div className="absolute inset-0 flex h-full w-full flex-shrink-0 flex-row justify-center gap-2"> {/* Reduced gap */}
            {Array.from({ length: 7 }).map((_, i) => <CircleWithLine key={i} />)} {/* Simplified map */}
          </div>
          <Container className="ml-4 mt-2 self-start">Data Request</Container> {/* Adjusted text/margin */}
          <Container className="ml-16 mt-4 self-start transition duration-200 group-hover/bento:scale-[1.02] group-hover/bento:border-neutral-300 dark:group-hover/bento:border-neutral-500"> {/* Adjusted text/margin */}
            Processing...
          </Container>
           <Container className="ml-32 mt-4 self-start">Generation Complete</Container> {/* Added step */}
          <Cursor className="left-4 top-20 group-hover/bento:left-28" textClassName="group-hover/bento:text-neutral-500" /> {/* Adjusted position */}
        </div>
      );
};

const SkeletonThree = () => {
    // Simplified SkeletonThree - Using basic icons instead of images/beams
     return (
        <div className="flex h-full items-center justify-around p-4">
            <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center text-center text-neutral-500 dark:text-neutral-400">
                 <IconUpload size={32} />
                 <span className="mt-2 text-xs">API Endpoint</span>
            </motion.div>
             <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center text-center text-neutral-500 dark:text-neutral-400">
                 <IconUpload size={32} />
                 <span className="mt-2 text-xs">SDK Integration</span>
            </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center text-center text-neutral-500 dark:text-neutral-400">
                 <IconUpload size={32} />
                 <span className="mt-2 text-xs">Direct Download</span>
            </motion.div>
        </div>
      );
};

const SkeletonFour = ({}: {}) => {
   // Simplified SkeletonFour - Focus on the upload interaction
   const [files, setFiles] = useState<File[]>([]);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const handleFileChange = (newFiles: File[]) => { setFiles((prevFiles) => [...prevFiles, ...newFiles].slice(-1)); }; // Keep only last file for demo
   const handleClick = () => { fileInputRef.current?.click(); };

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-4">
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className="relative flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-400 dark:border-neutral-600" // Added border
      >
        <input ref={fileInputRef} id="file-upload-handle" type="file" onChange={(e) => handleFileChange(Array.from(e.target.files || []))} className="hidden" />

        {!files.length && (
           <motion.div layoutId="file-upload" variants={mainVariant} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="flex flex-col items-center text-neutral-600 dark:text-neutral-300">
                <IconUpload className="h-8 w-8" />
                <p className="mt-2 text-sm">Click or Drag Schema</p>
            </motion.div>
        )}

         {files.length > 0 && files.map((file, idx) => (
             <motion.div key={"file" + idx} layoutId={"file-upload"} className="flex w-full flex-col items-center justify-center p-4 text-center">
                  <p className="max-w-xs truncate text-sm font-medium text-neutral-700 dark:text-neutral-300"> {file.name} </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400"> {(file.size / 1024).toFixed(2)} KB </p>
             </motion.div>
         ))}

      </motion.div>
    </div>
  );
};

// New Skeleton for Customizable Schemas Card (Rearranging Blocks)
const CustomizableSchemaSkeleton_Blocks = () => {
  const [layoutIndex, setLayoutIndex] = useState(0);

  const blocks = [
    { id: "user", label: "User", color: "bg-gradient-to-br from-[#2E2055] to-[#251E38]" },
    { id: "order", label: "Order", color: "bg-gradient-to-br from-[#060D57] to-[#030834]" },
    { id: "product", label: "Product", color: "bg-gradient-to-br from-[#790B22] to-[#34030D]" },
  ];

  // Define layout configurations using grid-area names
  // (Assumes parent grid has these areas defined)
  const layouts = [
    // Layout 1: Stacked vertically
    ["user", "order", "product"],
    // Layout 2: User top, Order/Product side-by-side below
    ["user", "user", "order", "product"],
    // Layout 3: Product top-right, User/Order below
    ["user", "product", "order", "product"],
  ];

  // Cycle through layouts every few seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLayoutIndex((prevIndex) => (prevIndex + 1) % layouts.length);
    }, 2500); // Change layout every 2.5 seconds

    return () => clearInterval(interval);
  }, [layouts.length]);

  const currentLayoutConfig = layouts[layoutIndex];

  // Determine grid template areas based on layout index
  let gridTemplateAreasStyle: string;
  switch (layoutIndex) {
    case 0: // Stacked
      gridTemplateAreasStyle = `"user" "order" "product"`;
      break;
    case 1: // User top, Order/Product below
      gridTemplateAreasStyle = `"user user" "order product"`;
      break;
    case 2: // Product top-right, User/Order below
      gridTemplateAreasStyle = `"user product" "order product"`;
      break;
    default:
      gridTemplateAreasStyle = `"user" "order" "product"`;
  }

  return (
    // Parent container using CSS Grid
    <div 
      className={cn(
        "grid h-full w-full grid-cols-2 grid-rows-3 gap-2 p-4 transition-all duration-500 ease-in-out",
        // Conditionally add centering for the stacked layout (index 0)
        layoutIndex === 0 && "place-content-center"
      )}
      style={{ gridTemplateAreas: gridTemplateAreasStyle }}
    >
      {blocks.map((block) => (
        <motion.div
          key={block.id}
          layout // Enable automatic layout animation
          // Adjust spring parameters for smoother animation
          transition={{ type: "spring", stiffness: 120, damping: 30 }} 
          className={`flex items-center justify-center rounded-md p-2 text-xs font-medium text-white ${block.color}`}
          style={{ gridArea: block.id }}
        >
          {block.label}
        </motion.div>
      ))}
    </div>
  );
};

export function FeaturesGrid() { // Renamed from ThreeColumnBentoGrid
  return (
    <div className="mx-auto -mt-10 mb-20 w-full max-w-7xl px-4 md:px-8">
      <h2 className="text-bold text-neutral-800 font-sans text-xl font-bold tracking-tight md:text-4xl dark:text-neutral-100">
        Explore Our Features
      </h2>
      <p className="mt-4 max-w-lg text-sm text-neutral-600 dark:text-neutral-400">
        Discover how Synoptic empowers you with versatile synthetic data generation capabilities.
      </p>
      <div className="mt-20 grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-1 md:row-span-2">
          <CardContent>
            <CardTitle>Generate Realistic Data</CardTitle>
            <CardDescription>
              Create synthetic data that mirrors real-world patterns.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody>
            <RealisticDataSkeleton />
          </CardSkeletonBody>
        </Card>
        <Card className="md:col-span-1">
          <CardContent>
            <CardTitle>Ensure Privacy</CardTitle>
            <CardDescription>
              Work with data structures without exposing sensitive information.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody className="h-full p-0 flex items-center justify-center">
            <TextRevealCard
              text="**********"
              revealText="John Doe"
              className="!p-0 !bg-transparent !w-full h-full flex items-center justify-center text-center !border-none"
            >
            </TextRevealCard>
          </CardSkeletonBody>
        </Card>
        <Card className="md:col-span-1">
          <CardContent>
            <CardTitle>Scale Testing</CardTitle>
            <CardDescription>
              Generate large datasets for robust application testing.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody className="">
            <ScaleTestingSkeleton_V2_Grid />
          </CardSkeletonBody>
        </Card>
        <Card className="md:col-span-1">
          <CardContent>
            <CardTitle>Customizable Schemas</CardTitle>
            <CardDescription>
              Define and generate data according to your specific needs.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody className="h-full max-h-full overflow-hidden">
            <CustomizableSchemaSkeleton_Blocks />
          </CardSkeletonBody>
        </Card>
        <Card className="md:col-span-1">
          <CardContent>
            <CardTitle>Seamless Integration</CardTitle>
            <CardDescription>
              Integrate with your existing workflows via API or SDK.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody className="p-2">
            <IntegrationSkeleton />
          </CardSkeletonBody>
        </Card>
        <Card className="md:col-span-2">
          <CardContent>
            <CardTitle>Our Data Generation Pipeline</CardTitle>
            <CardDescription>
              Visualize our multi-stage process for generating safe, high-quality synthetic data.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody className="p-4">
            <PipelineSkeleton />
          </CardSkeletonBody>
        </Card>
        <Card className="md:col-span-1">
          <CardContent>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Track generation speed and data quality metrics.
            </CardDescription>
          </CardContent>
          <CardSkeletonBody>
            <PerformanceSkeleton />
          </CardSkeletonBody>
        </Card>
      </div>
    </div>
  );
}

// Variants (Keep original variants)
const mainVariant = { initial: { scale: 0.9, opacity: 0.7 }, animate: { scale: 1, opacity: 1 } };
const secondaryVariant = { initial: { opacity: 0 }, animate: { opacity: 1 } };

// Utils (GridPattern not needed for simplified skeletons, can remove if desired)
// Keeping GridPattern just in case it's used elsewhere or needed later
export function GridPattern() {
  const columns = 20; const rows = 5;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-shrink-0 scale-110 flex-wrap items-center justify-center gap-x-px gap-y-px bg-gray-100 opacity-50 [mask-image:linear-gradient(to_top,transparent,white)] dark:bg-neutral-900"> {/* Added pointer-events-none, opacity, mask */}
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return ( <div key={`${col}-${row}-grid-pattern`} className={`flex h-10 w-10 flex-shrink-0 rounded-[2px] ${ index % 2 === 0 ? "bg-gray-50 dark:bg-neutral-950" : "bg-gray-50 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:bg-neutral-950 dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]" }`} /> );
        }),
      )}
    </div>
  );
} 