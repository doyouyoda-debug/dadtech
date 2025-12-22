export default class MouseTrap {
  constructor(x) {
    this.type = 'mousetrap';
    this.x = x;
    this.y = 100;
    this.vy = 0;
    // Mousetrap dimensions (adjust based on mousetrap.png aspect ratio)
    this.w = 45;
    this.h = 30;
    this.resting = false;
    this.rotation = 0;
    this.angularVelocity = Math.random() * 40 - 20; // spin faster than bomb
    this.animationTime = 0;
    this.triggered = false; // track if trap has been triggered
  }
}
