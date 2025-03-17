import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the ThemedParticles component with SSR disabled
// This is necessary because Three.js uses browser-specific APIs
const ThemedParticles = dynamic(
  () => import('../components/themed-particles'),
  { ssr: false }
);

export default function ThemeTest() {
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="theme-test-container" style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Control panel */}
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
        <h2 style={{ margin: 0 }}>Particle Theme Test</h2>
        <div>
          <p style={{ margin: '5px 0' }}>Current Theme: <strong>{theme}</strong></p>
          <button 
            onClick={toggleTheme}
            style={{
              padding: '8px 16px',
              background: theme === 'dark' ? '#ffffff' : '#333333',
              color: theme === 'dark' ? '#333333' : '#ffffff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </div>
      </div>
      
      {/* Particle component */}
      <ThemedParticles theme={theme} />
    </div>
  );
} 