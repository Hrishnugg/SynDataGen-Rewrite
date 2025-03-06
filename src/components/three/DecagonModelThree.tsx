'use client';

import { useRef, useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { ThreePlaceholder } from "./compat";

// Main export component with placeholder for React 19 compatibility
export default function DecagonModelThree() {
  const [isMounted, setIsMounted] = useState(false);
  const { theme } = useTheme();
  
  // Explicit client-side only initialization
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return null; // Return nothing during SSR and initial client render
  }
  
  // Use a placeholder SVG animation for now
  return (
    <div className="h-[900px] w-full translate-y-20 flex items-center justify-center">
      <div 
        className="w-full h-full flex items-center justify-center"
        style={{
          background: theme === "dark" ? "radial-gradient(circle at 50% 50%, #2563eb20 0%, #00000000 70%)" : "radial-gradient(circle at 50% 50%, #2563eb10 0%, #ffffff00 70%)"
        }}
      >
        <svg 
          width="400" 
          height="400" 
          viewBox="0 0 200 200" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="animate-spin-slow"
          style={{ animationDuration: '20s' }}
        >
          <polygon 
            points="100,10 129.4,19.1 153.2,40.8 165.5,70.1 165.5,103.3 153.2,132.6 129.4,154.3 100,163.4 70.6,154.3 46.8,132.6 34.5,103.3 34.5,70.1 46.8,40.8 70.6,19.1" 
            fill="transparent" 
            stroke={theme === "dark" ? "#2563eb" : "#2563eb"} 
            strokeWidth="2" 
          />
          <circle 
            cx="100" 
            cy="100" 
            r="40" 
            fill={theme === "dark" ? "#2563eb" : "#2563eb"} 
            fillOpacity="0.2" 
          />
        </svg>
      </div>
    </div>
  );
}