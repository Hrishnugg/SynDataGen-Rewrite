"use client";
import { useEffect } from "react";
import { motion, useAnimate } from "motion/react";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  duration = 0.5,
}: {
  words: string;
  className?: string;
  duration?: number;
}) => {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    let isMounted = true;

    const runAnimationLoop = async () => {
      // Start hidden
      await animate(scope.current, { opacity: 0 }, { duration: 0 });
      if (!isMounted) return;

      while (isMounted) {
        // Animate In (fade in whole block)
        await animate(
          scope.current,
          { opacity: 1 },
          { duration: duration }
        );
        if (!isMounted) return;

        // Wait 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 5000));
        if (!isMounted) return;

        // Animate Out (fade out whole block)
        await animate(
          scope.current,
          { opacity: 0 },
          { duration: duration } 
        );
        if (!isMounted) return;

        // Brief pause before next loop
        await new Promise((resolve) => setTimeout(resolve, 100)); 
        if (!isMounted) return;
      }
    };

    runAnimationLoop();

    // Cleanup function
    return () => {
      isMounted = false;
      animate(scope.current, { opacity: 0 }, { duration: 0 });
    };
  }, [words, duration, animate, scope]);

  return (
    <motion.div 
      ref={scope}
      className={cn("font-normal", className)} 
      initial={{ opacity: 0 }}
    >
      <div className="mt-4">
        <div className=" dark:text-white text-black leading-snug tracking-wide">
          {words}
        </div>
      </div>
    </motion.div>
  );
};
