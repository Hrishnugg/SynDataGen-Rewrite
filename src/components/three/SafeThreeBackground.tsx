'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import ThreeDebugger from './ThreeDebugger';
// Import the WaveformParticles from our JavaScript loader
import { WaveformParticles } from './WaveParticleLoader';

/**
 * Safe Three Background
 * 
 * A component that loads the WaveformParticles from ParticleWaves
 */

type Props = {
  className?: string;
  style?: React.CSSProperties;
  debugMode?: boolean;
  theme?: 'light' | 'dark';
};

const SafeThreeBackground = ({ className, style, debugMode = false, theme = 'dark' }: Props) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDebugger, setShowDebugger] = useState(debugMode);

  useEffect(() => {
    console.log('SafeThreeBackground mounted with theme:', theme);
    
    // Add key handler to toggle debugger with Ctrl+D
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        setShowDebugger(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      console.log('SafeThreeBackground unmounted');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [theme]); // Add theme as a dependency so effect reruns when theme changes

  return (
    <div 
      className={`w-full h-full ${className || ''}`}
      style={{ 
        ...style,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {hasError ? (
        <div className="w-full h-full flex items-center justify-center text-white bg-gray-800">
          Error loading 3D background: {errorMessage}
        </div>
      ) : (
        <ErrorBoundary onError={(error) => {
          console.error('Error in 3D background:', error);
          setHasError(true);
          setErrorMessage(error.message);
        }}>
          {/* @ts-ignore - Component imported from JS file without TypeScript definitions */}
          <WaveformParticles theme={theme} />
        </ErrorBoundary>
      )}
      
      {showDebugger && (
        <div className="absolute bottom-0 left-0 right-0 z-50 max-h-[50vh] overflow-y-auto">
          <ThreeDebugger />
          <button 
            onClick={() => setShowDebugger(false)}
            className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

// Simple error boundary component for catching render errors
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError: (error: Error) => void;
}> {
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.props.children;
  }
}

export default SafeThreeBackground;