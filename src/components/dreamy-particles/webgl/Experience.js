// Three.js

import * as THREE from 'three';
import Camera from './Camera.js';
import Renderer from './Renderer.js';


// Utils

import Debug from './utils/Debug.js';
import Sizes from './utils/Sizes.js';
import Mouse from './utils/Mouse.js';
import Time from './utils/Time.js';
import Resources from './utils/Resources.js';
import { debounce } from './helpers'




export default class Experience {

  static instance;

  constructor(canvas, world) {
    if (Experience.instance) {
      return Experience.instance;
    }

    Experience.instance = this;

    this.canvas = canvas;
    this.worldClass = world;


    this.init();
  }


  init() {
    this.debug = Debug.getInstance(); // <-- Debug class
    this.sizes = Sizes.getInstance(); // <-- Sizes class
    this.time = Time.getInstance(); // <-- Time class
    this.mouse = Mouse.getInstance(); // <-- Mouse class
    this.scene = new THREE.Scene(); // <-- Global scene
    this.camera = Camera.getInstance(); // <-- Camera class
    this.renderer = Renderer.getInstance(); // <-- Renderer class
    this.resources = Resources.getInstance(); // <-- Resources class



    this.loadResources(); // <-- Load assets
    this.setupEvents(); // <-- Setup events
  }


  loadResources() {
    this.resources.on('ready', () => {
      this.world = this.worldClass.getInstance(); // <-- World class
      this.renderer.onWorldLoaded();
    })
  }


  setupEvents() { // <-- Setup update and resize events
    this.sizes.on('resize', () => { debounce(this.resize(), 500); });

    this.time.on('update', (time, delta) => { this.update({ time, delta }); });
  }


  resize() {
    if (this.camera.target) this.camera.resize();
    if (this.renderer.webglRenderer) this.renderer.resize();
    if (this.world) this.world.resize();
  }


  update(state) {
    if (this.debug.active) this.debug.stats.update();
    if (this.camera.target) this.camera.update();
    if (this.renderer.webglRenderer) this.renderer.update(state);
    if (this.world) this.world.update(state);
  }
}
