import { EventEmitter } from 'events';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Assets
import maskPath from '../assets/models/mask.glb?url';
import veneciaMaskPath from '../assets/models/veneciaMask.glb?url';
import samuraiPath from '../assets/models/samurai.glb?url';
import cyborgPath from '../assets/models/cyborg.glb?url';


export default class Resources extends EventEmitter {
  static instance;

  static getInstance(assets) {
    return Resources.instance ?? new Resources(assets);
  }

  constructor() {
    super();

    if (Resources.instance) return Resources.instance;
    Resources.instance = this;

    // Setup model loader
    const THREE_PATH = `https://unpkg.com/three@0.161.0`;
    const dracoLoader = new DRACOLoader().setDecoderPath(`${THREE_PATH}/examples/jsm/libs/draco/`);

    this.loader = new GLTFLoader().setDRACOLoader(dracoLoader);

    this.models = {};
    this.loadingCount = 0;
    this.totalModels = 5;

    // Load all models
    this.loadModel('mask', maskPath);
    this.loadModel('veneciaMask', veneciaMaskPath);
    this.loadModel('samurai', samuraiPath);
    this.loadModel('cyborg', cyborgPath);
  }

  loadModel(name, path) {
    this.loadingCount++;
    this.loader.load(
      path,
      (model) => {
        this.models[name] = model;
        this.loadingCount--;

        // Emit ready when all models are loaded
        if (this.loadingCount === 0) {
          this.emit('ready');
          document.body.classList.remove('is-loading');
        }
      },
      undefined,
      (error) => console.error(`Error loading ${name} model:`, error)
    );
  }
}
