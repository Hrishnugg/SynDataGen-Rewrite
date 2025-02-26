import Handler from './abstract/Handler.js';
import * as THREE from 'three';

// Post Processing
import PostProcessing from './postprocessing';

export default class Renderer extends Handler {

  static instance;

  static getInstance(_options) {
    if (!Renderer.instance) {
      Renderer.instance = new Renderer(_options);
    }

    return Renderer.instance;
  }

  constructor() {
    super(Renderer.id);


    this.debug = this.experience.debug;
    this.canvas = this.experience.canvas;
    this.camera = this.experience.camera;
    this.scene = this.experience.scene;


    // Debug

    if (this.debug.active) {
      this.debugFolder = this.debug.gui.addFolder('renderer')
    }

    this.init();
  }


  init() {
    this.webglRenderer = new THREE.WebGLRenderer({
      canvas: this.experience.canvas,
      powerPreference: 'high-performance',
    });

    this.webglRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.webglRenderer.toneMappingExposure = 1;

    this.webglRenderer.setSize(this.sizes.width, this.sizes.height);
    this.webglRenderer.setPixelRatio(this.sizes.pixelRatio);

    this.setDebug();
  }


  setupPostProcessing() {
    this.postprocessing = PostProcessing.getInstance({
      renderer: this.webglRenderer,
      scene: this.scene,
      camera: this.camera,
      sizes: this.sizes,
      debug: this.debug,
    });
  }


  onWorldLoaded() {
    this.setupPostProcessing();
  }


  resize() {
    if (!this.webglRenderer) return;

    this.webglRenderer.setSize(this.sizes.width, this.sizes.height);
    this.webglRenderer.setPixelRatio(this.sizes.pixelRatio);

    this.postprocessing.resize();
  }


  update(state) {
    if (!this.webglRenderer) return;

    this.webglRenderer.clear();

    this.debug.active && this.debug.stats.beforeRender();

    if (this.postprocessing) this.postprocessing.update(state);

    this.debug.active && this.debug.stats.afterRender();
  }


  setDebug() {
    // Debug
    if (this.debug.active) {

      // Set Stats
      this.debug.stats.setRenderPanel(this.webglRenderer.getContext());

      this.debugFolder
        .add(
          this.webglRenderer,
          'toneMapping',
          {
            'NoToneMapping': THREE.NoToneMapping,
            'LinearToneMapping': THREE.LinearToneMapping,
            'ReinhardToneMapping': THREE.ReinhardToneMapping,
            'CineonToneMapping': THREE.CineonToneMapping,
            'ACESFilmicToneMapping': THREE.ACESFilmicToneMapping
          }
        )
        .onChange(() => {
          this.scene.traverse((_child) => {
            if (_child instanceof THREE.Mesh)
              _child.material.needsUpdate = true
          })
        })

      this.debugFolder
        .add(
          this.webglRenderer,
          'toneMappingExposure'
        )
        .min(0)
        .max(10)
    }
  }
}
