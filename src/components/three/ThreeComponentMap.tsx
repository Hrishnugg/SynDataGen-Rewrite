'use client';

import { lazy } from 'react';

// Map component names to their lazy-loaded implementations
// This gives us a centralized registry of all Three.js components
const ThreeComponentMap = {
  // Background component
  'BrowserSafeBackground': lazy(() => import('./BrowserSafeBackground')),
  
  // 3D Model component
  'BrowserSafeDecagon': lazy(() => import('./BrowserSafeDecagon')),
};

export default ThreeComponentMap; 