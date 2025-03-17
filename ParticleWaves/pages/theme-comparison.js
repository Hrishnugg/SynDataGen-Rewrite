import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the ThemedParticles component with SSR disabled
const ThemedParticles = dynamic(
  () => import('../components/themed-particles'),
  { ssr: false }
);

export default function ThemeComparison() {
  return (
    <div className="theme-comparison-container" style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'row'
    }}>
      {/* Left side - Dark theme */}
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        borderRight: '1px solid #444' 
      }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 100,
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '10px',
          borderRadius: '5px',
          color: 'white'
        }}>
          <h3 style={{ margin: 0 }}>Dark Theme</h3>
        </div>
        <ThemedParticles theme="dark" />
      </div>
      
      {/* Right side - Light theme */}
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        borderLeft: '1px solid #ccc' 
      }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 100,
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '10px',
          borderRadius: '5px',
          color: 'white'
        }}>
          <h3 style={{ margin: 0 }}>Light Theme</h3>
        </div>
        <ThemedParticles theme="light" />
      </div>
    </div>
  );
} 