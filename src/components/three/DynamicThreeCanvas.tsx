'use client';

/**
 * Dynamic Three Canvas
 * 
 * This file is dynamically imported to avoid SSR issues with React 19
 * It provides a simplified Canvas component compatible with React 19
 */

// Empty props object used for type checking
type Props = {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

// Create a fallback component for when Three.js can't be loaded
const FallbackCanvas = ({ className, style }: Props) => {
  return (
    <div 
      className={`w-full h-full bg-slate-800 opacity-50 flex items-center justify-center ${className || ''}`}
      style={style}
    >
      <div className="text-white">3D Content Loading...</div>
    </div>
  );
};

// In a real app, we would implement a version of ThreeCanvas here that works with React 19
// For now, we'll use a placeholder
const DynamicThreeCanvas = ({ children, className, style }: Props) => {
  // In a production app, this would be an actual implementation using Three.js
  // For now, we'll use a basic div as a placeholder
  return (
    <div 
      className={`relative overflow-hidden ${className || ''}`}
      style={{ 
        ...style,
        background: 'linear-gradient(135deg, #1a2a3a 0%, #0a0a1a 100%)',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-white opacity-50">
          Three.js content is temporarily disabled while we update compatibility with React 19
        </p>
      </div>
    </div>
  );
};

export default DynamicThreeCanvas;