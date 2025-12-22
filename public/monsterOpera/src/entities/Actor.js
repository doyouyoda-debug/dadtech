export default class Actor {
  constructor({ x, y, w, h, spriteX = 0, spriteY = 0, animationFrames = 1, isLady = false }) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.spriteX = spriteX;
    this.spriteY = spriteY;
    this.animationFrames = animationFrames; // number of animation frames
    this.currentFrame = 0;
    this.animationTime = 0;
    this.animationSpeed = 6; // frames per second
    this.animationStep = 0; // tracks position in 8-step cycle [0,1,2,3,4,3,2,1]
    this.isLady = isLady; // flag for lady actors with resting animation
  }
}
