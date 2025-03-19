'use client';

import dynamic from 'next/dynamic';
import React, { memo } from 'react';

// Create a JavaScript loader for the WaveformParticles component to bypass TypeScript issues
const getWaveformComponent = () => {
  // Use dynamic to load the component with SSR disabled
  const DynamicComponent = dynamic(
    () => {
      console.log('Attempting to load particle component...');
      
      // First try the original version
      return import('../../../ParticleWaves/components/themed-particles')
        .then(mod => {
          console.log('Themed particles (original) module loaded:', mod);
          
          if (mod.default) {
            console.log('Using default export from original themed-particles');
            return mod.default;
          }
          
          // If that fails, try the clean version
          console.log('Default export not found in original, trying clean version...');
          return import('../../../ParticleWaves/components/themed-particles.clean')
            .then(cleanMod => {
              console.log('Themed particles (clean) module loaded:', cleanMod);
              
              if (cleanMod.default) {
                console.log('Using default export from clean themed-particles');
                return cleanMod.default;
              }
              
              console.error('No valid exports found in either module');
              return () => (
                <div className="w-full h-full flex items-center justify-center text-white bg-gray-800">
                  Failed to load 3D content - No valid export found in either module
                </div>
              );
            });
        })
        .catch(err => {
          console.error('Error loading particle modules:', err);
          return () => (
            <div className="w-full h-full flex items-center justify-center text-white bg-gray-800">
              Error loading modules: {err.message}
            </div>
          );
        });
    },
    { 
      ssr: false,
      loading: () => <div className="w-full h-full flex items-center justify-center text-white">3D Content Loading...</div>
    }
  );

  // Create a wrapper component that passes props to the dynamically loaded component
  // Use React.memo to prevent unnecessary re-renders
  return memo(({ theme = 'dark', ...props }) => {
    console.log('Rendering WaveformParticles with theme:', theme);
    return <DynamicComponent theme={theme} {...props} />;
  });
};

// Export the dynamic component
export const WaveformParticles = getWaveformComponent(); 