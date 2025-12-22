export default class Bomb {
  constructor(x) {
    this.x = x;
    this.y = 100;
    this.vy = 0;
    // Match bomb.png aspect (500x580) scaled down
    this.w = 50;
    this.h = 58;
    this.resting = false;
    this.rotation = 0;
    this.angularVelocity = Math.random() * 30 - 15;
    this.animationTime = 0;
  }
}
