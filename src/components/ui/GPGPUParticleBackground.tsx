"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { OrbitControls } from "@react-three/drei";

// Import dynamic to allow client-only loading of heavy/browser-specific modules
import dynamic from 'next/dynamic';

// Define the size of our simulation
const WIDTH = 128; // texture width (128x128 = 16,384 particles)
const PARTICLES = WIDTH * WIDTH;

// Dynamically import browser-specific modules
const initializeGPUComputation = async () => {
  const { GPUComputationRenderer } = await import('three/examples/jsm/misc/GPUComputationRenderer.js');
  return GPUComputationRenderer;
};

const initializeMeshSurfaceSampler = async () => {
  const { MeshSurfaceSampler } = await import('three/examples/jsm/math/MeshSurfaceSampler.js');
  return MeshSurfaceSampler;
};

// Create a default sphere mesh for sampling when no model is provided
function createDefaultMesh() {
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial();
  return new THREE.Mesh(geometry, material);
}

// Type for the mouse handler
interface MouseHandler {
  on: (event: string, handler: (position: THREE.Vector2) => void) => void;
  cursorPosition: THREE.Vector2;
}

// GPGPUUtils class based on the tutorial
class GPGPUUtils {
  size: number;
  number: number;
  mesh: THREE.Mesh;
  sampler: MeshSurfaceSampler;
  _position: THREE.Vector3;
  positions: Float32Array;
  positionTexture: THREE.DataTexture;
  uvs: Float32Array;
  velocityTexture: THREE.DataTexture;

  constructor(mesh: THREE.Mesh, size: number) {
    this.size = size;
    this.number = this.size * this.size;
    this.mesh = mesh;
    this.sampler = new MeshSurfaceSampler(this.mesh).build();
    this._position = new THREE.Vector3();

    // Initialize arrays (will be set in the setup methods)
    this.positions = new Float32Array(3 * this.number);
    this.uvs = new Float32Array(2 * this.number);
    this.positionTexture = new THREE.DataTexture(
      new Float32Array(4 * this.number),
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    this.velocityTexture = new THREE.DataTexture(
      new Float32Array(4 * this.number),
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType,
    );

    this.setupDataFromMesh();
    this.setupVelocitiesData();
  }

  setupDataFromMesh() {
    const data = new Float32Array(4 * this.number);
    const positions = new Float32Array(3 * this.number);
    const uvs = new Float32Array(2 * this.number);

    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;

        // Pick random point from Mesh
        this.sampler.sample(this._position);

        // Setup for DataTexture
        data[4 * index] = this._position.x;
        data[4 * index + 1] = this._position.y;
        data[4 * index + 2] = this._position.z;
        data[4 * index + 3] = 1.0; // w component

        // Setup positions attribute for geometry
        positions[3 * index] = this._position.x;
        positions[3 * index + 1] = this._position.y;
        positions[3 * index + 2] = this._position.z;

        // Setup UV attribute for geometry
        uvs[2 * index] = j / (this.size - 1);
        uvs[2 * index + 1] = i / (this.size - 1);
      }
    }

    const positionTexture = new THREE.DataTexture(
      data,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    positionTexture.needsUpdate = true;

    this.positions = positions;
    this.positionTexture = positionTexture;
    this.uvs = uvs;
  }

  setupVelocitiesData() {
    const data = new Float32Array(4 * this.number);
    data.fill(0);

    const velocityTexture = new THREE.DataTexture(
      data,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    velocityTexture.needsUpdate = true;

    this.velocityTexture = velocityTexture;
  }

  getPositions() {
    return this.positions;
  }

  getUVs() {
    return this.uvs;
  }

  getPositionTexture() {
    return this.positionTexture;
  }

  getVelocityTexture() {
    return this.velocityTexture;
  }
}

// Position shader based on the tutorial
const simFragmentPosition = `
  uniform sampler2D uOriginalPosition;
  uniform vec3 uMouse;
  uniform float uMouseSpeed;

  void main() {
    vec2 vUv = gl_FragCoord.xy / resolution.xy;
    
    vec3 position = texture2D(uCurrentPosition, vUv).xyz;
    vec3 original = texture2D(uOriginalPosition, vUv).xyz;
    vec3 velocity = texture2D(uCurrentVelocity, vUv).xyz;
    
    // Update position based on velocity
    position += velocity;
    
    // Particle attraction to original position
    vec3 direction = normalize(original - position);
    float dist = length(original - position);
    
    if(dist > 0.001) {
      velocity += direction * 0.0003;
    }
    
    // Mouse repel force
    float mouseDistance = distance(position, uMouse);
    float maxDistance = 0.1;
    
    if(mouseDistance < maxDistance) {
      vec3 pushDirection = normalize(position - uMouse);
      velocity += pushDirection * (1.0 - mouseDistance / maxDistance) * 0.0023 * uMouseSpeed;
    }
    
    gl_FragColor = vec4(position, 1.0);
  }
`;

// Velocity shader based on the tutorial
const simFragmentVelocity = `
  uniform sampler2D uOriginalPosition;
  uniform vec3 uMouse;
  uniform float uMouseSpeed;

  void main() {
    vec2 vUv = gl_FragCoord.xy / resolution.xy;
    
    vec3 position = texture2D(uCurrentPosition, vUv).xyz;
    vec3 original = texture2D(uOriginalPosition, vUv).xyz;
    vec3 velocity = texture2D(uCurrentVelocity, vUv).xyz;
    
    // Apply velocity dampening (friction)
    velocity *= 0.7;
    
    // Particle attraction to shape force
    vec3 direction = normalize(original - position);
    float dist = length(original - position);
    
    if(dist > 0.001) {
      velocity += direction * 0.0003;
    }
    
    // Mouse repel force
    float mouseDistance = distance(position, uMouse);
    float maxDistance = 0.1;
    
    if(mouseDistance < maxDistance) {
      vec3 pushDirection = normalize(position - uMouse);
      velocity += pushDirection * (1.0 - mouseDistance / maxDistance) * 0.0023 * uMouseSpeed;
    }
    
    gl_FragColor = vec4(velocity, 1.0);
  }
`;

// Vertex shader for rendering particles
const vertexShader = `
  uniform sampler2D uVelocityTexture;
  
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
    
    // Calculate point size based on velocity
    vec3 velocity = texture2D(uVelocityTexture, uv).xyz * 100.0;
    float velLength = length(velocity);
    
    gl_PointSize = mix(3.0, 6.0, min(velLength, 1.0));
  }
`;

// Fragment shader for rendering particles
const fragmentShader = `
  varying vec2 vUv;
  
  uniform sampler2D uVelocityTexture;
  uniform vec3 uColor;
  
  void main() {
    // Create circular point
    float center = length(gl_PointCoord - 0.5);
    
    // Get velocity for brightness calculation
    vec3 velocity = texture2D(uVelocityTexture, vUv).xyz * 100.0;
    
    // Calculate glow intensity based on velocity
    float velocityAlpha = clamp(length(velocity), 0.04, 0.8);
    
    // Discard pixels outside circle
    if (center > 0.5) { discard; }
    
    // Gold/amber color
    vec3 color = uColor;
    
    gl_FragColor = vec4(color, velocityAlpha);
  }
`;

// Define type for shader material with uniforms
interface ShaderMaterialWithUniforms extends THREE.ShaderMaterial {
  uniforms: {
    [key: string]: THREE.IUniform;
  };
}

// Handle events for mouse interaction
class GPGPUEvents {
  camera: THREE.Camera;
  mouse: MouseHandler;
  uniforms: any;
  currentMousePosition: THREE.Vector3;
  previousMousePosition: THREE.Vector3;
  mouseSpeed: number;
  raycaster: THREE.Raycaster;
  raycasterMesh: THREE.Mesh;

  constructor(
    mouse: MouseHandler,
    camera: THREE.Camera,
    mesh: THREE.Mesh,
    uniforms: any,
  ) {
    this.camera = camera;
    this.mouse = mouse;
    this.uniforms = uniforms;
    this.currentMousePosition = new THREE.Vector3();
    this.previousMousePosition = new THREE.Vector3();
    this.mouseSpeed = 0;

    this.raycaster = new THREE.Raycaster();

    // Create a mesh for raycasting that matches the source mesh
    this.raycasterMesh = mesh.clone();

    this.mouse.on("mousemove", (cursorPosition) => {
      this.raycaster.setFromCamera(cursorPosition, this.camera);

      const intersects = this.raycaster.intersectObject(this.raycasterMesh);

      if (intersects.length > 0) {
        const worldPoint = intersects[0].point.clone();
        this.mouseSpeed = 1;

        if (this.uniforms.velocityUniforms.uMouse) {
          this.uniforms.velocityUniforms.uMouse.value = worldPoint;
        }

        if (this.uniforms.positionUniforms.uMouse) {
          this.uniforms.positionUniforms.uMouse.value = worldPoint;
        }
      }
    });
  }

  update() {
    this.mouseSpeed *= 0.85;

    if (this.uniforms.velocityUniforms.uMouseSpeed) {
      this.uniforms.velocityUniforms.uMouseSpeed.value = this.mouseSpeed;
    }

    if (this.uniforms.positionUniforms.uMouseSpeed) {
      this.uniforms.positionUniforms.uMouseSpeed.value = this.mouseSpeed;
    }
  }
}

// Type for the particle configuration
interface ParticleConfig {
  mouseForce?: number;
  mouseRadius?: number;
  pointSize?: number;
  color?: [number, number, number];
  color1?: [number, number, number];
}

// Main GPGPU class that handles the particle system
function GPGPU({
  config,
  mousePos,
}: {
  config: ParticleConfig;
  mousePos: { x: number; y: number };
}) {
  const { gl, camera } = useThree();
  const [simulationInitialized, setSimulationInitialized] = useState(false);
  const pointsRef =
    useRef<THREE.Points<THREE.BufferGeometry, ShaderMaterialWithUniforms>>(
      null,
    );

  const meshRef = useRef<THREE.Mesh>(null);

  const {
    mouseForce = 0.5,
    mouseRadius = 1.5,
    pointSize = 2.0,
    color = [0.808, 0.647, 0.239], // Gold color as in tutorial
  } = config || {};

  // Initialize GPGPU simulation
  useEffect(() => {
    if (!gl || !meshRef.current || simulationInitialized || !pointsRef.current)
      return;

    // Create utils with mesh sampling
    const gpgpuUtils = new GPGPUUtils(meshRef.current, WIDTH);

    // Create textures
    const positionTexture = gpgpuUtils.getPositionTexture();
    const originalPositionTexture = positionTexture.clone();
    const velocityTexture = gpgpuUtils.getVelocityTexture();

    // Setup GPGPU computation
    const gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, gl);

    // Create variables
    const positionVariable = gpuCompute.addVariable(
      "uCurrentPosition",
      simFragmentPosition,
      positionTexture,
    );
    const velocityVariable = gpuCompute.addVariable(
      "uCurrentVelocity",
      simFragmentVelocity,
      velocityTexture,
    );

    // Set variable dependencies
    gpuCompute.setVariableDependencies(positionVariable, [
      positionVariable,
      velocityVariable,
    ]);
    gpuCompute.setVariableDependencies(velocityVariable, [
      positionVariable,
      velocityVariable,
    ]);

    // Add custom uniforms
    positionVariable.material.uniforms.uOriginalPosition = {
      value: originalPositionTexture,
    };
    positionVariable.material.uniforms.uMouse = {
      value: new THREE.Vector3(0, 0, 0),
    };
    positionVariable.material.uniforms.uMouseSpeed = { value: 0.0 };

    velocityVariable.material.uniforms.uOriginalPosition = {
      value: originalPositionTexture,
    };
    velocityVariable.material.uniforms.uMouse = {
      value: new THREE.Vector3(0, 0, 0),
    };
    velocityVariable.material.uniforms.uMouseSpeed = { value: 0.0 };

    // Initialize computation
    const error = gpuCompute.init();
    if (error !== null) {
      console.error(error);
    }

    // Create uniforms object for reference
    const uniforms = {
      positionUniforms: positionVariable.material.uniforms,
      velocityUniforms: velocityVariable.material.uniforms,
    };

    // Create events handler with a mock mouse handler for initialization
    const mockMouseHandler: MouseHandler = {
      on: (event, handler) => {},
      cursorPosition: new THREE.Vector2(0, 0),
    };

    const events = new GPGPUEvents(
      mockMouseHandler,
      camera,
      meshRef.current,
      uniforms,
    );

    // Set initial uvs and positions from gpgpuUtils
    const geometry = pointsRef.current.geometry;
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(gpgpuUtils.getPositions(), 3),
    );
    geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(gpgpuUtils.getUVs(), 2),
    );

    // Update material uniforms
    pointsRef.current.material.uniforms.uVelocityTexture = { value: null };

    // Store references in ref
    pointsRef.current.userData = {
      gpuCompute,
      positionVariable,
      velocityVariable,
      events,
    };

    setSimulationInitialized(true);
  }, [gl, simulationInitialized, camera]);

  // Animation loop
  useFrame(() => {
    if (
      !pointsRef.current ||
      !pointsRef.current.userData ||
      !pointsRef.current.userData.gpuCompute
    )
      return;

    const { gpuCompute, positionVariable, velocityVariable, events } =
      pointsRef.current.userData;

    // Update mouse position
    if (positionVariable.material.uniforms.uMouse && mousePos) {
      positionVariable.material.uniforms.uMouse.value.set(
        mousePos.x * 2,
        mousePos.y * 2,
        0,
      );
      velocityVariable.material.uniforms.uMouse.value.set(
        mousePos.x * 2,
        mousePos.y * 2,
        0,
      );
    }

    // Compute new positions and velocities
    gpuCompute.compute();

    // Update events
    events.update();

    // Get computed textures
    const velocityTexture =
      gpuCompute.getCurrentRenderTarget(velocityVariable).texture;

    // Update material with new velocity texture for coloring
    pointsRef.current.material.uniforms.uVelocityTexture.value =
      velocityTexture;
  });

  return (
    <group>
      {/* Hidden source mesh for sampling - just a simple sphere */}
      <mesh ref={meshRef} visible={false}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial />
      </mesh>

      {/* Particles */}
      <points ref={pointsRef}>
        <bufferGeometry />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          uniforms={{
            uVelocityTexture: { value: null },
            uColor: { value: new THREE.Color(color[0], color[1], color[2]) },
          }}
        />
      </points>
    </group>
  );
}

// Scene setup with post-processing
function ParticleScene({
  mousePos,
  config,
}: {
  mousePos: { x: number; y: number };
  config: ParticleConfig;
}) {
  return (
    <>
      <color attach="background" args={["#060B10"]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enableZoom={true}
        maxDistance={10}
        minDistance={2}
      />

      <GPGPU mousePos={mousePos} config={config} />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
        />
      </EffectComposer>
    </>
  );
}

// Mouse event handler for Canvas
class MouseEvents {
  callback: (position: { x: number; y: number }) => void;
  cursorPosition: { x: number; y: number };
  mousemove?: (position: { x: number; y: number }) => void;

  constructor(callback?: (position: { x: number; y: number }) => void) {
    this.callback = callback || (() => {});
    this.cursorPosition = { x: 0, y: 0 };
  }

  on(event: string, handler: (position: { x: number; y: number }) => void) {
    if (event === "mousemove") {
      this.mousemove = handler;
    }
  }

  update(cursorPosition: { x: number; y: number }) {
    this.cursorPosition = cursorPosition;
    if (this.mousemove) {
      this.mousemove(this.cursorPosition);
    }
    if (this.callback) {
      this.callback(this.cursorPosition);
    }
  }
}

// Main component with mouse tracking
export default function GPGPUParticleBackground({
  config = {},
}: {
  config?: ParticleConfig;
}) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseEventsRef = useRef<MouseEvents>(new MouseEvents());

  // Configuration with defaults
  const finalConfig: ParticleConfig = {
    mouseForce: config.mouseForce || 0.5,
    mouseRadius: config.mouseRadius || 0.1,
    pointSize: config.pointSize || 2.0,
    color: config.color1 || [0.808, 0.647, 0.239], // Gold color as in tutorial
  };

  // Mouse tracking effect
  useEffect(() => {
    if (!containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // Calculate normalized position (-1 to 1)
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      setMousePos({ x, y });
      mouseEventsRef.current.update({ x, y });
    };

    const container = containerRef.current;
    container.addEventListener("mousemove", handleMouseMove);

    // Mouse leave handler to fade out the effect
    const handleMouseLeave = () => {
      const fadeOut = setInterval(() => {
        setMousePos((prev) => ({
          x: prev.x * 0.95,
          y: prev.y * 0.95,
        }));

        if (Math.abs(mousePos.x) < 0.01 && Math.abs(mousePos.y) < 0.01) {
          clearInterval(fadeOut);
          setMousePos({ x: 0, y: 0 });
          mouseEventsRef.current.update({ x: 0, y: 0 });
        }
      }, 30);

      // Clear interval after max time
      setTimeout(() => clearInterval(fadeOut), 1000);
    };

    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mousePos]);

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <div className="w-full h-full pointer-events-auto">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true,
          }}
          linear
          flat
        >
          <ParticleScene mousePos={mousePos} config={finalConfig} />
        </Canvas>
      </div>
    </div>
  );
}

// Main component - will be lazy loaded
function GPGPUParticleBackgroundComponent({ 
  modelPath = null,
  color = [0.13, 0.45, 0.79], // Default blue
  mouseStrength = 0.15,
}) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  if (!isClient) {
    // Simple placeholder during SSR
    return (
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden bg-gradient-to-b from-transparent to-blue-900/10 dark:to-blue-900/5" />
    );
  }
  
  return (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="w-full h-full pointer-events-auto">
        <Canvas
          camera={{ position: [0, 0, 3], fov: 75 }}
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance',
          }}
        >
          <ParticleSystem 
            modelPath={modelPath}
            color={color}
            mouseStrength={mouseStrength}
          />
        </Canvas>
      </div>
    </div>
  );
}

// The actual components with the GPU computations - these will only run on client
function ParticleSystem({ modelPath, color, mouseStrength }) {
  // Component implementation...
  // (Your existing implementation)
  
  return (
    <>
      {/* Your existing rendering code */}
    </>
  );
}

// Export a client-only version of the component 
// This creates a dynamic import with SSR disabled
export default dynamic(() => Promise.resolve(GPGPUParticleBackgroundComponent), { 
  ssr: false,
});
