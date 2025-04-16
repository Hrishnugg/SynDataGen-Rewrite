'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { cn } from '@/lib/utils';

// Helper to format numbers with commas
const formatNumber = (num: number): string => {
  // Ensure formatting happens on a whole number
  return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const qualityScores = [98.5, 99.1, 98.8, 97.9, 99.3];
const tickerInterval = 100; // ms for ticker update
const scoreInterval = 2000; // ms for quality score change
const initialRecordCount = 12345;
const initialIncrementAmount = 100;
const loopThreshold = 500000;
// Reduced acceleration factor
const accelerationFactor = 1.01; // Increase increment amount by 1% each tick

export const PerformanceSkeleton = () => {
  const [recordCount, setRecordCount] = useState(initialRecordCount);
  const [currentScoreIndex, setCurrentScoreIndex] = useState(0);
  const [needsReset, setNeedsReset] = useState(false);
  const meterControls = useAnimationControls();
  const incrementAmountRef = useRef(initialIncrementAmount);
  const observerRef = useRef<HTMLDivElement>(null); // Observer target
  const isVisible = useRef<boolean>(false); // Visibility tracker
  const tickerIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref for ticker interval
  const scoreIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref for score interval

  const currentScore = qualityScores[currentScoreIndex];

  // Function to start the ticker
  const startTicker = () => {
    if (tickerIntervalRef.current) clearInterval(tickerIntervalRef.current);
    tickerIntervalRef.current = setInterval(() => {
      setRecordCount((prev) => {
        const currentIncrement = Math.floor(incrementAmountRef.current);
        const newCount = prev + currentIncrement;

        if (newCount > loopThreshold) {
          setNeedsReset(true);
          return prev;
        } else {
          incrementAmountRef.current *= accelerationFactor;
          return newCount;
        }
      });
    }, tickerInterval);
  };

  // Function to stop the ticker
  const stopTicker = () => {
    if (tickerIntervalRef.current) {
      clearInterval(tickerIntervalRef.current);
      tickerIntervalRef.current = null;
    }
  };

  // Function to start the score cycle
  const startScoreCycle = () => {
      if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
      scoreIntervalRef.current = setInterval(() => {
        if (!needsReset) { // Don't advance if reset pending
           setCurrentScoreIndex((prevIndex) => (prevIndex + 1) % qualityScores.length);
        }
      }, scoreInterval);
  };

   // Function to stop the score cycle
   const stopScoreCycle = () => {
      if (scoreIntervalRef.current) {
        clearInterval(scoreIntervalRef.current);
        scoreIntervalRef.current = null;
      }
   };

  // Effect for the ticker acceleration and looping - NOW CONTROLLED BY OBSERVER
  /* --- Original Effect Removed, logic moved to start/stop functions --- */

  // Effect to handle the reset when signaled (No change needed)
  useEffect(() => {
    if (needsReset) {
      setRecordCount(initialRecordCount);
      setCurrentScoreIndex(0);
      incrementAmountRef.current = initialIncrementAmount;
      meterControls.start({
        width: `${qualityScores[0]}%`,
        transition: { duration: 0.1 },
      });
      setNeedsReset(false);
      // Restart intervals if visible after reset
      if (isVisible.current) {
          startTicker();
          startScoreCycle();
      }
    }
  }, [needsReset, meterControls]);

  // Effect for the meter animation (No change needed for animation trigger)
  useEffect(() => {
    meterControls.start({
      width: `${currentScore}%`,
      transition: { duration: 0.5, ease: 'easeInOut' },
    });
  }, [currentScore, meterControls]);

  // --- Intersection Observer Effect ---
  useEffect(() => {
    const currentObserverRef = observerRef.current;
    if (!currentObserverRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entryIsVisible = entries[0]?.isIntersecting ?? false;
        isVisible.current = entryIsVisible;

        if (entryIsVisible) {
            // Start intervals when becoming visible
            startTicker();
            startScoreCycle();
        } else {
            // Stop intervals when becoming hidden
            stopTicker();
            stopScoreCycle();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentObserverRef);

    // Initial check if already visible
    if (isVisible.current) {
        startTicker();
        startScoreCycle();
    }

    // Cleanup function
    return () => {
      stopTicker(); // Stop ticker on unmount
      stopScoreCycle(); // Stop score cycle on unmount
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
      observer.disconnect();
    };
  }, []); // Run only once


  return (
    <div ref={observerRef} className="flex h-full w-full flex-col justify-center space-y-6 p-4"> {/* Attach observer ref */}
      {/* Ticker Section */}
      <div className="text-center">
        {/* Updated Label */}
        <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Records Generated
        </p>
        <p className="font-mono text-2xl font-semibold text-neutral-700 dark:text-neutral-200">
          {formatNumber(recordCount)}
        </p>
      </div>

      {/* Quality Score Meter Section */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Data Quality Score
          </p>
          <p className="font-mono text-sm font-medium text-green-600 dark:text-green-400">
            {currentScore.toFixed(1)}%
          </p>
        </div>
        {/* Meter Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-300 dark:bg-neutral-700">
          <motion.div
            className="absolute left-0 top-0 h-full rounded-full bg-green-500"
            // Use initial score for initial width
            initial={{ width: `${qualityScores[0]}%` }} 
            animate={meterControls}
          />
        </div>
      </div>
    </div>
  );
}; 