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

  const currentScore = qualityScores[currentScoreIndex];

  // Effect for the ticker acceleration and looping
  useEffect(() => {
    const interval = setInterval(() => {
      setRecordCount((prev) => {
        // Ensure we add an integer amount
        const currentIncrement = Math.floor(incrementAmountRef.current);
        const newCount = prev + currentIncrement;

        if (newCount > loopThreshold) {
          setNeedsReset(true); // Signal reset
          return prev; // Keep current count until reset effect runs
        } else {
          // Accelerate for next tick
          incrementAmountRef.current *= accelerationFactor;
          return newCount;
        }
      });
    }, tickerInterval);

    return () => clearInterval(interval);
  }, []); // Runs once on mount

  // Effect to handle the reset when signaled
  useEffect(() => {
    if (needsReset) {
      setRecordCount(initialRecordCount);
      setCurrentScoreIndex(0);
      incrementAmountRef.current = initialIncrementAmount;
      // Reset meter quickly to the first score
      meterControls.start({
        width: `${qualityScores[0]}%`,
        transition: { duration: 0.1 },
      });
      setNeedsReset(false); // Reset the flag
    }
  }, [needsReset, meterControls]); // Depends only on the reset flag

  // Effect for the quality score cycle and meter animation (separate from reset)
  useEffect(() => {
    // Animate meter bar to current score (when index changes)
    meterControls.start({
      width: `${currentScore}%`,
      transition: { duration: 0.5, ease: 'easeInOut' },
    });

    // Cycle through scores
    const interval = setInterval(() => {
      // Don't advance score if a reset is pending
      if (!needsReset) { 
         setCurrentScoreIndex((prevIndex) => (prevIndex + 1) % qualityScores.length);
      }
    }, scoreInterval);

    return () => clearInterval(interval);
    // Re-run when score index or reset status changes (to potentially restart interval correctly)
  }, [currentScoreIndex, meterControls, currentScore, needsReset]); 

  return (
    <div className="flex h-full w-full flex-col justify-center space-y-6 p-4">
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