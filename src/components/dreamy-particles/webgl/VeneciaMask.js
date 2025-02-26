import Experience from './Experience.js';
import Handler from './abstract/Handler.js';
import * as THREE from 'three';
import GPGPU from './gpgpu/GPGPU.js'


export default class VeneciaMask extends Handler {

  static instance;

  static getInstance() {
    if (!VeneciaMask.instance) {
      VeneciaMask.instance = new VeneciaMask();
    }

    return VeneciaMask.instance;
  }

  constructor() {
    super(VeneciaMask.id);


    this.scene = this.experience.scene;
    this.canvas = this.experience.canvas;
    this.renderer = this.experience.renderer;
    this.camera = this.experience.camera;
    this.mouse = this.experience.mouse;
    this.sizes = this.experience.sizes;
    this.resources = this.experience.resources;
    this.debug = this.experience.debug;

    this.params = {
      color: new THREE.Color('#F7D377'),
      size: 1.7,
      minAlpha: 0.04,
      maxAlpha: 0.8,
      force: 0.7,
    };


    this.init();
  }


  init() {
    this.setupVeneciaMask();
    this.setupGPGPU();
    this.setupDebug();
  }


  setupVeneciaMask() {
    const mask = this.resources.models.veneciaMask.scene.children[0];

    this.model = mask;
  }


  setupCameraPosition() {
    this.camera.orbitControls._rotateLeft(Math.PI);
  }


  setupGPGPU() {
    this.gpgpu = new GPGPU({
      size: 1200,
      camera: this.camera.target,
      renderer: this.renderer.webglRenderer,
      mouse: this.mouse,
      scene: this.scene,
      sizes: this.sizes,
      model: this.model,
      debug: this.debug,
      params: this.params
    })
  }


  setupDebug() {
    if (this.debug.active) {
      const particlesFolder = this.debug.gui.addFolder('particles');
      particlesFolder.addColor(this.gpgpu.material.uniforms.uColor, 'value').name('Color');
      particlesFolder.add(this.gpgpu.material.uniforms.uParticleSize, 'value').name('Size').min(1).max(10).step(0.1);
      particlesFolder.add(this.gpgpu.uniforms.velocityUniforms.uForce, 'value').name('Force').min(0).max(0.8).step(0.01);
      particlesFolder.add(this.gpgpu.material.uniforms.uMinAlpha, 'value').name('Min Alpha').min(0).max(1).step(0.01);
      particlesFolder.add(this.gpgpu.material.uniforms.uMaxAlpha, 'value').name('Max Alpha').min(0).max(1).step(0.01);
    }
  }


  update() {
    if (this.gpgpu) this.gpgpu.compute();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Experience(document.querySelector('canvas.experience__canvas'), VeneciaMask);
})