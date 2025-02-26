import * as THREE from 'three';
import GPGPUUtils from './GPGPUUtils.js';
import GPGPUEvents from './GPGPUEvents.js';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import simFragment from './shaders/simFragment.glsl';
import simFragmentVelocity from './shaders/simFragmentVelocity.glsl';
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';

export default class GPGPU {
    constructor({ size, camera, renderer, mouse, scene, model, sizes, debug, params }) {
        this.camera = camera; // Camera
        this.renderer = renderer; // Renderer
        this.mouse = mouse; // Mouse, our cursor position
        this.scene = scene; // Global scene
        this.sizes = sizes; // Sizes of the scene, canvas, pixel ratio
        this.size = size; // Amount of GPGPU particles
        this.model = model; // Mesh from which we will sample the particles
        this.debug = debug; // Debug
        this.params = params; // Parameters for the GPGPU

        this.init();
    }


    init() {
        this.utils = new GPGPUUtils(this.model, this.size); // Setup GPGPUUtils

        this.initGPGPU();

        this.events = new GPGPUEvents(this.mouse, this.camera, this.model, this.uniforms);

        this.createParticles();
    }

    initGPGPU() {
        this.gpgpuCompute = new GPUComputationRenderer(this.sizes.width, this.sizes.width, this.renderer);

        const positionTexture = this.utils.getPositionTexture();
        const velocityTexture = this.utils.getVelocityTexture();

        this.positionVariable = this.gpgpuCompute.addVariable('uCurrentPosition', simFragment, positionTexture);
        this.velocityVariable = this.gpgpuCompute.addVariable('uCurrentVelocity', simFragmentVelocity, velocityTexture);

        this.gpgpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable]);
        this.gpgpuCompute.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable]);

        this.uniforms = {
            positionUniforms: this.positionVariable.material.uniforms,
            velocityUniforms: this.velocityVariable.material.uniforms
        }


        this.uniforms.velocityUniforms.uMouse = { value: this.mouse.cursorPosition };
        this.uniforms.velocityUniforms.uMouseSpeed = { value: 0 };
        this.uniforms.velocityUniforms.uOriginalPosition = { value: positionTexture }
        this.uniforms.velocityUniforms.uTime = { value: 0 };
        this.uniforms.velocityUniforms.uForce = { value: this.params.force };

        this.gpgpuCompute.init();
    }

    createParticles() {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uPositionTexture: { value: this.gpgpuCompute.getCurrentRenderTarget(this.positionVariable).texture },
                uVelocityTexture: { value: this.gpgpuCompute.getCurrentRenderTarget(this.velocityVariable).texture },
                uResolution: { value: new THREE.Vector2(this.sizes.width, this.sizes.height) },
                uParticleSize: { value: this.params.size },
                uColor: { value: this.params.color },
                uMinAlpha: { value: this.params.minAlpha },
                uMaxAlpha: { value: this.params.maxAlpha },
            },
            vertexShader,
            fragmentShader,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            transparent: true
        })


        // Setup Particles Geometry

        const geometry = new THREE.BufferGeometry();


        // Get positions, uvs data for geometry attributes

        const positions = this.utils.getPositions();
        const uvs = this.utils.getUVs();


        // Set geometry attributes

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));


        // Setup Points

        this.mesh = new THREE.Points(geometry, this.material);
        this.scene.add(this.mesh);
    }


    compute() {
        this.gpgpuCompute.compute();
        this.events.update();
    }
}