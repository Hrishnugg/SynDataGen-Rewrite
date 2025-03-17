"use client";

import { Suspense, lazy } from 'react';
import { SafeDecagonModel } from '@/components/three/compat';

// Placeholder component with no Three.js dependencies
function LoadingPlaceholder() {
  return (
    <div className="h-[900px] w-full translate-y-20 flex items-center justify-center">
      <div className="w-full h-full rounded-lg bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading 3D Model...</div>
      </div>
    </div>
  );
}

// Main component that only loads Three.js code on the client
export default function DecagonModel() {
  return (
    <Suspense fallback={<LoadingPlaceholder />}>
      <div className="h-[900px] w-full translate-y-20 flex items-center justify-center">
        <SafeDecagonModel color="#6366f1" />
      </div>
    </Suspense>
  );
}
