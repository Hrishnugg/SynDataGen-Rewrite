/**
 * StaticBackground.tsx
 * A non-interactive background component that serves as a placeholder 
 * for the WaveParticleBackground during server-side rendering
 */

export default function StaticBackground() {
  return (
    <div 
      className="absolute inset-0 w-full h-full" 
      style={{ 
        background: '#060B10',
        zIndex: 0
      }}
    />
  );
} 