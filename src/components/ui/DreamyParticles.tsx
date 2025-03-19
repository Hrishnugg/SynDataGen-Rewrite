"use client";

import SafeThreeBackground from '@/components/three/SafeThreeBackground';

interface DreamyParticlesProps {
  debugMode?: boolean;
  theme?: 'light' | 'dark';
}

const DreamyParticles = ({ debugMode = false, theme = 'dark' }: DreamyParticlesProps) => {
  return (
    <SafeThreeBackground 
      className="w-full h-full" 
      debugMode={debugMode}
      theme={theme}
    />
  );
};

export default DreamyParticles;
