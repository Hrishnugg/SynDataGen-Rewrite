import { EventEmitter } from 'events';
import Experience from '../Experience.js';


export default class Mouse extends EventEmitter {

  static instance;

  static getInstance() {
    if (!Mouse.instance) {
      Mouse.instance = new Mouse();
    }

    return Mouse.instance;
  }

  constructor() {
    super();

    this.experience = new Experience();
    this.sizes = this.experience.sizes;


    // Pointer Move

    this.cursorPosition = {
      x: 0,
      y: 0,
    };

    window.addEventListener('mousemove', event => {
      this.cursorPosition.x = (event.clientX / this.sizes.width) * 2 - 1;
      this.cursorPosition.y = (-event.clientY / this.sizes.height) * 2 + 1;

      this.emit('mousemove', this.cursorPosition);
    });
  }
}
