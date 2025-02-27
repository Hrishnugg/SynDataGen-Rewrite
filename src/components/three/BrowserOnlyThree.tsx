'use client';

/**
 * This file serves as a gateway to ensure React Three Fiber is only
 * initialized in a browser environment.
 * 
 * It uses a global variable check before importing any Three.js code.
 */

// First check if we're in a browser environment
const isBrowserEnv = typeof window !== 'undefined' && 
                    typeof window.document !== 'undefined' &&
                    typeof window.document.createElement !== 'undefined';

// Only export the Three.js related components when in browser
let ReactThreeComponents: any = {};

// Dynamic imports for Three.js components
if (isBrowserEnv) {
  // Import Three.js libraries
  import('@react-three/fiber').then(r3f => {
    ReactThreeComponents.Canvas = r3f.Canvas;
    ReactThreeComponents.useFrame = r3f.useFrame;
    ReactThreeComponents.useThree = r3f.useThree;
  });
  
  import('@react-three/drei').then(drei => {
    ReactThreeComponents.Environment = drei.Environment;
  });
  
  import('@react-three/postprocessing').then(postprocessing => {
    ReactThreeComponents.EffectComposer = postprocessing.EffectComposer;
    ReactThreeComponents.ChromaticAberration = postprocessing.ChromaticAberration;
    ReactThreeComponents.Bloom = postprocessing.Bloom;
  });
  
  import('postprocessing').then(processing => {
    ReactThreeComponents.BlendFunction = processing.BlendFunction;
  });
  
  import('three').then(three => {
    ReactThreeComponents.THREE = three;
    ReactThreeComponents.Vector2 = three.Vector2;
  });
}

// Export a placeholder function to check if Three.js is ready
export const isThreeReady = () => {
  return isBrowserEnv && 
         ReactThreeComponents.Canvas && 
         ReactThreeComponents.THREE;
};

// Export the components
export default ReactThreeComponents; 