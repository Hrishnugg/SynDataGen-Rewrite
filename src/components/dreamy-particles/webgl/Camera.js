import Handler from './abstract/Handler.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


export default class Camera extends Handler {

  static instance;

  constructor() {
    super(Camera.id);

    this.scene = this.experience.scene;
    this.canvas = this.experience.canvas;
    this.mouse = this.experience.mouse;
    this.debug = this.experience.debug;



    // Setup

    this.setupCamera();
    this.setupOrbitControls();
  }


  static getInstance() {
    if (!Camera.instance) {
      Camera.instance = new Camera();
    }

    return Camera.instance;
  }


  setupCamera() {
    this.target = new THREE.PerspectiveCamera(50, this.sizes.aspect, 0.1, 1000);
    this.target.position.setZ(1.5);

    this.scene.add(this.target);

    this.resize();
  }


  setupOrbitControls() {
    this.orbitControls = new OrbitControls(this.target, this.canvas);
    this.orbitControls.enableDamping = true;
    this.orbitControls.enableZoom = false;
    this.orbitControls.enablePan = false;
  }


  setupCinematicMovement() {

  }


  resize() {
    this.target.aspect = this.sizes.aspect;
    this.target.updateProjectionMatrix();
  }


  update() {
    if (this.orbitControls) this.orbitControls.update();
  }
}