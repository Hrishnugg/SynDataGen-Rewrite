import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Just use the built-in Three.js types and use type assertions to help TypeScript understand our intentions
type CustomPoints = THREE.Points;
type ShaderMaterialWithUniforms = THREE.ShaderMaterial & {
  uniforms: {
    pointTexture: {
      value: THREE.Texture;
    };
  };
};

const WaveformParticles: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef<THREE.Vector3>(new THREE.Vector3(999, 999, 0)); // Start off-screen
  
  // Define constants at component level to ensure they're in scope everywhere
  const WAVE_COUNT = 5;
  const PARTICLES_PER_WAVE = 4000;
  const BACKGROUND_PARTICLE_COUNT = 3000;
  
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Scene setup
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011); // Very dark background for better contrast
    
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 60; // Move camera back slightly for a better view
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);
    
    // Set up post-processing for bloom effect
    const renderScene = new RenderPass(scene, camera);
    
    // Configure bloom effect
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.75,    // bloom strength
      0.4,     // radius
      0.85     // threshold
    );
    
    // Create composer and add passes
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    
    // Common Y values for all waves to start and end at
    const commonStartY = 0;
    const commonEndY = 0;
    
    // Create particle systems for waves
    const waves: CustomPoints[] = [];
    
    // Add pink/magenta colors similar to Image 1
    const colors = [
      new THREE.Color(0xffffff), // white
      new THREE.Color(0xa6d8ff), // light blue
      new THREE.Color(0x4d94ff), // medium blue
      new THREE.Color(0x0047ab), // dark blue
      new THREE.Color(0xff69b4), // hot pink
      new THREE.Color(0xff1493), // deep pink
      new THREE.Color(0xff00ff)  // magenta
    ];
    
    for (let w = 0; w < WAVE_COUNT; w++) {
      const particles = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(PARTICLES_PER_WAVE * 3);
      const particleColors = new Float32Array(PARTICLES_PER_WAVE * 3);
      const originalPositions = new Float32Array(PARTICLES_PER_WAVE * 3);
      
      // Wave parameters - using different wave types for variety
      const waveHeight = 5 + w * 2.5; // Taller waves with more dramatic peaks
      const waveOffset = 0; // All waves share the same base offset
      
      // Select different wave equations for each wave to create varied but smooth patterns
      let waveType = w % 3; // 0, 1, or 2 - different wave patterns
      
      // Determine grid size for x-axis distribution
      const gridWidth = Math.sqrt(PARTICLES_PER_WAVE * 4);
      
      // Create cylindrical distribution around wave paths instead of flat bands
      for (let i = 0; i < PARTICLES_PER_WAVE; i++) {
        // Create a grid-like distribution pattern for particles
        const gridX = i % gridWidth;
        const gridZ = Math.floor(i / gridWidth);
        
        // Map grid coordinates to wave space (x-axis)
        const x = (gridX / gridWidth) * 100 - 50;
        
        // Create cylindrical distribution around the wave path
        // Generate angle around the wave path (0 to 2π)
        const angle = Math.random() * Math.PI * 2;
        // Generate distance from center path (with more particles closer to center)
        // Cubic power function creates higher density near center for more condensed waves
        // Reduced maximum radius to 2.0 (was 2.5) for tighter waves
        const distance = Math.pow(Math.random(), 3) * 2.0 + (w * 0.3);
        
        // Convert polar to cartesian coordinates around the wave path
        const yVariation = Math.sin(angle) * distance;
        const zVariation = Math.cos(angle) * distance;
        
        // Initialize with cylindrical dispersed positions
        const y = commonStartY + yVariation;
        const z = zVariation;
        
        particlePositions[i * 3] = x;
        particlePositions[i * 3 + 1] = y;
        particlePositions[i * 3 + 2] = z;
        
        // Store original positions and cylindrical coordinates
        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y; // Store the actual y position with offset
        originalPositions[i * 3 + 2] = z; // Store the actual z position
        
        // Create seamless color gradient based on x position
        // Map x position from -50 to 50 to a normalized 0 to 1 value
        const colorPosition = (x + 50) / 100;
        
        // Create more color variation for a smoother gradient
        // Use a continuous blend instead of discrete sections
        let color;
        
        if (colorPosition < 0.45) {
          // Left side - gradient from pure pink to mix
          // Linear interpolation between pink and white based on position
          const pinkFactor = 1 - (colorPosition / 0.45);
          const pinkColor = colors[Math.floor(Math.random() * 3) + 4]; // Pink base
          
          if (Math.random() < pinkFactor) {
            // Pure pink with probability decreasing toward center
            color = pinkColor;
          } else {
            // Increasing probability of white/blue mix toward center
            color = Math.random() < 0.5 ? 
                colors[0] : // White
                colors[Math.floor(Math.random() * 3) + 1]; // Blue
          }
        } else if (colorPosition > 0.55) {
          // Right side - gradient from mix to pure blue
          // Linear interpolation between blue and white based on position
          const blueFactor = (colorPosition - 0.55) / 0.45;
          const blueColor = colors[Math.floor(Math.random() * 3) + 1]; // Blue base
          
          if (Math.random() < blueFactor) {
            // Pure blue with probability increasing toward right
            color = blueColor;
          } else {
            // Decreasing probability of white/pink mix toward right
            color = Math.random() < 0.5 ? 
                colors[0] : // White
                colors[Math.floor(Math.random() * 3) + 4]; // Pink
          }
        } else {
          // Center zone - smooth blend
          const centerPosition = (colorPosition - 0.45) / 0.1; // 0 to 1 across center
          
          // White probability peaks at exact center
          const whiteProbability = 0.5 - Math.abs(centerPosition - 0.5) * 0.8;
          
          if (Math.random() < whiteProbability) {
            color = colors[0]; // White
          } else {
            // Smooth transition between pink and blue
            const blueProbability = centerPosition;
            color = Math.random() < blueProbability ?
                colors[Math.floor(Math.random() * 3) + 1] : // Blue
                colors[Math.floor(Math.random() * 3) + 4];  // Pink
          }
        }
        particleColors[i * 3] = color.r;
        particleColors[i * 3 + 1] = color.g;
        particleColors[i * 3 + 2] = color.b;
      }
      
      particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particles.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
      
      // Improved particle material with reduced opacity for bloom effect
      const particleMaterial = new THREE.PointsMaterial({
        size: 0.65,
        vertexColors: true,
        transparent: true,
        opacity: 0.6, // Further reduced for better bloom effect
        blending: THREE.AdditiveBlending,
        map: createParticleTexture(),
        sizeAttenuation: true,
      });
      
      const particleSystem = new THREE.Points(particles, particleMaterial);
      particleSystem.userData = {
        originalPositions,
        waveOffset,
        waveHeight,
        baseWaveHeight: waveHeight, // Store base height for fluctuation
        minWaveHeight: waveHeight * 0.6, // Minimum height threshold to prevent flat waves
        speed: 0.5 + Math.random() * 0.5,
        frequency: 0.02 + Math.random() * 0.02,
        baseFrequency: 0.02 + Math.random() * 0.02, // Store base frequency for fluctuation
        minFrequency: 0.015, // Minimum frequency to prevent straight lines
        amplitudeFluctuation: 0.2 + Math.random() * 0.6, // How much amplitude changes (reduced for smoother waves)
        frequencyFluctuation: 0.3 + Math.random() * 0.3, // How much frequency changes (reduced for smoother waves)
        fluctuationSpeed: 0.15 + Math.random() * 0.25, // Speed of fluctuation (slower for smoother waves)
        timeOffset: Math.random() * Math.PI * 2, // Random phase for fluctuation
        waveType: waveType, // Store the wave type
        sizeVariations: new Float32Array(PARTICLES_PER_WAVE), // Array to store size variations
        initialDistances: new Float32Array(PARTICLES_PER_WAVE), // Array for cylindrical distances
        initialAngles: new Float32Array(PARTICLES_PER_WAVE) // Array for cylindrical angles
      };
      
      // Store particle-specific information
      for (let i = 0; i < PARTICLES_PER_WAVE; i++) {
        // Generate distance and angle for cylindrical distribution
        const angle = Math.random() * Math.PI * 2;
        // Make the wave more condensed - reduce the radius to 2.0 (was 2.5)
        const distance = Math.pow(Math.random(), 3) * 2.0 + (w * 0.3);
        
        // Store size and position information
        particleSystem.userData.sizeVariations[i] = 0.4 + Math.random() * 0.7;
        particleSystem.userData.initialDistances[i] = distance;
        particleSystem.userData.initialAngles[i] = angle;
      }
      
      scene.add(particleSystem);
      waves.push(particleSystem);
    }
    
    // Add background particles
    let backgroundParticleSystem: THREE.Points | null = null;
    
    // Adjust background particles to match the new look
    if (BACKGROUND_PARTICLE_COUNT > 0) {
      const bgParticles = new THREE.BufferGeometry();
      const bgPositions = new Float32Array(BACKGROUND_PARTICLE_COUNT * 3);
      const bgColors = new Float32Array(BACKGROUND_PARTICLE_COUNT * 3);
      const bgSizes = new Float32Array(BACKGROUND_PARTICLE_COUNT);
      
      // Create randomly distributed background particles
      for (let i = 0; i < BACKGROUND_PARTICLE_COUNT; i++) {
        // Random position throughout the scene
        const x = (Math.random() * 2 - 1) * 70;
        const y = (Math.random() * 2 - 1) * 50;
        const z = (Math.random() * 2 - 1) * 30;
        
        bgPositions[i * 3] = x;
        bgPositions[i * 3 + 1] = y;
        bgPositions[i * 3 + 2] = z;
        
        // Variable sizes - some larger particles like in image 2
        bgSizes[i] = Math.random() < 0.05 ? // 5% of particles are larger
                      0.8 + Math.random() * 1.2 : // Large particles
                      0.1 + Math.random() * 0.4;  // Normal small particles
        
        // Use the same smooth gradient logic for background colors
        const colorPosition = (x + 70) / 140; // Normalize x position from -70 to 70
        
        let color;
        if (colorPosition < 0.4) {
          // Left side with some gradient
          const pinkFactor = 1 - (colorPosition / 0.4);
          color = Math.random() < pinkFactor * 0.8 ?
              colors[Math.floor(Math.random() * 3) + 4] : // Pink
              (Math.random() < 0.5 ? colors[0] : colors[Math.floor(Math.random() * 3) + 1]); // White or blue
        } else if (colorPosition > 0.6) {
          // Right side with some gradient
          const blueFactor = (colorPosition - 0.6) / 0.4;
          color = Math.random() < blueFactor * 0.8 ?
              colors[Math.floor(Math.random() * 3) + 1] : // Blue
              (Math.random() < 0.5 ? colors[0] : colors[Math.floor(Math.random() * 3) + 4]); // White or pink
        } else {
          // Center area
          color = Math.random() < 0.3 ?
              colors[0] : // 30% white
              (Math.random() < 0.5 ?
              colors[Math.floor(Math.random() * 3) + 4] : // Pink
              colors[Math.floor(Math.random() * 3) + 1]); // Blue
        }
        
        bgColors[i * 3] = color.r;
        bgColors[i * 3 + 1] = color.g;
        bgColors[i * 3 + 2] = color.b;
      }
      
      bgParticles.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
      bgParticles.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
      
      // Custom shader for variable sizes
      const bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: createParticleTexture() }
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          void main() {
            gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
            if (gl_FragColor.a < 0.1) discard;
          }
        `,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      
      bgParticles.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));
      backgroundParticleSystem = new THREE.Points(bgParticles, bgMaterial);
      scene.add(backgroundParticleSystem);
    }
    
    // Create more subtle glowing particle texture
    function createParticleTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      
      const context = canvas.getContext('2d');
      if (!context) return new THREE.Texture();
      
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      
      // Brighter white centers to enhance bloom effect
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.05, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(0.4, 'rgba(220, 240, 255, 0.5)');
      gradient.addColorStop(0.7, 'rgba(180, 210, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      return texture;
    }
    
    // Mouse interaction
    const raycaster = new THREE.Raycaster();
    const screenMouse = new THREE.Vector2();
    
    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      screenMouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      screenMouse.y = -((event.clientY - rect.top) / height) * 2 + 1;
      
      // Update the raycaster
      raycaster.setFromCamera(screenMouse, camera);
      
      // Calculate the point where the ray intersects the z=0 plane
      const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      raycaster.ray.intersectPlane(planeZ, mouseRef.current);
    };
    
    // Set mouse to far away when it leaves the canvas
    const handleMouseLeave = () => {
      mouseRef.current.set(999, 999, 0);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
    
    // Update background particles in the animation loop
    const animateBackgroundParticles = (time: number) => {
      // Only animate if background particles exist
      if (backgroundParticleSystem && backgroundParticleSystem.geometry) {
        const bgPositions = backgroundParticleSystem.geometry.attributes.position.array;
        
        // Subtle movement for background particles
        for (let i = 0; i < BACKGROUND_PARTICLE_COUNT; i++) {
          const ix = i * 3;
          
          // More natural, varied floating motion
          const uniqueOffsetY = i * 0.015;
          const uniqueOffsetX = i * 0.012;
          const uniqueSpeedY = 0.3 + Math.sin(i * 0.1) * 0.2;
          const uniqueSpeedX = 0.2 + Math.cos(i * 0.1) * 0.15;
          
          bgPositions[ix + 1] += Math.sin(time * uniqueSpeedY + uniqueOffsetY) * 0.015;
          bgPositions[ix] += Math.cos(time * uniqueSpeedX + uniqueOffsetX) * 0.01;
          bgPositions[ix + 2] += Math.sin(time * 0.2 + i * 0.02) * 0.005;
          
          // Wrap particles that drift too far
          if (bgPositions[ix + 1] > 50) bgPositions[ix + 1] = -50;
          if (bgPositions[ix + 1] < -50) bgPositions[ix + 1] = 50;
          if (bgPositions[ix] > 70) bgPositions[ix] = -70;
          if (bgPositions[ix] < -70) bgPositions[ix] = 70;
          if (bgPositions[ix + 2] > 30) bgPositions[ix + 2] = -30;
          if (bgPositions[ix + 2] < -30) bgPositions[ix + 2] = 30;
        }
        
        backgroundParticleSystem.geometry.attributes.position.needsUpdate = true;
      }
    };
    
    // Animation loop
    const animate = () => {
      const time = Date.now() * 0.001;
      
      // Update wave modulation
      waves.forEach((wave) => {
        const positions = wave.geometry.attributes.position.array;
        const userData = wave.userData;
        const originalPositions = userData.originalPositions;
        const baseWaveHeight = userData.baseWaveHeight;
        const waveOffset = userData.waveOffset;
        const speed = userData.speed;
        const baseFrequency = userData.baseFrequency;
        const waveType = userData.waveType;
        
        // Calculate fluctuating amplitude and frequency - more subtle now
        const timeWithOffset = time + userData.timeOffset;
        const amplitudeFluctuation = Math.sin(timeWithOffset * userData.fluctuationSpeed) * userData.amplitudeFluctuation;
        const frequencyFluctuation = Math.cos(timeWithOffset * userData.fluctuationSpeed * 0.7) * userData.frequencyFluctuation;
        
        // Apply fluctuations with minimum threshold to prevent flat waves
        const calculatedHeight = baseWaveHeight * (1 + amplitudeFluctuation * 0.7);
        // Ensure wave height never falls below minimum threshold
        const currentWaveHeight = Math.max(calculatedHeight, userData.minWaveHeight);
        
        // Ensure frequency never falls below minimum (prevents straight lines)
        const calculatedFrequency = baseFrequency * (1 + frequencyFluctuation * 0.2);
        const currentFrequency = Math.max(calculatedFrequency, userData.minFrequency);
        
        // Update wave properties for animation
        userData.waveHeight = currentWaveHeight;
        userData.frequency = currentFrequency;
        
        for (let i = 0; i < positions.length / 3; i++) {
          const ix = i * 3;
          const x = originalPositions[ix];
          
          // Generate different smooth wave patterns based on wave type
          let primaryWave, secondaryWave;
          const distanceFromCenter = Math.abs(x);
          const maxDistance = 50;
          
          // Create a smooth amplitude falloff that preserves the wave shape
          // Using cosine function for smooth tapering toward edges
          const normalizedDistance = distanceFromCenter / maxDistance;
          const smoothTaperingFactor = Math.cos(normalizedDistance * Math.PI * 0.5);
          
          // Ensure the tapering factor never makes the wave too flat
          // Minimum tapering of 0.15 at the edges prevents straight lines
          const minTapering = 0.15;
          const adjustedTaperingFactor = minTapering + smoothTaperingFactor * (1 - minTapering);
                
          // Different wave equations for variety
          switch(waveType) {
            case 0:
              // Standard sine wave
              primaryWave = Math.sin(x * currentFrequency + time * speed) * currentWaveHeight * adjustedTaperingFactor;
              secondaryWave = Math.sin(x * currentFrequency * 3 + time * speed * 0.7) * (currentWaveHeight * 0.2) * adjustedTaperingFactor;
              break;
            case 1:
              // Sine + cosine composite
              primaryWave = Math.sin(x * currentFrequency + time * speed) * currentWaveHeight * adjustedTaperingFactor;
              secondaryWave = Math.cos(x * currentFrequency * 2 + time * speed * 1.3) * (currentWaveHeight * 0.3) * adjustedTaperingFactor;
              break;
            case 2:
              // Smoother composite wave
              primaryWave = Math.sin(x * currentFrequency + time * speed) * currentWaveHeight * adjustedTaperingFactor;
              secondaryWave = Math.sin(x * currentFrequency * 1.5 + time * speed * 0.5) * (currentWaveHeight * 0.4) * adjustedTaperingFactor;
              break;
            default:
              // Fallback
              primaryWave = Math.sin(x * currentFrequency + time * speed) * currentWaveHeight * adjustedTaperingFactor;
              secondaryWave = 0;
          }
          
          // Combine waves for a final smooth pattern
          const baseY = waveOffset + primaryWave + secondaryWave;
          
          // Calculate ideal position on the wave
          const idealY = baseY;
          
          // Get the initial distance and angle for this particle from userData
          const initialDistance = userData.initialDistances[i];
          const initialAngle = userData.initialAngles[i];
          
          // Reconstruct the ideal cylindrical position around the wave
          const idealCylindricalY = idealY + Math.sin(initialAngle) * initialDistance;
          const idealCylindricalZ = Math.cos(initialAngle) * initialDistance;
          
          // Current position
          const currentY = positions[ix + 1];
          const currentZ = positions[ix + 2];
          
          // Calculate how far the particle is from its ideal position
          const deltaY = idealCylindricalY - currentY;
          const deltaZ = idealCylindricalZ - currentZ;
          const distanceFromIdeal = Math.sqrt(deltaY * deltaY + deltaZ * deltaZ);
          
          // Stronger return force when farther from ideal position
          // This creates a spring-like effect - increased strength for more responsive return
          const returnStrength = Math.min(1, distanceFromIdeal * 0.15);
          
          // Apply return force - stronger the further away
          let y = currentY + deltaY * returnStrength * 0.12;
          let z = currentZ + deltaZ * returnStrength * 0.12;
          
          // Mouse interaction - particles disperse near mouse position
          // Reduced influence radius for more targeted interactions
          const mouseInfluence = 12; // Smaller radius of influence (was 20)
          const mouseStrength = 12; // Dispersion effect strength
          
          // Calculate distance to mouse in x-y plane
          const dx = x - mouseRef.current.x;
          const dy = y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < mouseInfluence) {
            // Disperse particles away from mouse
            const angle = Math.atan2(dy, dx);
            const force = (1 - distance / mouseInfluence) * mouseStrength;
            
            // Add randomized dispersion with smoother falloff
            const falloff = Math.pow(1 - distance / mouseInfluence, 2);
            y += Math.sin(angle) * force * falloff * (0.5 + Math.random() * 0.5);
            z += (Math.random() - 0.5) * force * falloff * 2;
          }
          
          positions[ix + 1] = y;
          positions[ix + 2] = z;
        }
        
        wave.geometry.attributes.position.needsUpdate = true;
      });
      
      // Animate background particles
      animateBackgroundParticles(time);
      
      // Render with post-processing for bloom effect
      composer.render();
      
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    
    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
      
      // Update composer size
      composer.setSize(newWidth, newHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      waves.forEach(wave => {
        if (wave.geometry) wave.geometry.dispose();
        // Safely cast to PointsMaterial to access its properties
        if (wave.material) {
          const material = wave.material as THREE.PointsMaterial;
          if (material.map) material.map.dispose();
          material.dispose();
        }
      });
      
      // Clean up background particles if they exist
      if (backgroundParticleSystem) {
        if (backgroundParticleSystem.geometry) {
          backgroundParticleSystem.geometry.dispose();
          
          // Clean up additional buffer attributes if they exist
          const sizeAttr = backgroundParticleSystem.geometry.getAttribute('size');
          if (sizeAttr) {
            // Instead of setting array to null, we just let it be garbage collected
            // by not referencing it anymore - TypeScript will prevent direct null assignment
          }
        }
        
        if (backgroundParticleSystem.material) {
          const material = backgroundParticleSystem.material as ShaderMaterialWithUniforms;
          if (material.uniforms && material.uniforms.pointTexture) {
            material.uniforms.pointTexture.value.dispose();
          }
          material.dispose();
        }
        
        scene.remove(backgroundParticleSystem);
      }
      
      // Clean up post-processing resources
      renderScene.dispose();
      bloomPass.dispose();
      composer.dispose();
      
      renderer.dispose();
    };
  }, []);
  
  return <div ref={mountRef} className="w-full h-screen bg-black" />;
};

export default WaveformParticles; 