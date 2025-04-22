"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { createNoise3D } from "simplex-noise";

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = "slow",
  waveOpacity = 0.5,
  ...props
}: {
  children?: any;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: "slow" | "fast";
  waveOpacity?: number;
  [key: string]: any;
}) => {
  const noise = createNoise3D();
  let w: number,
    h: number,
    nt: number,
    i: number,
    x: number,
    ctx: any,
    canvas: any;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const observerRef = useRef<HTMLDivElement>(null); // Ref for observer target
  const animationIdRef = useRef<number | null>(null); // Ref for animation frame ID
  const isVisible = useRef<boolean>(false); // Ref to track visibility state

  const getSpeed = () => {
    switch (speed) {
      case "slow":
        return 0.001;
      case "fast":
        return 0.002;
      default:
        return 0.001;
    }
  };

  const init = () => {
    canvas = canvasRef.current;
    if (!canvas) return; // Exit if canvas not ready

    ctx = canvas.getContext("2d");
    w = ctx.canvas.width = window.innerWidth;
    h = ctx.canvas.height = window.innerHeight;
    ctx.filter = `blur(${blur}px)`;
    nt = 0;

    window.onresize = function () {
        if (!canvasRef.current) return;
        w = ctx.canvas.width = window.innerWidth;
        h = ctx.canvas.height = window.innerHeight;
        ctx.filter = `blur(${blur}px)`;
    };
    // Initial render call is handled by observer effect if visible
  };

  const waveColors = colors ?? [
    "#38bdf8",
    "#818cf8",
    "#c084fc",
    "#e879f9",
    "#234d96",
  ];
  const drawWave = (n: number) => {
    if (!ctx) return; // Ensure context exists
    nt += getSpeed();
    for (i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.lineWidth = waveWidth || 25;
      ctx.strokeStyle = waveColors[i % waveColors.length];
      for (x = 0; x < w; x += 5) {
        var y = noise(x / 800, 0.3 * i, nt) * 100;
        ctx.lineTo(x, y + h * 0.5); // adjust for height, currently at 50% of the container
      }
      ctx.stroke();
      ctx.closePath();
    }
  };

  const render = () => {
    // --- Animation Pause Logic ---
    if (!isVisible.current) {
      // If not visible, ensure animation is stopped and exit render loop
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      return;
    }
    // --- End Animation Pause Logic ---

    if (!ctx || !canvas) return; // Ensure context and canvas exist

    ctx.fillStyle = backgroundFill || "black";
    ctx.globalAlpha = waveOpacity || 0.5;
    ctx.fillRect(0, 0, w, h);
    drawWave(5);
    animationIdRef.current = requestAnimationFrame(render); // Request next frame ONLY if visible
  };

  // --- Intersection Observer Effect ---
  useEffect(() => {
    const currentObserverRef = observerRef.current; // Capture ref value
    if (!currentObserverRef) return; // Don't run if ref not set

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const currentlyVisible = entry.isIntersecting;
        isVisible.current = currentlyVisible; // Update visibility state

        if (currentlyVisible) {
          // If visible and animation isn't running, start it
          if (animationIdRef.current === null) {
            render(); // Start the animation loop
          }
        } else {
          // If not visible and animation is running, stop it
          if (animationIdRef.current !== null) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
          }
        }
      },
      { threshold: 0.1 } // Trigger when 10% is visible/hidden
    );

    observer.observe(currentObserverRef);

    // Cleanup function
    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
      observer.disconnect();
      // Also cancel any pending frame on cleanup/unmount
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, []); // Run only once on mount
  // --- End Intersection Observer Effect ---

  // --- Initialization and Safari Check Effect ---
  useEffect(() => {
    init();
    // No need to call render() here, observer handles starting it
    // No need for cancelAnimationFrame cleanup here, observer handles stopping it

    // I'm sorry but i have got to support it on safari.
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Keep dependencies empty if init doesn't rely on props that change
  // --- End Initialization and Safari Check Effect ---


  const [isSafari, setIsSafari] = useState(false);
  // useEffect(() => { ... Safari Check Logic Moved to Init Effect ... }, []); // This effect is now combined

  return (
    <div
      ref={observerRef} // Attach observer ref here
      className={cn(
        "h-screen flex flex-col items-center justify-center", // Ensure component has dimensions
        containerClassName
      )}
    >
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={{
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }}
      ></canvas>
      <div className={cn("relative z-10", className)} {...props}>
        {children}
      </div>
    </div>
  );
};
