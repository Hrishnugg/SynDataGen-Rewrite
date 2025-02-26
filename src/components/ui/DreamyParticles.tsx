'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Define types
interface DreamyParticlesProps {
  modelPath?: string;
  primaryColor?: [number, number, number];
  secondaryColor?: [number, number, number];
  mouseStrength?: number;
}

// Particle system constants
const WIDTH = 256; // Increased for better particle definition while keeping performance

// Main component
export default function DreamyParticles({
  modelPath = 'sphere',
  primaryColor = [1.0, 0.8, 0.3],
  secondaryColor = [1.0, 0.4, 0.0],
  mouseStrength = 0.05
}: DreamyParticlesProps) {
  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="w-full h-full pointer-events-auto">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ 
            antialias: true, 
            alpha: true,
            preserveDrawingBuffer: true,
            precision: 'highp',
            powerPreference: 'high-performance'
          }}
          dpr={[1, 2]} // Responsive rendering based on device pixel ratio
        >
          <color attach="background" args={['#000000']} />
          <ParticlesScene 
            modelPath={modelPath}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            mouseStrength={mouseStrength}
          />
        </Canvas>
      </div>
    </div>
  );
}

// Scene component that handles model loading and particle system
function ParticlesScene({ 
  modelPath, 
  primaryColor,
  secondaryColor,
  mouseStrength 
}: DreamyParticlesProps) {
  const { scene } = useThree();
  const [meshGeometry, setMeshGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Load model
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Clean up previous model objects
    scene.children.forEach((child) => {
      if (child.userData && child.userData.isModelObject) {
        scene.remove(child);
      }
    });
    
    // Handle sphere case
    if (modelPath === 'sphere') {
      console.log('Creating default sphere');
      // Higher detail sphere for better sampling
      const geometry = new THREE.SphereGeometry(1, 64, 64);
      setMeshGeometry(geometry);
      setLoading(false);
      return;
    }
    
    // GLTF model loading
    console.log(`Loading model: ${modelPath}`);
    
    // Initialize loaders
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    
    // Load the model with a timeout to prevent endless loading
    const loadTimeout = setTimeout(() => {
      setError('Model loading timed out. Please try another model.');
      setLoading(false);
    }, 15000);
    
    // Ensure modelPath is a string (defensive check)
    const modelUrl = typeof modelPath === 'string' ? modelPath : 'sphere';
    
    loader.load(
      modelUrl,
      (gltf) => {
        clearTimeout(loadTimeout);
        console.log('Model loaded successfully');
        
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        
        gltf.scene.position.copy(center.multiplyScalar(-scale));
        gltf.scene.scale.set(scale, scale, scale);
        
        // Find first mesh with geometry - more robust finder from the original
        const meshes: THREE.Mesh[] = [];
        
        // Recursive function to find all meshes
        const findMeshes = (object: THREE.Object3D) => {
          if (object instanceof THREE.Mesh && object.geometry) {
            meshes.push(object);
          }
          
          for (const child of object.children) {
            findMeshes(child);
          }
        };
        
        findMeshes(gltf.scene);
        
        // List found meshes
        console.log(`Found ${meshes.length} meshes in model`);
        meshes.forEach((mesh, i) => console.log(`- Mesh ${i}: ${mesh.name}`));
        
        // Using the first mesh found
        if (meshes.length > 0) {
          const targetMesh = meshes[0];
          console.log(`Using mesh: ${targetMesh.name}`);
          
          // Clone the geometry - exact technique from original
          const geometry = targetMesh.geometry.clone();
          setMeshGeometry(geometry);
        } else {
          console.warn('No meshes found, using fallback sphere');
          const geometry = new THREE.SphereGeometry(1, 64, 64);
          setMeshGeometry(geometry);
        }
        
        setLoading(false);
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          setLoadingProgress(percent);
        }
      },
      (error) => {
        clearTimeout(loadTimeout);
        console.error('Error loading model:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Failed to load model: ${errorMessage}`);
        setLoading(false);
      }
    );
    
    // Cleanup function
    return () => {
      clearTimeout(loadTimeout);
      dracoLoader.dispose();
    };
  }, [modelPath, scene]);
  
  // Create a unique key for the ParticleSystem to force re-creation when model changes
  const particleKey = useMemo(() => {
    return meshGeometry ? `particles-${modelPath}-${Date.now()}` : null;
  }, [meshGeometry, modelPath]);
  
  if (loading) {
    return (
      <>
        <ambientLight intensity={0.2} />
        <Html center>
          <div style={{ 
            color: 'white', 
            background: 'rgba(0,0,0,0.7)', 
            padding: '12px', 
            borderRadius: '8px',
            fontFamily: 'monospace'
          }}>
            Loading model... {loadingProgress > 0 ? `${loadingProgress}%` : ''}
          </div>
        </Html>
      </>
    );
  }
  
  if (error) {
    return (
      <>
        <ambientLight intensity={0.2} />
        <Html center>
          <div style={{ 
            color: 'red', 
            background: 'rgba(0,0,0,0.7)', 
            padding: '12px', 
            borderRadius: '8px',
            fontFamily: 'monospace'
          }}>
            {error}
          </div>
        </Html>
      </>
    );
  }
  
  if (!meshGeometry) {
    return null;
  }
  
  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} />
      
      {/* Particle system with the model's geometry */}
      <ParticleSystem 
        key={particleKey}
        geometry={meshGeometry}
        primaryColor={primaryColor || [1.0, 0.8, 0.3]}
        secondaryColor={secondaryColor || [1.0, 0.4, 0.0]}
        mouseStrength={mouseStrength || 0.05}
      />
      
      {/* Camera controls */}
      <OrbitControls 
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        maxDistance={10}
        minDistance={2}
      />
      
      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          intensity={0.5}
          mipmapBlur={true}
          levels={3}
        />
      </EffectComposer>
    </>
  );
}

// Particle system using GPGPU for simulation
function ParticleSystem({ 
  geometry, 
  primaryColor, 
  secondaryColor,
  mouseStrength 
}: { 
  geometry: THREE.BufferGeometry; 
  primaryColor: [number, number, number]; 
  secondaryColor: [number, number, number];
  mouseStrength: number;
}) {
  const { gl } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  
  // Mouse tracking
  const mousePosition = useRef(new THREE.Vector3(0, 0, 0));
  const mouseVelocity = useRef(0);
  const lastMousePosition = useRef(new THREE.Vector3(0, 0, 0));
  
  // Initialize GPGPU system
  useEffect(() => {
    if (!gl || !geometry) return;
    
    console.log('Initializing particle system');
    
    // Create a mesh for sampling
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    
    // Create surface sampler
    const sampler = new MeshSurfaceSampler(mesh).build();
    
    // Initialize data arrays
    const positions = new Float32Array(WIDTH * WIDTH * 3);
    const uvs = new Float32Array(WIDTH * WIDTH * 2);
    const positionData = new Float32Array(WIDTH * WIDTH * 4);
    
    // Sample positions from mesh surface
    const tempPosition = new THREE.Vector3();
    const tempNormal = new THREE.Vector3();
    
    for (let i = 0; i < WIDTH; i++) {
      for (let j = 0; j < WIDTH; j++) {
        const index = i * WIDTH + j;
        const idx3 = index * 3;
        const idx4 = index * 4;
        const idx2 = index * 2;
        
        // Sample position from mesh surface - exact method from original
        sampler.sample(tempPosition, tempNormal);
        
        // No jitter - the original doesn't use it, for clean edges
        
        // Store positions
        positions[idx3] = tempPosition.x;
        positions[idx3 + 1] = tempPosition.y;
        positions[idx3 + 2] = tempPosition.z;
        
        // Store position data for texture - exact values from original
        positionData[idx4] = tempPosition.x;
        positionData[idx4 + 1] = tempPosition.y;
        positionData[idx4 + 2] = tempPosition.z;
        positionData[idx4 + 3] = 1.0;
        
        // Store UVs for texture lookup - exact indexing from original
        uvs[idx2] = j / WIDTH;
        uvs[idx2 + 1] = i / WIDTH;
      }
    }
    
    // Create position texture
    const positionTexture = new THREE.DataTexture(
      positionData,
      WIDTH,
      WIDTH,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    positionTexture.needsUpdate = true;
    
    // Clone for original position reference
    const originalPositionTexture = positionTexture.clone();
    
    // Initialize velocity texture
    const velocityData = new Float32Array(WIDTH * WIDTH * 4).fill(0);
    const velocityTexture = new THREE.DataTexture(
      velocityData,
      WIDTH,
      WIDTH,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    velocityTexture.needsUpdate = true;
    
    // Create GPU compute renderer
    const gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, gl);
    
    // Position update shader (matches reference implementation)
    const positionShader = `
      uniform sampler2D uOriginalPosition;
      uniform vec3 uMouse;
      uniform float uMouseSpeed;
      uniform float uTime;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        
        vec3 position = texture2D(uCurrentPosition, uv).xyz;
        vec3 velocity = texture2D(uCurrentVelocity, uv).xyz;
        
        // Update position based on velocity
        position += velocity;
        
        gl_FragColor = vec4(position, 1.0);
      }
    `;
    
    // Velocity update shader with improved physics
    const velocityShader = `
      uniform sampler2D uOriginalPosition;
      uniform vec3 uMouse;
      uniform float uMouseSpeed;
      uniform float uTime;
      uniform float uForce;
      
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        
        vec3 position = texture2D(uCurrentPosition, uv).xyz;
        vec3 original = texture2D(uOriginalPosition, uv).xyz;
        vec3 velocity = texture2D(uCurrentVelocity, uv).xyz;
        
        // Apply friction (slightly higher than original for better stability)
        velocity *= 0.93;
        
        // Particle attraction to original position
        vec3 direction = normalize(original - position);
        float dist = length(original - position);
        
        if(dist > 0.001) {
          // Distance-based attraction strength for more stable formation
          float attractionStrength = dist * 0.015;
          velocity += direction * attractionStrength;
        }
        
        // Mouse repulsion with better falloff
        float mouseDistance = distance(position, uMouse);
        float maxDistance = 0.15;  // Slightly larger than original for better interaction
        
        if(mouseDistance < maxDistance) {
          vec3 pushDirection = normalize(position - uMouse);
          // Smooth quadratic falloff for more natural effect
          float influence = pow(1.0 - mouseDistance / maxDistance, 2.0);
          velocity += pushDirection * influence * 0.01 * uMouseSpeed;
        }
        
        // Add subtle ambient motion for more lively particles
        float noiseTime = uTime * 0.1;
        float noise = sin(position.x * 5.0 + noiseTime) * sin(position.y * 5.0 + noiseTime) * 0.0001;
        velocity.x += noise;
        velocity.y += noise;
        
        gl_FragColor = vec4(velocity, 1.0);
      }
    `;
    
    // Add variables to computation
    const positionVariable = gpuCompute.addVariable(
      'uCurrentPosition',
      positionShader,
      positionTexture
    );
    
    const velocityVariable = gpuCompute.addVariable(
      'uCurrentVelocity',
      velocityShader,
      velocityTexture
    );
    
    // Set variable dependencies
    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);
    
    // Add custom uniforms
    positionVariable.material.uniforms.uOriginalPosition = { value: originalPositionTexture };
    positionVariable.material.uniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
    positionVariable.material.uniforms.uMouseSpeed = { value: 0 };
    positionVariable.material.uniforms.uTime = { value: 0 };
    
    velocityVariable.material.uniforms.uOriginalPosition = { value: originalPositionTexture };
    velocityVariable.material.uniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
    velocityVariable.material.uniforms.uMouseSpeed = { value: 0 };
    velocityVariable.material.uniforms.uTime = { value: 0 };
    
    // Force parameter matched to reference for optimal behavior
    const force = 0.92; // Exact value from original repo
    velocityVariable.material.uniforms.uForce = { value: force };
    
    // Initialize computation
    const error = gpuCompute.init();
    if (error) {
      console.error('GPGPU initialization error:', error);
      return;
    }
    
    // Create particle material with high-quality rendering shaders from reference
    const particleMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        uniform float uParticleSize;
        uniform sampler2D uPositionTexture;
        
        void main() {
          vUv = uv;
          
          // Get position from texture
          vec4 positionData = texture2D(uPositionTexture, vUv);
          
          // Update vertex position
          vec3 newpos = positionData.xyz;
          vPosition = newpos;
          
          vec4 mvPosition = modelViewMatrix * vec4(newpos, 1.0);
          
          // Scale down the particle size - original implementation uses a smaller scale
          gl_PointSize = uParticleSize * (10.0 / -mvPosition.z);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        
        uniform sampler2D uVelocityTexture;
        uniform vec3 uColor;
        uniform float uMinAlpha;
        uniform float uMaxAlpha;
        
        void main() {
          // Create circular particle with soft edges
          float center = length(gl_PointCoord - 0.5);
          
          // Discard pixels outside circle with soft edge
          if (center > 0.5) { 
            discard; 
          }
          
          // Calculate soft edge falloff
          float falloff = smoothstep(0.5, 0.35, center);
          
          // Get velocity data for dynamic alpha
          vec3 velocity = texture2D(uVelocityTexture, vUv).xyz * 40.0;
          float velocityMagnitude = length(velocity);
          
          // Calculate alpha based on velocity magnitude
          float alpha = clamp(velocityMagnitude, uMinAlpha, uMaxAlpha) * falloff;
          
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      uniforms: {
        uPositionTexture: { value: null },
        uVelocityTexture: { value: null },
        uColor: { value: new THREE.Color(primaryColor[0], primaryColor[1], primaryColor[2]) },
        uParticleSize: { value: 2.0 },
        uMinAlpha: { value: 0.05 },
        uMaxAlpha: { value: 0.5 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Create particle geometry
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    
    // Set geometry and material
    if (pointsRef.current) {
      pointsRef.current.geometry = particleGeometry;
      pointsRef.current.material = particleMaterial;
      
      // Store computation objects for animation updates
      pointsRef.current.userData = {
        gpuCompute,
        positionVariable,
        velocityVariable,
        originalPositionTexture,
      };
    }
    
    // Cleanup
    return () => {
      if (pointsRef.current) {
        if (particleGeometry) particleGeometry.dispose();
        if (particleMaterial) {
          if (particleMaterial.uniforms.uPositionTexture.value) 
            particleMaterial.uniforms.uPositionTexture.value.dispose();
          if (particleMaterial.uniforms.uVelocityTexture.value) 
            particleMaterial.uniforms.uVelocityTexture.value.dispose();
          particleMaterial.dispose();
        }
        
        // Dispose GPU compute resources
        gpuCompute.dispose();
        originalPositionTexture.dispose();
      }
    };
  }, [gl, geometry, primaryColor, secondaryColor, mouseStrength]);
  
  // Animation update with improved mouse behavior
  useFrame(({ mouse, clock, camera }) => {
    if (!pointsRef.current || !pointsRef.current.userData || !pointsRef.current.userData.gpuCompute) return;
    
    const { 
      gpuCompute, 
      positionVariable, 
      velocityVariable 
    } = pointsRef.current.userData;
    
    const material = pointsRef.current.material as THREE.ShaderMaterial;
    
    // Update time uniform for subtle animation
    const time = clock.getElapsedTime();
    velocityVariable.material.uniforms.uTime.value = time;
    
    // Calculate mouse position in world space
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const currentMousePos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    // Calculate real mouse velocity based on actual movement
    const delta = currentMousePos.clone().sub(lastMousePosition.current);
    const movementDistance = delta.length();
    const hasMovedSignificantly = movementDistance > 0.001;
    
    // Smooth mouse velocity transitions
    if (hasMovedSignificantly) {
      // Scale mouse velocity based on actual movement speed
      mouseVelocity.current = THREE.MathUtils.lerp(
        mouseVelocity.current,
        Math.min(movementDistance * 10, 1.0), 
        0.3
      );
    } else {
      // Decay velocity faster when not moving
      mouseVelocity.current *= 0.9;
    }
    
    // Update mouse position uniforms
    velocityVariable.material.uniforms.uMouse.value.copy(currentMousePos);
    velocityVariable.material.uniforms.uMouseSpeed.value = mouseVelocity.current * mouseStrength * 3;
    
    // Store last position for next frame
    lastMousePosition.current.copy(currentMousePos);
    
    // Compute new particle state
    gpuCompute.compute();
    
    // Update material uniforms
    material.uniforms.uPositionTexture.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
    material.uniforms.uVelocityTexture.value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <shaderMaterial 
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </points>
  );
} 