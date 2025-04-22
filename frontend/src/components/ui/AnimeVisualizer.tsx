"use client";
import React, { useEffect, useRef } from 'react';
// import * as anime from 'animejs'; // Namespace import might have type issues
import { createTimeline, stagger /* , set */ } from 'animejs'; // Import specific functions, excluding remove for now
import type { AnimeInstance, Animatable } from 'animejs';

// Define props - This will likely evolve
interface AnimeVisualizerProps {
  activeSectionIndex: number; // To know which animation to play
  // We might need a ref to the scroll container if using ScrollObserver directly here
  // scrollContainerRef?: React.RefObject<HTMLElement>; 
}

const AnimeVisualizer: React.FC<AnimeVisualizerProps> = ({ activeSectionIndex }) => {
  const animationWrapperRef = useRef<HTMLDivElement>(null);

  // Placeholder for animation configurations
  const animationConfigs = [
    // Config for Section 0 (Pre-processing)
    () => {
      console.log("Initialize Animation for Section 0 (2D Squares Sequence)");
      
      const tl = createTimeline({
        loop: true,
        // easing: 'easeInOutSine', // Removed: Set per-step or via defaults
      });

      const gridRows = 8;
      const gridCols = 8;
      const numCubes = gridRows * gridCols;
      const cubeSize = 16; // w-4 in Tailwind
      const gap = 8; // gap-2 in Tailwind
      const cubeAndGap = cubeSize + gap;
      const chunkWidth = 2 * cubeAndGap; // Width of a 2x8 chunk
      const finalChunkWidth = 2 * cubeAndGap; // Width remains same after removal (8x6 grid)
      const finalGridWidth = gridCols * cubeAndGap - (2 * cubeAndGap); // Width of the final 8x6 grid
      const totalGridWidth = gridCols * cubeAndGap; // Initial 8x8 grid width
      const centerOffset = (totalGridWidth - cubeAndGap) / 2; // To center the grid visually if needed
      const chunkSpacing = cubeAndGap * 1.5; // Desired visual gap between chunks

      // Declare remainingCubes here so it's accessible later
      let remainingCubes: HTMLElement[] = [];

      // --- Step 1: Ripple In (8x8 Grid) ---
      tl.add(
        ".cube",
        {
          scale: [{ value: 0, duration: 0 }, { value: 1, duration: 800 }],
          opacity: [{ value: 0, duration: 0 }, { value: 1, duration: 800 }],
          delay: stagger(100, { grid: [gridCols, gridRows], from: 'center' }),
        }
      );

      // --- Step 2: Split into Chunks (4 x 2x8) ---
      tl.add(
        ".cube",
        {
           translateX: (el: Element, i: number) => {
             const col = i % gridCols;
             const chunkIndex = Math.floor(col / 2); // 0, 1, 2, 3
             // Calculate center of the 4 chunks area
             const totalChunksWidth = 4 * chunkWidth + 3 * chunkSpacing;
             const areaCenter = totalChunksWidth / 2;
             // Calculate center of this chunk
             const chunkCenter = chunkIndex * (chunkWidth + chunkSpacing) + chunkWidth / 2;
             // Calculate position relative to the center of the chunk area
             const targetXRelativeToCenter = chunkCenter - areaCenter;
             // Calculate the offset within the chunk (col 0 or 1 within the 2-col chunk)
             const intraChunkCol = col % 2;
             const intraChunkOffset = (intraChunkCol - 0.5) * cubeAndGap; // -0.5*size or +0.5*size
             
             // Calculate the original X relative to grid center for base positioning
             // const originalXRelativeToCenter = (col * cubeAndGap + cubeSize / 2) - (totalGridWidth / 2);

             return targetXRelativeToCenter + intraChunkOffset; 
           },
           translateY: 0, // Keep Y position for now
           scale: 1, // Ensure scale is 1
           opacity: 1, // Ensure opacity is 1
           easing: 'spring(1, 80, 10, 0)', 
           delay: stagger(30, { grid: [gridCols, gridRows], from: 'first' }), 
        },
        "-=800" // Overlap slightly with ripple-in end
      );

      // --- Step 3: Select, Glow Red, Fade Out, Resize ---
      // Placeholder - Complex logic needed here
       let cubesToRemoveIndices: number[] = [];
       // Example: Select 2 random from each 2-col chunk
       for (let chunk = 0; chunk < 4; chunk++) {
          let chunkIndices = [];
          for (let row = 0; row < gridRows; row++) {
             chunkIndices.push(row * gridCols + chunk * 2);
             chunkIndices.push(row * gridCols + chunk * 2 + 1);
          }
          // Simple random selection (replace with better logic if needed)
          chunkIndices.sort(() => 0.5 - Math.random());
          cubesToRemoveIndices.push(...chunkIndices.slice(0, 2));
       }

       // Animate removal (glow red, fade)
       tl.add(
         cubesToRemoveIndices.map(index => `.cube-${index}`),
         {
           backgroundColor: "#FF0000", // Glow red
           scale: 1.1, // Slight pulse
           duration: 200,
           easing: 'easeOutQuad',
         },
         "+=300" // Start after split settles
       ).add(
         cubesToRemoveIndices.map(index => `.cube-${index}`),
         {
           opacity: 0,
           scale: 0.8,
           duration: 300,
           easing: 'easeInQuad',
         }
       );

       // --- Step 3b: Animate Remaining Cubes Resizing (Smoothly to 2x6 chunk positions) ---
       tl.add(
        ".cube",
        {
           // We need to calculate targets dynamically here
           targets: '.cube', // Initial target, filter in update/begin?
           duration: 500, // Duration for the resize animation
           easing: 'easeInOutSine',
           delay: stagger(20, { grid: [gridCols, gridRows], from: 'first' }), // Slight stagger
           begin: (anim: AnimeInstance) => {
               // Filter targets at the beginning of this animation step
               remainingCubes = anim.animatables
                   .map(a => a.target as HTMLElement)
                   .filter((el: Element, index: number) => !cubesToRemoveIndices.includes(index));
               anim.animatables = anim.animatables.filter((el: Element, index: number) => !cubesToRemoveIndices.includes(index));
               console.log(`Animating ${remainingCubes.length} remaining cubes`);
           },
           translateY: (el: Element, i: number) => {
               // Recalculate target Y based on remaining cubes
               const originalIndex = parseInt(el.className.match(/cube-(\d+)/)?.[1] || '0');
               const originalCol = originalIndex % gridCols;
               const originalRow = Math.floor(originalIndex / gridCols);
               const chunkIndex = Math.floor(originalCol / 2);

               // Determine the cube's new row index within the 6 rows
               let removedAbove = 0;
               for (let r = 0; r < originalRow; r++) {
                   const checkIndex1 = r * gridCols + chunkIndex * 2;
                   const checkIndex2 = r * gridCols + chunkIndex * 2 + 1;
                    // Simple check: if *either* sibling in a row above was removed, count it
                   if (cubesToRemoveIndices.includes(checkIndex1) || cubesToRemoveIndices.includes(checkIndex2)) {
                       // More robust: count removed in this specific column above
                       let checkIndex = r * gridCols + originalCol;
                       if(cubesToRemoveIndices.includes(checkIndex)) {
                           removedAbove++;
                       }
                   }
               }
               const newRow = originalRow - removedAbove;

               // Calculate target Y based on new row (centered 6-row grid)
               const newGridHeight = (gridRows - 2) * cubeAndGap; // 6 rows
               const targetY = (newRow * cubeAndGap + cubeSize / 2) - (newGridHeight / 2); 
               
               // Keep X translation from previous step (split chunks)
               // We assume the transform string is simple enough to parse, might need regex
               const currentTransform = el.style.transform || '';
               const matchX = currentTransform.match(/translateX\(([^p]+)px\)/);
               const currentX = matchX ? parseFloat(matchX[1]) : 0;

               // Return *only* the Y value to animate
               return targetY; 
           },
           // Keep X transform, only animate Y
           // This is tricky, might need to animate transform string or use anime.set in updates
           // Simpler: Re-apply X translation (it shouldn't change in this step)
           translateX: (el: Element, i: number) => {
               const originalIndex = parseInt(el.className.match(/cube-(\d+)/)?.[1] || '0');
               const col = originalIndex % gridCols;
               const chunkIndex = Math.floor(col / 2); // 0, 1, 2, 3
               const totalChunksWidth = 4 * chunkWidth + 3 * chunkSpacing;
               const areaCenter = totalChunksWidth / 2;
               const chunkCenter = chunkIndex * (chunkWidth + chunkSpacing) + chunkWidth / 2;
               const targetXRelativeToCenter = chunkCenter - areaCenter;
               const intraChunkCol = col % 2;
               const intraChunkOffset = (intraChunkCol - 0.5) * cubeAndGap;
               return targetXRelativeToCenter + intraChunkOffset; 
           },
           // Ensure other properties are maintained
           scale: 1,
           opacity: 1,
           backgroundColor: '#0070F3', // Reset color
       });

      // --- Step 4: Reassemble (8x6), Ripple Out ---
      // Placeholder - targets need to exclude removed cubes
       tl.add(
         remainingCubes, // Target the specific remaining elements
         {
             // Calculate target X for 8x6 grid assembly
             translateX: (el: Element, i: number) => {
                 // Calculate target X based on remaining cube index within the 8x6 grid
                 // This assumes `i` is the index within the `remainingCubes` array
                 const col = parseInt(el.getAttribute('data-col') || '0'); // Get original column
                 // Simplified: just use original column index, adjusted for center of 8x6
                 const targetCol = col; 
                 return (targetCol * cubeAndGap + cubeSize / 2) - (finalGridWidth / 2);
             },
             translateY: 0, // Keep Y for now - should already be correct from previous step
             scale: [{ value: 1, duration: 500 }, { value: 0, duration: 800 }], // Scale down to ripple out
             opacity: [{ value: 1, duration: 500 }, { value: 0, duration: 800 }], // Fade out
             backgroundColor: '#0070F3', // Return to base color
             delay: stagger(100, { grid: [gridCols, gridRows - 2], from: 'center' }), // Stagger based on 8x6
             easing: 'easeInOutSine',
         },
          "+=500" // Start after removal/resizing
      );

      // Return cleanup function
      return () => {
        console.log("Cleanup Animation for Section 0 (2D Squares Sequence)");
        tl.pause();
        // Reset styles potentially affected by animation
        const cubes = document.querySelectorAll(".cube");
        cubes.forEach(cube => {
            (cube as HTMLElement).style.transform = ''; 
            (cube as HTMLElement).style.opacity = '';
            (cube as HTMLElement).style.backgroundColor = ''; // Reset color
        });
      };
    },
    // Config for Section 1 (PII Identification)
    () => { 
      // TODO: Implement Gemini logo/table/beam animation
      console.log("Initialize Animation for Section 1");
      return () => { console.log("Cleanup Animation for Section 1"); };
     },
    // Config for Section 2 (Anonymization)
    () => { 
      // TODO: Implement table/scanner/blur animation
      console.log("Initialize Animation for Section 2"); 
      return () => { console.log("Cleanup Animation for Section 2"); };
    },
    // Config for Section 3 (Synthetic Data)
    () => { 
      // TODO: Implement abstract shape morph/replication animation
      console.log("Initialize Animation for Section 3"); 
      return () => { console.log("Cleanup Animation for Section 3"); };
    },
  ];

  useEffect(() => {
    let cleanupAnimation: (() => void) | void | null = null;
    
    // Ensure the index is valid
    if (activeSectionIndex >= 0 && activeSectionIndex < animationConfigs.length) {
      const initAnimation = animationConfigs[activeSectionIndex];
      // Call the animation initializer which should return a cleanup function
      cleanupAnimation = initAnimation(); 
    }

    // Return the cleanup function to be called when the effect re-runs or component unmounts
    return () => {
      if (typeof cleanupAnimation === 'function') {
        cleanupAnimation();
      }
      // Potentially add anime.remove(animationWrapperRef.current) or similar
      // if animations target the wrapper directly and aren't cleaned up internally.
    };
  }, [activeSectionIndex]); // Re-run effect when the active section changes

  return (
    // Remove perspective styling as it's not needed for 2D
    <div ref={animationWrapperRef} className="w-full h-full flex items-center justify-center">
      {/* Base HTML/SVG structure for animations will go here */}
      {/* Render based on activeSectionIndex */}
      {activeSectionIndex === 0 && (
        // Container for the 8x8 grid
        <div className="grid grid-cols-8 gap-2 p-4">
           {/* Render 64 simple squares */}
           {Array.from({ length: 64 }).map((_, i) => (
             // Simple square div - will be targeted by anime
             <div 
                key={i} 
                // Class name for targeting, plus styling
                className={`cube cube-${i} w-4 h-4 rounded-sm shadow-md`}
                data-row={Math.floor(i / 8)} // Keep data attributes for logic
                data-col={i % 8}
                style={{ backgroundColor: '#0070F3'}} // Base color 
             >
                {/* No nested faces needed */}
             </div>
           ))}
        </div>
      )}
       {activeSectionIndex === 1 && <div>Structure for Section 1 (PII)</div>}
       {activeSectionIndex === 2 && <div>Structure for Section 2 (Anonymization)</div>}
       {activeSectionIndex === 3 && <div>Structure for Section 3 (Synthetic)</div>}
    </div>
  );
};

export default AnimeVisualizer;
