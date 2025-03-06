"use client";

import { useRef } from "react";
import { ThreePlaceholder } from "../three/compat";

// Configuration type
interface ParticleConfig {
  waveInfluence: number;
  fluidInfluence: number;
  mouseForce: number;
  mouseRadius: number;
  particleCount: number;
  showControls: boolean;
}

// Main component - replaced with a placeholder for React 19 compatibility
export default function TestWaveParticleBackground({
  config
}: {config: ParticleConfig;}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full overflow-hidden"
      style={{ zIndex: 0 }}>
      {/* Placeholder for the 3D animation, showing a gradient background instead */}
      <div className="w-full h-full bg-gradient-to-b from-blue-900 to-black">
        <div className="absolute inset-0 flex items-center justify-center text-white opacity-30">
          <ThreePlaceholder />
        </div>
      </div>
    </div>
  );
}