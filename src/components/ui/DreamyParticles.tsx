"use client";

import { useRef } from "react";
import { ThreePlaceholder } from "../three/compat";
import dynamic from 'next/dynamic';

// Define types
interface DreamyParticlesProps {
  modelPath?: string;
  primaryColor?: [number, number, number];
  secondaryColor?: [number, number, number];
  mouseStrength?: number;
}

// Simplified component that uses our compatibility placeholder
function DreamyParticlesComponent({
  modelPath = "sphere",
  primaryColor = [1.0, 0.8, 0.3],
  secondaryColor = [1.0, 0.4, 0.0],
  mouseStrength = 0.05,
}: DreamyParticlesProps) {
  // Get the color in CSS hex format
  const primaryColorHex = `rgb(${Math.floor(primaryColor[0] * 255)}, ${Math.floor(primaryColor[1] * 255)}, ${Math.floor(primaryColor[2] * 255)})`;
  
  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div 
        className="w-full h-full" 
        style={{
          background: `radial-gradient(circle at 50% 50%, ${primaryColorHex}10 0%, #00000000 70%)`,
        }}
      >
        <ThreePlaceholder />
      </div>
    </div>
  );
}


// Export a client-only component
export default dynamic(() => Promise.resolve(DreamyParticlesComponent), {
  ssr: false,
});
