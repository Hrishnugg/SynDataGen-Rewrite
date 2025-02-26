import { EventEmitter } from 'events';
import { Clock } from 'three';

export default class Time extends EventEmitter {

  static instance;

  constructor() {
    super();

    this.clock = new Clock()

    this.update();
  }

  static getInstance() {
    if (!Time.instance) {
      Time.instance = new Time();
    }

    return Time.instance;
  }

  update() {
    const delta = this.clock.getDelta()
    const time = this.clock.getElapsedTime()

    this.emit('update', time, delta,);

    this.requestAnimtionFrameId = window.requestAnimationFrame(() => this.update());
  }

  dispose() {
    cancelAnimationFrame(this.requestAnimtionFrameId);
  }
}
