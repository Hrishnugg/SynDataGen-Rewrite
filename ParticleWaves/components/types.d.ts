import React from 'react';

export interface ThemedParticlesProps {
  /**
   * Theme mode for the particle animation
   * @default 'dark'
   */
  theme?: 'light' | 'dark';
}

/**
 * A beautiful particle wave animation component with theming support
 */
declare const ThemedParticles: React.FC<ThemedParticlesProps>;

export default ThemedParticles; 