import React, { CSSProperties, HTMLAttributes } from 'react';
import WaveformParticles from './wave-particles';

interface ParticleWaveContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Additional CSS class names to apply to the container
   */
  className?: string;
  /**
   * Custom styles to apply to the container
   */
  style?: CSSProperties;
}

/**
 * ParticleWaveContainer - A React component that wraps the WaveformParticles component
 * This container component can be used to add additional props, context, or styling
 * while preserving the original WaveformParticles implementation
 */
const ParticleWaveContainer: React.FC<ParticleWaveContainerProps> = ({ 
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