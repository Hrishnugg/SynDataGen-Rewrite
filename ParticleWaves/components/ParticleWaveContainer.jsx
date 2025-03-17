import React from 'react';
import WaveformParticles from './wave-particles';

/**
 * ParticleWaveContainer - A React component that wraps the WaveformParticles component
 * This container component can be used to add additional props, context, or styling
 * while preserving the original WaveformParticles implementation
 */
const ParticleWaveContainer = ({ 
  className = '',
  style = {}, 
  ...props 
}) => {
  return (
    <div 
      className={`particle-wave-container ${className}`}
      style={{ 
        position: 'relative',
        width: '100%', 
        height: '100%',
        overflow: 'hidden',
        ...style 
      }}
      {...props}
    >
      <WaveformParticles />
    </div>
  );
};

export default ParticleWaveContainer; 