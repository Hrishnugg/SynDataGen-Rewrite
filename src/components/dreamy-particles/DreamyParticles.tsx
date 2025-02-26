'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

// Import our copied files
import GPGPUUtils from './webgl/gpgpu/GPGPUUtils.js';
import MouseEvents from './webgl/gpgpu/MouseEvents.js';

// Size of the GPGPU simulation
const SIZE = 128;

// Create the shader code as constants
const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

uniform float uParticleSize;
uniform sampler2D uPositionTexture;

void main() {
	vUv = uv;

	vec3 newpos = position;

	vec4 color = texture2D( uPositionTexture, vUv );


	newpos.xyz = color.xyz;

	vPosition = newpos;

	vec4 mvPosition = modelViewMatrix * vec4( newpos, 1.0 );

	gl_PointSize = ( uParticleSize / -mvPosition.z );

	gl_Position = projectionMatrix * mvPosition;
}`;

const fragmentShader = `
varying vec2 vUv;

uniform sampler2D uVelocityTexture;
uniform vec3 uColor;
uniform float uMinAlpha;
uniform float uMaxAlpha;

void main() {
	float center = length(gl_PointCoord - 0.5);

	vec3 velocity = texture2D( uVelocityTexture, vUv ).xyz * 100.0;

	float velocityAlpha = clamp(length(velocity.r), uMinAlpha, uMaxAlpha);

	if (center > 0.5) { discard; }

	gl_FragColor = vec4(uColor, velocityAlpha);
}`;

const simFragmentPosition = `
void main() {
	vec2 vUv = gl_FragCoord.xy / resolution.xy;

	vec3 position = texture2D( uCurrentPosition, vUv ).xyz;
	vec3 velocity = texture2D( uCurrentVelocity, vUv ).xyz;

	position += velocity;

	gl_FragColor = vec4( position, 1.);
}`;

const simFragmentVelocity = `
uniform sampler2D uOriginalPosition;
uniform vec3 uMouse;
uniform float uMouseSpeed;
uniform float uForce;
uniform float uMouseStrength;

void main() {
	vec2 vUv = gl_FragCoord.xy / resolution.xy;

	vec3 position = texture2D( uCurrentPosition, vUv ).xyz;
	vec3 original = texture2D( uOriginalPosition, vUv ).xyz;
	vec3 velocity = texture2D( uCurrentVelocity, vUv ).xyz;

	velocity *= uForce; // Velocity relaxation

	// Particle attraction to shape force
	vec3 direction = normalize( original - position );

	float dist = length( original - position );

	if( dist > 0.001 ) velocity += direction * ( dist * 0.02 );

	// Mouse repel force
	float mouseDistance = distance( position, uMouse );
	float maxDistance = 0.1;

	if( mouseDistance < maxDistance ) {
		vec3 pushDirection = normalize( position - uMouse );
		velocity += pushDirection * ( 1.0 - mouseDistance / maxDistance ) * 0.007 * uMouseSpeed;
	}

	gl_FragColor = vec4(velocity, 1.);
}`;

// Mouse utility class to match original implementation
class Mouse {
	constructor() {
		this.cursorPosition = new THREE.Vector2(0, 0);
		this.callbacks = {
			mousemove: []
		};
		
		this.setupEvents();
	}
	
	setupEvents() {
		window.addEventListener('mousemove', (e) => {
			// Calculate normalized device coordinates (-1 to +1)
			this.cursorPosition.x = (e.clientX / window.innerWidth) * 2 - 1;
			this.cursorPosition.y = -((e.clientY / window.innerHeight) * 2 - 1);
			
			// Call registered callbacks
			this.callbacks.mousemove.forEach(callback => {
				callback(this.cursorPosition);
			});
		});
	}
	
	on(event, callback) {
		if (this.callbacks[event]) {
			this.callbacks[event].push(callback);
		}
	}
}

export default function DreamyParticles({ 
	modelPath = 'sphere', 
	primaryColor = [1.0, 0.8, 0.3], 
	mouseStrength = 0.05 
}) {
	const containerRef = useRef(null);
	const rendererRef = useRef(null);
	const sceneRef = useRef(null);
	const cameraRef = useRef(null);
	const controlsRef = useRef(null);
	const composerRef = useRef(null);
	const mouseRef = useRef(null);
	const gpgpuRef = useRef(null);
	const frameIdRef = useRef(null);
	const startTimeRef = useRef(Date.now());
	
	const [isLoading, setIsLoading] = useState(true);
	const [loadingProgress, setLoadingProgress] = useState(0);
	const [error, setError] = useState(null);
	
	// Initialize Three.js scene
	useEffect(() => {
		if (!containerRef.current) return;
		
		// Initialize basic components
		const scene = new THREE.Scene();
		sceneRef.current = scene;
		
		const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
		camera.position.z = 5;
		cameraRef.current = camera;
		
		const renderer = new THREE.WebGLRenderer({ 
			antialias: true,
			alpha: true 
		});
		
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		containerRef.current.appendChild(renderer.domElement);
		rendererRef.current = renderer;
		
		// Set up mouse handling
		mouseRef.current = new Mouse();
		
		// Set up post-processing
		const renderScene = new RenderPass(scene, camera);
		
		const bloomPass = new UnrealBloomPass(
			new THREE.Vector2(window.innerWidth, window.innerHeight),
			1.0,  // strength - reduced for more subtle effect
			0.4,  // radius
			0.4   // threshold - reduced to catch more particles
		);
		
		const composer = new EffectComposer(renderer);
		composer.addPass(renderScene);
		composer.addPass(bloomPass);
		composerRef.current = composer;
		
		// Set up controls
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controlsRef.current = controls;
		
		// Handle window resize
		const handleResize = () => {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
			composer.setSize(window.innerWidth, window.innerHeight);
		};
		
		window.addEventListener('resize', handleResize);
		
		// Cleanup
		return () => {
			window.removeEventListener('resize', handleResize);
			
			// Clean up renderer
			if (containerRef.current && rendererRef.current?.domElement) {
				containerRef.current.removeChild(rendererRef.current.domElement);
			}
			
			// Cancel animation frame
			if (frameIdRef.current) {
				cancelAnimationFrame(frameIdRef.current);
			}
			
			// Clean up GPGPU resources
			if (gpgpuRef.current) {
				const { points, gpuCompute, positionVariable, velocityVariable } = gpgpuRef.current;
				
				// Remove points from scene
				if (points && sceneRef.current) {
					sceneRef.current.remove(points);
					
					// Dispose geometry and material
					if (points.geometry) points.geometry.dispose();
					if (points.material) {
						if (points.material.uniforms?.uPositionTexture?.value) {
							points.material.uniforms.uPositionTexture.value.dispose();
						}
						if (points.material.uniforms?.uVelocityTexture?.value) {
							points.material.uniforms.uVelocityTexture.value.dispose();
						}
						points.material.dispose();
					}
				}
				
				// Dispose of GPGPU resources
				if (gpuCompute) {
					if (positionVariable && velocityVariable) {
						// Dispose of render targets
						gpuCompute.getCurrentRenderTarget(positionVariable)?.dispose();
						gpuCompute.getCurrentRenderTarget(velocityVariable)?.dispose();
					}
					gpuCompute.dispose();
				}
			}
		};
	}, []);
	
	// Load model and initialize particles
	useEffect(() => {
		if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !mouseRef.current) return;
		
		// Clean up previous animation frame if exists
		if (frameIdRef.current) {
			cancelAnimationFrame(frameIdRef.current);
		}
		
		setIsLoading(true);
		setError(null);
		
		const scene = sceneRef.current;
		const renderer = rendererRef.current;
		const camera = cameraRef.current;
		const mouse = mouseRef.current;
		
		// Clean previous meshes
		scene.children.forEach(child => {
			if (child.type === 'Mesh' || child.type === 'Points') {
				scene.remove(child);
			}
		});
		
		// Add ambient light
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		scene.add(ambientLight);
		
		let mesh;
		
		const initParticles = (geometry) => {
			// Create mesh for sampling
			mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
			
			// Create GPGPU utility
			const gpgpuUtils = new GPGPUUtils(mesh, SIZE);
			
			// Setup GPGPU computation
			const gpuCompute = new GPUComputationRenderer(SIZE, SIZE, renderer);
			
			// Create textures
			const positionTexture = gpgpuUtils.getPositionTexture();
			const originalPositionTexture = positionTexture.clone();
			const velocityTexture = gpgpuUtils.getVelocityTexture();
			
			// Create variables
			const positionVariable = gpuCompute.addVariable('uCurrentPosition', simFragmentPosition, positionTexture);
			const velocityVariable = gpuCompute.addVariable('uCurrentVelocity', simFragmentVelocity, velocityTexture);
			
			// Set variable dependencies
			gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
			gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);
			
			// Add custom uniforms
			velocityVariable.material.uniforms.uOriginalPosition = { value: originalPositionTexture };
			velocityVariable.material.uniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
			velocityVariable.material.uniforms.uMouseSpeed = { value: 0 };
			velocityVariable.material.uniforms.uForce = { value: 0.92 };
			velocityVariable.material.uniforms.uMouseStrength = { value: mouseStrength };
			
			// Initialize computation
			const error = gpuCompute.init();
			if (error) {
				console.error('GPUComputationRenderer error:', error);
				setError('Failed to initialize particles simulation');
				setIsLoading(false);
				return;
			}
			
			// Create uniforms object for events handler
			const uniforms = {
				velocityUniforms: velocityVariable.material.uniforms
			};
			
			// Create events handler
			const events = new MouseEvents(mouse, camera, mesh, uniforms);
			
			// Create particle material with optimized settings
			const particleMaterial = new THREE.ShaderMaterial({
				vertexShader,
				fragmentShader,
				uniforms: {
					uPositionTexture: { value: null },
					uVelocityTexture: { value: null },
					uColor: { value: new THREE.Color(primaryColor[0], primaryColor[1], primaryColor[2]) },
					uParticleSize: { value: 2.5 },  // Slightly smaller for sharper definition
					uMinAlpha: { value: 0.05 },     // Slightly higher min alpha for better visibility
					uMaxAlpha: { value: 0.7 }       // Slightly lower max alpha for less oversaturation
				},
				transparent: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			});
			
			// Create particles
			const particleGeometry = new THREE.BufferGeometry();
			particleGeometry.setAttribute('position', new THREE.BufferAttribute(gpgpuUtils.getPositions(), 3));
			particleGeometry.setAttribute('uv', new THREE.BufferAttribute(gpgpuUtils.getUVs(), 2));
			
			const points = new THREE.Points(particleGeometry, particleMaterial);
			scene.add(points);
			
			// Store references for animation
			gpgpuRef.current = {
				points,
				gpuCompute,
				positionVariable,
				velocityVariable,
				events,
				uniforms
			};
			
			// Start animation
			const animate = () => {
				// Update controls
				if (controlsRef.current) {
					controlsRef.current.update();
				}
				
				// Update GPGPU computation
				gpuCompute.compute();
				
				// Update events (mouse speed)
				events.update();
				
				// Apply mouse strength to the mouse speed
				velocityVariable.material.uniforms.uMouseSpeed.value = events.mouseSpeed * mouseStrength;
				
				// Update uniforms
				particleMaterial.uniforms.uPositionTexture.value = 
					gpuCompute.getCurrentRenderTarget(positionVariable).texture;
				particleMaterial.uniforms.uVelocityTexture.value = 
					gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
				
				// Render with composer for post-processing
				composerRef.current.render();
				
				// Request next frame
				frameIdRef.current = requestAnimationFrame(animate);
			};
			
			animate();
			setIsLoading(false);
		};
		
		// Handle different model types
		if (modelPath === 'sphere') {
			// Create sphere geometry
			const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
			initParticles(sphereGeometry);
		} else {
			// Load GLTF model
			const dracoLoader = new DRACOLoader();
			dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
			
			const loader = new GLTFLoader();
			loader.setDRACOLoader(dracoLoader);
			
			loader.load(
				modelPath,
				(gltf) => {
					// Find first mesh with geometry
					let targetMesh = null;
					
					gltf.scene.traverse((object) => {
						if (object.isMesh && !targetMesh) {
							targetMesh = object;
						}
					});
					
					if (targetMesh) {
						// Center and scale the model
						const box = new THREE.Box3().setFromObject(gltf.scene);
						const center = box.getCenter(new THREE.Vector3());
						const size = box.getSize(new THREE.Vector3());
						
						const maxDim = Math.max(size.x, size.y, size.z);
						const scale = 2 / maxDim;
						
						targetMesh.geometry.scale(scale, scale, scale);
						targetMesh.geometry.translate(-center.x * scale, -center.y * scale, -center.z * scale);
						
						// Get geometry for particles
						const geometry = targetMesh.geometry.clone();
						initParticles(geometry);
					} else {
						console.error('No mesh found in the model');
						setError('No valid mesh found in the model');
						setIsLoading(false);
					}
				},
				(progress) => {
					if (progress.total > 0) {
						const percent = Math.round((progress.loaded / progress.total) * 100);
						setLoadingProgress(percent);
					}
				},
				(error) => {
					console.error('Error loading model:', error);
					setError(`Failed to load model: ${error.message}`);
					setIsLoading(false);
				}
			);
		}
		
		return () => {
			cancelAnimationFrame(frameIdRef.current);
		};
	}, [modelPath, primaryColor, mouseStrength]);
	
	// Clean up previous animation frame if exists
	if (frameIdRef.current) {
		cancelAnimationFrame(frameIdRef.current);
	}
	
	// Clean up previous GPGPU resources
	if (gpgpuRef.current) {
		const { points, gpuCompute } = gpgpuRef.current;
		
		// Remove points from scene
		if (points) {
			sceneRef.current.remove(points);
			if (points.geometry) points.geometry.dispose();
			if (points.material) {
				if (points.material.uniforms?.uPositionTexture?.value) {
					points.material.uniforms.uPositionTexture.value.dispose();
				}
				if (points.material.uniforms?.uVelocityTexture?.value) {
					points.material.uniforms.uVelocityTexture.value.dispose();
				}
				points.material.dispose();
			}
		}
		
		// Dispose of GPGPU resources
		if (gpuCompute) {
			gpuCompute.dispose();
		}
		
		gpgpuRef.current = null;
	}
	
	return (
		<div className="dreamy-particles-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
			<div ref={containerRef} style={{ width: '100%', height: '100%' }} />
			
			{isLoading && (
				<div style={{ 
					position: 'absolute', 
					top: '50%', 
					left: '50%', 
					transform: 'translate(-50%, -50%)',
					background: 'rgba(0, 0, 0, 0.7)',
					padding: '20px',
					borderRadius: '10px',
					color: 'white',
					fontFamily: 'monospace'
				}}>
					Loading {loadingProgress > 0 ? `${loadingProgress}%` : '...'}
				</div>
			)}
			
			{error && (
				<div style={{ 
					position: 'absolute', 
					top: '50%', 
					left: '50%', 
					transform: 'translate(-50%, -50%)',
					background: 'rgba(0, 0, 0, 0.7)',
					padding: '20px',
					borderRadius: '10px',
					color: 'red',
					fontFamily: 'monospace'
				}}>
					Error: {error}
				</div>
			)}
		</div>
	);
} 