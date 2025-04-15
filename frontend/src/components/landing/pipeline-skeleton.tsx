'use client';

import React, { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import {
  IconStack2,      // Placeholder for Data Preprocessing (Disks)
  IconSparkles,    // Placeholder for PII Identification (Star)
  IconPill,        // Placeholder for Anonymization Layer (Pill)
  IconBoxModel2,   // Placeholder for Data Generation Model (Box/Model)
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

const stages = [
  {
    name: 'Preprocessing',
    Icon: IconStack2,
    color: 'text-pink-400',
    dotColor: 'bg-pink-500',
    position: '25%', // Approximate position for line animation stop
  },
  {
    name: 'PII Identification',
    Icon: IconSparkles,
    color: 'text-blue-400',
    dotColor: 'bg-blue-500',
    position: '50%',
  },
  {
    name: 'Anonymization',
    Icon: IconPill,
    color: 'text-purple-400',
    dotColor: 'bg-purple-500',
    position: '75%',
  },
  {
    name: 'Generation Model',
    Icon: IconBoxModel2,
    color: 'text-green-400',
    dotColor: 'bg-green-500',
    position: '100%',
  },
];

// Animation timings (adjust as needed)
const lineFillDuration = 0.8; // seconds to fill between nodes
const nodePauseDuration = 1000; // ms pause at each node
const fadeDuration = 0.5; // seconds for fade in/out
const loopBuffer = 500; // ms pause before looping

export const PipelineSkeleton = () => {
  const containerControls = useAnimationControls();
  const lineGlowControls = useAnimationControls();
  // Create controls for each stage component (icon, dot, label)
  const stageControls = stages.map(() => ({
    icon: useAnimationControls(),
    dot: useAnimationControls(),
    label: useAnimationControls(),
  }));

  useEffect(() => {
    const sequence = async () => {
      // --- Initial Reset (Run once before loop) ---
      containerControls.set({ opacity: 0 }); // Ensure container starts hidden
      lineGlowControls.set({ width: '0%', opacity: 0 });
      stageControls.forEach((ctrl) => {
        ctrl.icon.set({ opacity: 0.4, scale: 0.9 });
        ctrl.dot.set({ scale: 1, opacity: 0.5 }); 
        ctrl.label.set({ opacity: 0.5 });
      });
      // --- End Initial Reset ---

      while (true) {
        // --- Start Cycle --- 
        // Fade in container
        await containerControls.start({
          opacity: 1,
          transition: { duration: fadeDuration },
        });
        // Make line glow element visible before animating width
        lineGlowControls.start({ opacity: 1, transition: { duration: 0.1 } });

        // --- Animate Through Stages --- 
        let previousWidth = '0%';
        for (let i = 0; i < stages.length; i++) {
          const stage = stages[i];
          const controls = stageControls[i];
          
          // Animate line glow to current stage position
          await lineGlowControls.start({
            width: stage.position,
            transition: { duration: lineFillDuration, ease: 'linear' }, 
          });

          // Highlight current stage
          controls.icon.start({ opacity: 1, scale: 1.1, transition: { duration: 0.3 } });
          controls.dot.start({ scale: 1.3, opacity: 1, transition: { duration: 0.3 } });
          controls.label.start({ opacity: 1, transition: { duration: 0.3 } });

          // Pause at the node
          await new Promise((resolve) => setTimeout(resolve, nodePauseDuration));
        }

        // --- End Cycle --- 
        // Fade out container (implicitly hides everything)
        await containerControls.start({
          opacity: 0,
          transition: { duration: fadeDuration, delay: 0.5 }, // Add slight delay before fade
        });
        
        // --- Reset Children AFTER fade out --- (Moved from start of loop)
        lineGlowControls.set({ width: '0%', opacity: 0 });
        stageControls.forEach((ctrl) => {
          ctrl.icon.set({ opacity: 0.4, scale: 0.9 });
          ctrl.dot.set({ scale: 1, opacity: 0.5 }); 
          ctrl.label.set({ opacity: 0.5 });
        });
        // --- End Reset Children ---

        // Wait before looping
        await new Promise((resolve) => setTimeout(resolve, loopBuffer));
      }
    };

    sequence();
    
    // Optional: Cleanup function if needed, though loop runs indefinitely
    // return () => { /* stop animations */ };

  }, [containerControls, lineGlowControls, stageControls]);

  return (
    // Container to control overall fade
    <motion.div 
      className="flex h-full w-full flex-col items-center justify-center space-y-6"
      animate={containerControls}
      initial={{ opacity: 0 }}
    >
      {/* Icons Row - Use relative positioning for children */}
      <div className="relative w-4/5 mx-auto h-8"> 
        {stages.map((stage, index) => (
          <motion.div
            key={stage.name + '-icon'}
            className={cn(
              'absolute top-0 flex flex-col items-center -translate-x-1/2',
               stage.color
            )}
            style={{ left: stage.position }}
            animate={stageControls[index].icon}
            initial={{ opacity: 0.4, scale: 0.9 }} 
          >
            <stage.Icon size={32} />
          </motion.div>
        ))}
      </div>

      {/* Line and Dots Row - Outer container remains relative */}
      <div className="relative flex w-4/5 mx-auto items-center h-3"> {/* Added mx-auto for consistency */} 
        {/* Base Line (Grey) */}
        <div className="h-px w-full flex-1 bg-neutral-700"></div>
        
        {/* Line Glow Overlay */}
        <motion.div 
           className="absolute left-0 top-1/2 h-1 w-0 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_theme(colors.white)]" 
           animate={lineGlowControls}
           initial={{ width: '0%', opacity: 0 }}
        />

        {/* Dots Container - Already absolute */}
        <div className="absolute inset-0"> 
          {stages.map((stage, index) => (
            <motion.div
              key={stage.name + '-dot'}
              className={cn(
                'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full',
                 stage.dotColor 
              )}
              style={{ left: stage.position }}
              animate={stageControls[index].dot}
              initial={{ scale: 1, opacity: 0.5 }} 
            />
          ))}
        </div>
      </div>

      {/* Labels Row - Use relative positioning for children */}
       {/* Match width (w-4/5) and center (mx-auto) like the line/dots row */}
      <div className="relative w-4/5 mx-auto text-center h-4"> 
        {stages.map((stage, index) => (
          <motion.div
            key={stage.name + '-label'}
            className={cn(
              // Removed w-1/4 to allow natural width
              // Added whitespace-nowrap to prevent text wrapping
              'absolute top-0 px-1 text-[10px] font-medium text-neutral-400 -translate-x-1/2 whitespace-nowrap', 
            )}
            style={{ left: stage.position }}
            animate={stageControls[index].label}
            initial={{ opacity: 0.5 }} 
          >
            {stage.name}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}; 