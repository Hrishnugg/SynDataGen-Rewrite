import React from 'react';
import ParticleWaveContainer from '../components/ParticleWaveContainer';

/**
 * WaveDemo - Example page demonstrating the ParticleWaveContainer
 */
const WaveDemo = () => {
  return (
    <div className="wave-demo-page">
      <header>
        <h1>Particle Wave Visualization</h1>
      </header>
      
      {/* Full-height wave container */}
      <div className="wave-fullscreen-container">
        <ParticleWaveContainer />
      </div>
      
      <footer>
        <p>Interactive particle wave simulation</p>
      </footer>
      
      {/* Add page styling */}
      <style jsx global>{`
        body, html {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          background: #000011;
          color: white;
          font-family: 'Arial', sans-serif;
        }
        
        .wave-demo-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        
        header, footer {
          padding: 1rem;
          text-align: center;
          z-index: 10;
        }
        
        header {
          background: rgba(0, 0, 17, 0.7);
        }
        
        footer {
          background: rgba(0, 0, 17, 0.7);
          font-size: 0.9rem;
          color: #aaa;
        }
        
        .wave-fullscreen-container {
          flex: 1;
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default WaveDemo; 