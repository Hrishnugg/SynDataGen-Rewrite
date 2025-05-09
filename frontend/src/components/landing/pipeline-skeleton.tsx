'use client';

import React, { useEffect, useRef } from 'react';
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
  const observerRef = useRef<HTMLDivElement>(null); // Observer target
  const isVisible = useRef<boolean>(false); // Visibility tracker
  const isAnimating = useRef<boolean>(false); // Track if animation sequence is running

  // Create controls for each stage component (icon, dot, label)
  const stageControls = stages.map(() => ({
    icon: useAnimationControls(),
    dot: useAnimationControls(),
    label: useAnimationControls(),
  }));

  // --- Main Animation Loop Effect ---
  useEffect(() => {
    let isMounted = true;
    isAnimating.current = false;

    const sequence = async () => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      while (isMounted) {
        // Wait until visible
        while (isMounted && !isVisible.current) {
            await new Promise(resolve => setTimeout(resolve, 200)); 
        }
        if (!isMounted) break;

        // Start animations FROM the initial prop state
        containerControls.start({
            opacity: 1,
            transition: { duration: fadeDuration },
        });
        lineGlowControls.start({ opacity: 1, transition: { duration: 0.1 } });

        // --- Animate Through Stages --- 
        for (let i = 0; i < stages.length; i++) {
            // Check visibility *before* each stage animation
            if (!isMounted || !isVisible.current) break;

            const stage = stages[i];
            const controls = stageControls[i];
            
            await lineGlowControls.start({
                width: stage.position,
                transition: { duration: lineFillDuration, ease: 'linear' }, 
            });
             if (!isMounted || !isVisible.current) break;

            controls.icon.start({ opacity: 1, scale: 1.1, transition: { duration: 0.3 } });
            controls.dot.start({ scale: 1.3, opacity: 1, transition: { duration: 0.3 } });
            controls.label.start({ opacity: 1, transition: { duration: 0.3 } });

            await new Promise((resolve) => setTimeout(resolve, nodePauseDuration));
        }
        
        // Refined check for visibility/unmount
        if (!isMounted) { // Priority check: If unmounted, exit loop immediately
          break;
        }
        if (!isVisible.current) { // If still mounted but not visible, reset visuals and wait
             lineGlowControls.set({ width: '0%', opacity: 0 });
             containerControls.set({ opacity: 0 });
             stageControls.forEach((ctrl) => {
                 ctrl.icon.set({ opacity: 0.4, scale: 0.9 });
                 ctrl.dot.set({ scale: 1, opacity: 0.5 }); 
                 ctrl.label.set({ opacity: 0.5 });
             });
            continue; 
        }

        // --- End Cycle --- 
        await containerControls.start({
            opacity: 0,
            transition: { duration: fadeDuration, delay: 0.5 },
        });
        
        // Refined check before final reset
        if (!isMounted) { // If unmounted during fade-out, exit loop
             break;
        }
        
        // Reset using .set() - Safe because we know component is still mounted here
        lineGlowControls.set({ width: '0%', opacity: 0 });
        stageControls.forEach((ctrl) => {
            ctrl.icon.set({ opacity: 0.4, scale: 0.9 });
            ctrl.dot.set({ scale: 1, opacity: 0.5 }); 
            ctrl.label.set({ opacity: 0.5 });
        });
            
        await new Promise((resolve) => setTimeout(resolve, loopBuffer));
      }
      isAnimating.current = false;
    };

    sequence(); // Call sequence directly

    return () => {
      isMounted = false;
      isAnimating.current = false;
      // Stop controls on unmount
      containerControls.stop(); lineGlowControls.stop();
      stageControls.forEach(s => { s.icon.stop(); s.dot.stop(); s.label.stop(); });
    };

  }, [containerControls, lineGlowControls, stageControls]); // REMOVED hasMounted from deps

   // --- Intersection Observer Effect (Only updates visibility) ---
   useEffect(() => {
    const currentObserverRef = observerRef.current;
    if (!currentObserverRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible.current = entries[0]?.isIntersecting ?? false;
        // No need to start/stop animation here, the main loop handles visibility check
      },
      { threshold: 0.1 } // Trigger when 10% is visible
    );

    observer.observe(currentObserverRef);

    return () => {
        if (currentObserverRef) {
            observer.unobserve(currentObserverRef);
        }
        observer.disconnect();
        // isVisible.current = false; // Resetting here might cause race condition if main loop is checking
    };
  }, []); // No dependencies, runs once on mount to set up observer


  return (
    // Container to control overall fade
    <motion.div
      ref={observerRef} // Attach observer ref
      className="flex h-full w-full flex-col items-center justify-center space-y-6"
      animate={containerControls}
      initial={{ opacity: 0 }} // <-- SET INITIAL STATE HERE
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
            initial={{ opacity: 0.4, scale: 0.9 }} // <-- SET INITIAL STATE HERE
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
           initial={{ width: '0%', opacity: 0 }} // <-- SET INITIAL STATE HERE
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
              initial={{ scale: 1, opacity: 0.5 }} // <-- SET INITIAL STATE HERE
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
            initial={{ opacity: 0.5 }} // <-- SET INITIAL STATE HERE
          >
            {stage.name}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}; 