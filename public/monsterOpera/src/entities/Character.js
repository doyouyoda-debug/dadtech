export default class Character {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.velocity = 0;
    this.animFrame = 0;
    this.animTime = 0;
    this.lastDir = 1;
    this.falling = false;
    this.fallVy = 0;
    this.fallRotation = 0;
    this.splat = false;
    this.splatTime = 0;
    this.landingStarted = false;
  }
}
