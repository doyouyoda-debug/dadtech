export default class Tramp {
  constructor(x) {
    this.type = 'tramp';
    this.x = x;
    this.y = 100;
    this.vy = 0;
    // Tramp dimensions
    this.w = 70;
    this.h = 20;
    this.resting = false;
    this.rotation = 0;
    this.angularVelocity = Math.random() * 30 - 15; // spin while falling
    this.animationTime = 0;
    this.hasBounced = false;
  }
}
