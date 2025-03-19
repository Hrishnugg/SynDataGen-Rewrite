'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Create a simple component to test the module import
const ThreeDebugger = () => {
  const [loadingState, setLoadingState] = useState('initializing');
  const [moduleInfo, setModuleInfo] = useState<any>(null);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    console.log('ThreeDebugger mounted, attempting to load module');
    
    const loadModule = async () => {
      try {
        setLoadingState('loading');
        const mod = await import('../../../ParticleWaves/components/themed-particles.clean');
        setLoadingState('loaded');
        
        console.log('Module loaded successfully:', mod);
        setModuleInfo({
          hasDefaultExport: !!mod.default,
          hasNamedExports: Object.keys(mod).filter(key => key !== 'default'),
          allKeys: Object.keys(mod)
        });
      } catch (error) {
        console.error('Failed to load module:', error);
        setLoadingState('error');
        setErrorInfo(error instanceof Error ? error.message : String(error));
      }
    };
    
    loadModule();
    
    return () => {
      console.log('ThreeDebugger unmounted');
    };
  }, []);

  return (
    <div className="p-4 bg-gray-800 text-white">
      <h2 className="text-xl font-bold mb-4">Three.js Module Debugger</h2>
      
      <div className="mb-4">
        <p><strong>Loading State:</strong> {loadingState}</p>
        {errorInfo && (
          <div className="mt-2 p-3 bg-red-900 rounded">
            <p><strong>Error:</strong> {errorInfo}</p>
          </div>
        )}
      </div>
      
      {moduleInfo && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Module Info:</h3>
          <ul className="list-disc pl-5">
            <li>Has Default Export: {moduleInfo.hasDefaultExport ? 'Yes' : 'No'}</li>
            <li>
              Named Exports: {moduleInfo.hasNamedExports.length > 0 
                ? moduleInfo.hasNamedExports.join(', ') 
                : 'None'}
            </li>
            <li>All Keys: {moduleInfo.allKeys.join(', ')}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ThreeDebugger; 