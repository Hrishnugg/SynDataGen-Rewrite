"use client";

import { useRef, useState } from "react";
import { ThreePlaceholder } from "../three/compat";
import dynamic from 'next/dynamic';

// Type for the particle configuration
interface ParticleConfig {
  mouseForce?: number;
  mouseRadius?: number;
  pointSize?: number;
  color?: [number, number, number];
  color1?: [number, number, number];
}

// Simplified component for React 19 compatibility
function GPGPUParticleBackgroundComponent({
  config = {},
}: {
  config?: ParticleConfig;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Configuration with defaults
  const finalConfig: ParticleConfig = {
    mouseForce: config.mouseForce || 0.5,
    mouseRadius: config.mouseRadius || 0.1,
    pointSize: config.pointSize || 2.0,
    color: config.color || [0.808, 0.647, 0.239], // Gold color
  };
  
  // Convert color to CSS format
  const colorHex = `rgb(${Math.floor((finalConfig.color?.[0] || 0) * 255)}, ${Math.floor((finalConfig.color?.[1] || 0) * 255)}, ${Math.floor((finalConfig.color?.[2] || 0) * 255)})`;
  
  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <div 
        className="w-full h-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${colorHex}10 0%, #00000000 70%)`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <ThreePlaceholder />
        </div>
      </div>
    </div>
  );
}

// Export a client-only version of the component 
export default dynamic(() => Promise.resolve(GPGPUParticleBackgroundComponent), { 
  ssr: false,
});