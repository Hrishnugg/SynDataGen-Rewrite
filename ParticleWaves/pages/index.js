import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import the WaveformParticles component with SSR disabled
// This is necessary because Three.js uses browser-specific APIs
const WaveformParticles = dynamic(
  () => import('../components/wave-particles'),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="particles-container" style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px',
        borderRadius: '10px',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <h2 style={{ margin: 0 }}>Particle Wave Demo</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link 
            href="/theme-test"
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              padding: '8px 12px',
              background: 'rgba(70, 130, 180, 0.7)',
              borderRadius: '5px',
              fontWeight: 'bold'
            }}
          >
            Test Theme Toggle
          </Link>
          <Link 
            href="/theme-comparison"
            style={{ 
              color: 'white', 
              textDecoration: 'none',
              padding: '8px 12px',
              background: 'rgba(70, 130, 180, 0.7)',
              borderRadius: '5px',
              fontWeight: 'bold'
            }}
          >
            Compare Themes
          </Link>
        </nav>
      </div>
      <WaveformParticles />
    </div>
  );
} 