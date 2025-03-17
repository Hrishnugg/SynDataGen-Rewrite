"use client";

import React from 'react';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export default function ParticleBackground(): JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef(new THREE.Vector3(999, 999, 0)); // Start off-screen
  
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Scene setup
    const width = mountRef.current.clientWidth || 300;
    const height = mountRef.current.clientHeight || 300;
    
    if (width === 0 || height === 0) {
      console.warn('Container has zero width or height. Delaying initialization.');
      return;
    }
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    const cameraDistance = 80;
    camera.position.set(0, 0, cameraDistance);
    camera.lookAt(0, 0, 0);
    
    // Create a container for all objects
    const sceneContainer = new THREE.Object3D();
    sceneContainer.position.set(0, 0, 0);
    scene.add(sceneContainer);
    
    // Calculate the visible area
    const fovRadians = camera.fov * Math.PI / 180;
    const visibleHeightAtZDepth = 2 * Math.tan(fovRadians / 2) * cameraDistance;
    const visibleWidthAtZDepth = visibleHeightAtZDepth * camera.aspect;
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance'
    });
    
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.autoClear = true;
    renderer.setClearColor(0x000011, 1);
    renderer.setSize(width, height, false);
    
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
    if (mountRef.current) {
      mountRef.current.appendChild(renderer.domElement);
    }
    
    // Post-processing setup
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.8, // strength
      0.3, // radius
      0.8  // threshold
    );
    bloomPass.renderToScreen = true;
    composer.addPass(bloomPass);
    
    // Create particles
    const PARTICLES_COUNT = 10000;
    const WAVE_COUNT = 5;
    const BACKGROUND_PARTICLES = 3000;
    
    // Define colors for gradients
    const leftColor = new THREE.Color(0xff00ff);  // Magenta for left side
    const centerColor = new THREE.Color(0xf0f0ff); // Slightly blue-tinted white for center
    const rightColor = new THREE.Color(0x0047ab);  // Blue for right side
    
    // Color interpolation helper
    const lerpColor = (colorA: THREE.Color, colorB: THREE.Color, t: number) => {
      const result = new THREE.Color();
      result.r = colorA.r + (colorB.r - colorA.r) * t;
      result.g = colorA.g + (colorB.g - colorA.g) * t;
      result.b = colorA.b + (colorB.b - colorA.b) * t;
      return result;
    };
    
    // Create wave containers
    const wavesContainer = new THREE.Object3D();
    wavesContainer.position.set(0, 0, 0);
    sceneContainer.add(wavesContainer);
    
    // Create waves
    const waves: THREE.Points[] = [];
    const aspectRatio = width / height;
    const isLandscape = aspectRatio > 1;
    const waveScale = isLandscape ? 0.65 : 0.75;
    const screenWidthFactor = isLandscape ? 0.85 : 0.85;
    const calculatedWidth = visibleWidthAtZDepth * screenWidthFactor;
    
    for (let w = 0; w < WAVE_COUNT; w++) {
      const particles = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(PARTICLES_COUNT / WAVE_COUNT * 3);
      const particleColors = new Float32Array(PARTICLES_COUNT / WAVE_COUNT * 3);
      const originalPositions = new Float32Array(PARTICLES_COUNT / WAVE_COUNT * 3);
      const particleSizes = new Float32Array(PARTICLES_COUNT / WAVE_COUNT);
      
      const waveHeight = 5 + w * 2.5;
      const waveOffset = 0;
      const gridWidth = Math.sqrt(PARTICLES_COUNT / WAVE_COUNT * 4.2);
      const waveType = w % 3;
      
      // Create particles for this wave
      for (let i = 0; i < PARTICLES_COUNT / WAVE_COUNT; i++) {
        const gridX = i % gridWidth;
        const gridZ = Math.floor(i / gridWidth);
        
        let screenPosition = (gridX / gridWidth) * 2 - 1;
        const edgeClusteringFactor = 1.15;
        screenPosition = Math.sign(screenPosition) * Math.pow(Math.abs(screenPosition), edgeClusteringFactor);
        
        const scaleFactor = 1.0;
        const x = screenPosition * (visibleWidthAtZDepth / 2) * scaleFactor;
        
        const angle = Math.random() * Math.PI * 2;
        const edgeProximity = Math.pow(Math.abs(screenPosition), 2);
        const radiusMultiplier = (isLandscape ? 0.65 : 0.55) * (1.0 - (edgeProximity * 0.3));
        const distance = Math.pow(Math.random(), 3) * 2.0 * radiusMultiplier + (w * 0.3);
        
        const yVariation = Math.sin(angle) * distance;
        const zVariation = Math.cos(angle) * distance;
        
        const y = waveOffset + yVariation;
        const z = zVariation;
        
        // Store positions
        particlePositions[i * 3] = x;
        particlePositions[i * 3 + 1] = y;
        particlePositions[i * 3 + 2] = z;
        
        // Store original positions for animation
        originalPositions[i * 3] = x;
        originalPositions[i * 3 + 1] = y;
        originalPositions[i * 3 + 2] = z;
        
        // Create color gradient
        const normalizedPos = (x / (calculatedWidth / 2));
        const colorPosition = (normalizedPos + 1) / 2;
        
        // Apply color gradient
        let color;
        if (colorPosition < 0.45) {
          const t = colorPosition / 0.45;
          const easedT = Math.pow(t, 1.0);
          color = lerpColor(leftColor, centerColor, easedT);
          
          if (Math.random() < 0.3) {
            const randomVariation = Math.random() * 0.12;
            color.offsetHSL(0, 0, randomVariation - 0.06);
          }
        } else if (colorPosition > 0.55) {
          const t = (colorPosition - 0.55) / 0.45;
          const easedT = Math.pow(t, 1.0);
          color = lerpColor(centerColor, rightColor, easedT);
          
          if (Math.random() < 0.3) {
            const randomVariation = Math.random() * 0.12;
            color.offsetHSL(0, 0, randomVariation - 0.06);
          }
        } else {
          const t = (colorPosition - 0.45) / 0.1;
          color = lerpColor(centerColor, centerColor, t);
          
          if (Math.random() < 0.5) {
            const randomVariation = Math.random() * 0.15;
            if (colorPosition < 0.5) {
              color.offsetHSL(-0.05, 0.1, randomVariation - 0.08);
            } else {
              color.offsetHSL(0.05, 0.1, randomVariation - 0.08);
            }
          }
        }
        
        particleColors[i * 3] = color.r;
        particleColors[i * 3 + 1] = color.g;
        particleColors[i * 3 + 2] = color.b;
        
        // Variable sizes for particles
        particleSizes[i] = 0.4 + Math.random() * 0.7;
      }
      
      // Set attributes
      particles.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      particles.setAttribute('customColor', new THREE.BufferAttribute(particleColors, 3));
      particles.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
      
      // Create shader material
      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: createParticleTexture() }
        },
        vertexShader: `
          attribute float size;
          attribute vec3 customColor;
          varying vec3 vColor;
          
          void main() {
            vColor = customColor;
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
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true,
        depthWrite: false
      });
      
      const particleSystem = new THREE.Points(particles, particleMaterial);
      particleSystem.userData = {
        originalPositions,
        waveOffset,
        waveHeight: waveHeight,
        baseWaveHeight: waveHeight,
        minWaveHeight: waveHeight * 0.6,
        speed: 0.5 + Math.random() * 0.5,
        frequency: 0.02 + Math.random() * 0.02,
        baseFrequency: 0.02 + Math.random() * 0.02,
        minFrequency: 0.015,
        amplitudeFluctuation: 0.2 + Math.random() * 0.6,
        frequencyFluctuation: 0.3 + Math.random() * 0.3,
        fluctuationSpeed: 0.15 + Math.random() * 0.25,
        timeOffset: Math.random() * Math.PI * 2,
        waveType: waveType,
        initialDistances: new Float32Array(PARTICLES_COUNT / WAVE_COUNT),
        initialAngles: new Float32Array(PARTICLES_COUNT / WAVE_COUNT)
      };
      
      // Store cylindrical coordinates for animation
      for (let i = 0; i < PARTICLES_COUNT / WAVE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.pow(Math.random(), 3) * 1.6 + (w * 0.25);
        
        particleSystem.userData.initialDistances[i] = distance;
        particleSystem.userData.initialAngles[i] = angle;
      }
      
      wavesContainer.add(particleSystem);
      waves.push(particleSystem);
    }
    
    // Add background particles
    let backgroundParticleSystem: THREE.Points | null = null;
    
    if (BACKGROUND_PARTICLES > 0) {
      const bgParticles = new THREE.BufferGeometry();
      const bgPositions = new Float32Array(BACKGROUND_PARTICLES * 3);
      const bgColors = new Float32Array(BACKGROUND_PARTICLES * 3);
      const bgSizes = new Float32Array(BACKGROUND_PARTICLES);
      
      for (let i = 0; i < BACKGROUND_PARTICLES; i++) {
        const spreadFactor = isLandscape ? 0.9 : 0.8;
        const bgScaleFactor = 1.0;
        
        let positionBias = Math.random() * 2 - 1;
        if (Math.random() < 0.15) {
          const edgeSide = Math.random() < 0.5 ? -1 : 1;
          positionBias = edgeSide * (0.85 + Math.random() * 0.15);
        }
        
        const x = positionBias * (visibleWidthAtZDepth / 2) * spreadFactor * bgScaleFactor;
        const y = (Math.random() * 2 - 1) * (visibleHeightAtZDepth / 2) * spreadFactor;
        const z = (Math.random() * 2 - 1) * 35;
        
        bgPositions[i * 3] = x;
        bgPositions[i * 3 + 1] = y;
        bgPositions[i * 3 + 2] = z;
        
        // Variable sizes
        bgSizes[i] = Math.random() < 0.05 ?
                    0.8 + Math.random() * 1.2 :
                    0.1 + Math.random() * 0.4;
        
        // Color based on position
        const normalizedBgX = (x / (calculatedWidth / 2 * spreadFactor));
        const bgColorPosition = (normalizedBgX + 1) / 2;
        
        let color;
        if (bgColorPosition < 0.45) {
          const t = bgColorPosition / 0.45;
          const easedT = Math.pow(t, 1.1);
          color = lerpColor(leftColor, centerColor, easedT);
          
          if (Math.random() < 0.3) {
            const randomVariation = Math.random() * 0.15;
            color.offsetHSL(0, 0, randomVariation - 0.07);
          }
        } else if (bgColorPosition > 0.55) {
          const t = (bgColorPosition - 0.55) / 0.45;
          const easedT = Math.pow(t, 1.1);
          color = lerpColor(centerColor, rightColor, easedT);
          
          if (Math.random() < 0.3) {
            const randomVariation = Math.random() * 0.15;
            color.offsetHSL(0, 0, randomVariation - 0.07);
          }
        } else {
          const t = (bgColorPosition - 0.45) / 0.1;
          color = lerpColor(centerColor, centerColor, t);
          
          if (Math.random() < 0.5) {
            const randomVariation = Math.random() * 0.15;
            if (bgColorPosition < 0.5) {
              color.offsetHSL(-0.05, 0.1, randomVariation - 0.08);
            } else {
              color.offsetHSL(0.05, 0.1, randomVariation - 0.08);
            }
          }
        }
        
        if (Math.random() < 0.1) {
          if (Math.random() < 0.5) {
            color.offsetHSL(0, 0, 0.1);
          } else {
            color.offsetHSL(0, 0, -0.15);
          }
        }
        
        bgColors[i * 3] = color.r;
        bgColors[i * 3 + 1] = color.g;
        bgColors[i * 3 + 2] = color.b;
      }
      
      bgParticles.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
      bgParticles.setAttribute('customColor', new THREE.BufferAttribute(bgColors, 3));
      bgParticles.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));
      
      const bgMaterial = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: createParticleTexture() }
        },
        vertexShader: `
          attribute float size;
          attribute vec3 customColor;
          varying vec3 vColor;
          
          void main() {
            vColor = customColor;
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
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true,
        depthWrite: false
      });
      
      backgroundParticleSystem = new THREE.Points(bgParticles, bgMaterial);
      scene.add(backgroundParticleSystem);
    }
    
    // Function to create particle texture
    function createParticleTexture(): THREE.Texture {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Could not get 2D context for particle texture');
        return new THREE.Texture();
      }
      
      context.clearRect(0, 0, 64, 64);
      
      const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.25, 'rgba(240, 250, 255, 0.9)');
      gradient.addColorStop(0.5, 'rgba(200, 230, 255, 0.6)');
      gradient.addColorStop(0.75, 'rgba(150, 200, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      texture.premultiplyAlpha = false;
      return texture;
    }
    
    // Function to constrain particle positions within visible space
    const constrainParticlePosition = (particleSystem: THREE.Points, maxWidth: number, maxHeight: number) => {
      // Ensure the particle system and its geometry exist
      if (!particleSystem || !particleSystem.geometry) return;
      
      // Safely check and access the position attribute
      const posAttr = particleSystem.geometry.getAttribute('position');
      if (!posAttr) return;
      
      const positions = posAttr.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Constraint X position
        if (Math.abs(positions[i]) > maxWidth) {
          positions[i] = Math.sign(positions[i] as number) * maxWidth;
        }
        
        // Constraint Y position
        if (Math.abs(positions[i+1]) > maxHeight) {
          positions[i+1] = Math.sign(positions[i+1] as number) * maxHeight;
        }
      }
      
      // Mark position attribute as needing update
      posAttr.needsUpdate = true;
    };
    
    // Mouse interaction
    const raycaster = new THREE.Raycaster();
    const screenMouse = new THREE.Vector2();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    
    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      screenMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      screenMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(screenMouse, camera);
      
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(interactionPlane, intersectPoint);
      
      if (mouseRef.current) {
        mouseRef.current.copy(intersectPoint);
      }
    };
    
    const handleMouseLeave = () => {
      if (mouseRef.current) {
        mouseRef.current.set(999, 999, 0);
      }
    };
    
    // Animate background particles
    const animateBackgroundParticles = (time: number) => {
      if (backgroundParticleSystem && backgroundParticleSystem.geometry) {
        const bgPositions = backgroundParticleSystem.geometry.attributes.position.array;
        
        const maxBgX = visibleWidthAtZDepth * 0.48;
        const maxBgY = visibleHeightAtZDepth * 0.48;
        const maxBgZ = 35;
        
        for (let i = 0; i < BACKGROUND_PARTICLES; i++) {
          const ix = i * 3;
          
          const uniqueOffsetY = i * 0.015;
          const uniqueOffsetX = i * 0.012;
          const uniqueSpeedY = 0.3 + Math.sin(i * 0.1) * 0.2;
          const uniqueSpeedX = 0.2 + Math.cos(i * 0.1) * 0.15;
          
          bgPositions[ix + 1] += Math.sin(time * uniqueSpeedY + uniqueOffsetY) * 0.015;
          bgPositions[ix] += Math.cos(time * uniqueSpeedX + uniqueOffsetX) * 0.01;
          bgPositions[ix + 2] += Math.sin(time * 0.2 + i * 0.02) * 0.005;
          
          if (Math.abs(bgPositions[ix]) > maxBgX) {
            bgPositions[ix] = Math.sign(bgPositions[ix]) * (maxBgX - Math.random() * 3);
          }
          
          if (Math.abs(bgPositions[ix + 1]) > maxBgY) {
            bgPositions[ix + 1] = Math.sign(bgPositions[ix + 1]) * (maxBgY - Math.random() * 3);
          }
          
          if (Math.abs(bgPositions[ix + 2]) > maxBgZ) {
            bgPositions[ix + 2] = Math.sign(bgPositions[ix + 2]) * (maxBgZ - Math.random() * 3);
          }
        }
        
        if (backgroundParticleSystem.geometry.attributes.position) {
          backgroundParticleSystem.geometry.attributes.position.needsUpdate = true;
        }
      }
    };
    
    // Animation loop
    const animate = () => {
      const time = Date.now() * 0.001;
      
      // Update wave animations
      waves.forEach((wave) => {
        const positions = wave.geometry.attributes.position.array;
        const originalPositions = wave.userData.originalPositions;
        const baseWaveHeight = wave.userData.baseWaveHeight;
        const waveOffset = wave.userData.waveOffset;
        const speed = wave.userData.speed;
        const baseFrequency = wave.userData.baseFrequency;
        const waveType = wave.userData.waveType;
        
        // Calculate fluctuations
        const timeWithOffset = time + wave.userData.timeOffset;
        const amplitudeFluctuation = Math.sin(timeWithOffset * wave.userData.fluctuationSpeed) * wave.userData.amplitudeFluctuation;
        const frequencyFluctuation = Math.cos(timeWithOffset * wave.userData.fluctuationSpeed * 0.7) * wave.userData.frequencyFluctuation;
        
        const calculatedHeight = baseWaveHeight * (1 + amplitudeFluctuation * 0.6);
        const currentWaveHeight = Math.max(calculatedHeight, wave.userData.minWaveHeight);
        
        const calculatedFrequency = baseFrequency * (1 + frequencyFluctuation * 0.15);
        const currentFrequency = Math.max(calculatedFrequency, wave.userData.minFrequency);
        
        const zoomFrequencyCorrection = isLandscape ? 1.0 : 0.95;
        const zoomAdjustedFrequency = currentFrequency * zoomFrequencyCorrection;
        
        wave.userData.waveHeight = currentWaveHeight;
        wave.userData.frequency = zoomAdjustedFrequency;
        
        const particleCount = positions.length / 3;
        
        for (let i = 0; i < particleCount; i++) {
          const ix = i * 3;
          
          const x = originalPositions[ix];
          
          let primaryWave, secondaryWave;
          
          const normalizedDistanceFromCenter = Math.abs(x / (calculatedWidth / 2));
          const smoothTaperingFactor = Math.cos(normalizedDistanceFromCenter * Math.PI * 0.5);
          
          const minTapering = 0.2;
          const edgeProximityFactor = Math.pow(normalizedDistanceFromCenter, 3);
          const edgeStabilization = 1.0 - (edgeProximityFactor * 0.5);
          const adjustedTaperingFactor = minTapering + smoothTaperingFactor * (1 - minTapering) * edgeStabilization;
          
          const wavelengthAdjustment = isLandscape ? 1.0 : 0.85;
          const adjustedFrequency = currentFrequency * wavelengthAdjustment;
          
          // Different wave types
          switch(waveType) {
            case 0:
              primaryWave = Math.sin((x * adjustedFrequency) + (Math.PI/2) + time * speed) * currentWaveHeight * adjustedTaperingFactor;
              secondaryWave = Math.sin((x * adjustedFrequency * 2.8) + (Math.PI/2) + time * speed * 0.7) * (currentWaveHeight * 0.22) * adjustedTaperingFactor;
              break;
            case 1:
              primaryWave = Math.sin((x * adjustedFrequency) + (Math.PI/2) + time * speed) * currentWaveHeight * adjustedTaperingFactor;
              secondaryWave = Math.sin((x * adjustedFrequency * 2) + (Math.PI/2) + time * speed * 1.3) * (currentWaveHeight * 0.3) * adjustedTaperingFactor;
              break;
            case 2:
              primaryWave = Math.sin((x * adjustedFrequency) + (Math.PI/2) + time * speed) * currentWaveHeight * adjustedTaperingFactor;
              secondaryWave = Math.sin((x * adjustedFrequency * 1.5) + (Math.PI/2) + time * speed * 0.5) * (currentWaveHeight * 0.4) * adjustedTaperingFactor;
              break;
            default:
              primaryWave = Math.sin(x * currentFrequency + time * speed) * currentWaveHeight * adjustedTaperingFactor;
              secondaryWave = 0;
          }
          
          const baseY = waveOffset + primaryWave + secondaryWave;
          const idealY = baseY;
          
          const initialDistance = wave.userData.initialDistances[i];
          const initialAngle = wave.userData.initialAngles[i];
          
          const idealCylindricalY = idealY + Math.sin(initialAngle) * initialDistance;
          const idealCylindricalZ = Math.cos(initialAngle) * initialDistance;
          
          const currentY = positions[ix + 1];
          const currentZ = positions[ix + 2];
          
          const deltaY = idealCylindricalY - currentY;
          const deltaZ = idealCylindricalZ - currentZ;
          const distanceFromIdeal = Math.sqrt(deltaY * deltaY + deltaZ * deltaZ);
          
          const returnStrength = Math.min(1, distanceFromIdeal * 0.15);
          
          let y = currentY + deltaY * returnStrength * 0.12;
          let z = currentZ + deltaZ * returnStrength * 0.12;
          
          // Mouse interaction
          const mouseInfluenceBase = 7;
          const mouseInfluence = (mouseInfluenceBase / waveScale) * (isLandscape ? 0.85 : 0.7);
          const mouseStrength = 10 * (isLandscape ? 0.85 : 1.0);
          
          if (mouseRef.current && mouseRef.current.x !== 999) {
            const dx = x - mouseRef.current.x;
            const dy = y - mouseRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < mouseInfluence) {
              const angle = Math.atan2(dy, dx);
              const force = (1 - distance / mouseInfluence) * mouseStrength;
              
              const falloff = Math.pow(1 - distance / mouseInfluence, 2);
              y += Math.sin(angle) * force * falloff * (0.5 + Math.random() * 0.5);
              z += (Math.random() - 0.5) * force * falloff * 2;
            }
          }
          
          // Constrain positions
          const maxAllowedX = visibleWidthAtZDepth * 0.5;
          const maxAllowedY = visibleHeightAtZDepth * 0.5;
          const maxAllowedZ = 40;
          
          if (Math.abs(y) > maxAllowedY) {
            y = Math.sign(y) * (maxAllowedY - 1 - Math.random() * 2);
          }
          
          if (Math.abs(z) > maxAllowedZ) {
            z = Math.sign(z) * (maxAllowedZ - 1 - Math.random() * 2);
          }
          
          positions[ix + 1] = y;
          positions[ix + 2] = z;
        }
        
        wave.geometry.attributes.position.needsUpdate = true;
      });
      
      // Animate background particles
      animateBackgroundParticles(time);
      
      // Periodically constrain particle positions
      if (Math.floor(time * 60) % 10 === 0) {
        waves.forEach(wave => {
          constrainParticlePosition(wave, visibleWidthAtZDepth, visibleHeightAtZDepth);
        });
        
        if (backgroundParticleSystem) {
          constrainParticlePosition(backgroundParticleSystem, visibleWidthAtZDepth * 1.1, visibleHeightAtZDepth * 1.1);
        }
      }
      
      // Render
      composer.render();
      
      // Continue animation loop
      requestAnimationFrame(animate);
    };
    
    // Handle window resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      const newWidth = mountRef.current.clientWidth || 300;
      const newHeight = mountRef.current.clientHeight || 300;
      
      if (newWidth === 0 || newHeight === 0) return;
      
      // Update camera
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      
      // Update renderer and composer
      renderer.setSize(newWidth, newHeight, false);
      composer.setSize(newWidth, newHeight);
    };
    
    // Start animation
    const animationId = requestAnimationFrame(animate);
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseleave', handleMouseLeave);
    
    // Clean up
    return () => {
      cancelAnimationFrame(animationId);
      
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose resources
      waves.forEach(wave => {
        if (wave.geometry) wave.geometry.dispose();
        if (wave.material) {
          if ((wave.material as THREE.ShaderMaterial).uniforms && (wave.material as THREE.ShaderMaterial).uniforms.pointTexture) {
            (wave.material as THREE.ShaderMaterial).uniforms.pointTexture.value.dispose();
          }
          if (Array.isArray(wave.material)) {
            wave.material.forEach(m => m.dispose());
          } else {
            wave.material.dispose();
          }
        }
      });
      
      if (backgroundParticleSystem) {
        if (backgroundParticleSystem.geometry) {
          backgroundParticleSystem.geometry.dispose();
        }
        
        if (backgroundParticleSystem.material) {
          if ((backgroundParticleSystem.material as THREE.ShaderMaterial).uniforms && 
              (backgroundParticleSystem.material as THREE.ShaderMaterial).uniforms.pointTexture) {
            (backgroundParticleSystem.material as THREE.ShaderMaterial).uniforms.pointTexture.value.dispose();
          }
          if (Array.isArray(backgroundParticleSystem.material)) {
            backgroundParticleSystem.material.forEach(m => m.dispose());
          } else {
            backgroundParticleSystem.material.dispose();
          }
        }
      }
      
      composer.dispose();
      renderer.dispose();
    };
  }, []);
  
  return (
    <div className="wave-particles-container" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />
    </div>
  );
} 