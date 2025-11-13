class BadGuy {
    static sprite = null;
    static loaded = false;
    static frameCount = 1;
    static frameWidth = 0;
    static frameHeight = 0;

    static load() {
        if (BadGuy.sprite) return;
        BadGuy.sprite = new Image();
        BadGuy.sprite.src = 'images/acornman.png';
        BadGuy.sprite.onload = () => {
            const w = BadGuy.sprite.naturalWidth;
            const h = BadGuy.sprite.naturalHeight;
            if (h > 0 && w % h === 0) {
                // Common sprite strip: frames are square, laid horizontally
                BadGuy.frameCount = w / h;
                BadGuy.frameWidth = h;
                BadGuy.frameHeight = h;
            } else {
                // Fallback: assume 4 frames horizontally
                BadGuy.frameCount = 4;
                BadGuy.frameWidth = Math.floor(w / BadGuy.frameCount);
                BadGuy.frameHeight = h;
            }
            BadGuy.loaded = true;
            console.log('BadGuy sprite loaded:', {
                width: w,
                height: h,
                frameCount: BadGuy.frameCount,
                frameWidth: BadGuy.frameWidth,
                frameHeight: BadGuy.frameHeight
            });
        };
        BadGuy.sprite.onerror = (e) => console.error('Error loading acornman.png', e);
    }

    constructor(canvasWidth, groundLevel) {
        this.canvasWidth = canvasWidth;
        this.groundLevel = groundLevel;

        // Display size (scaled) – adjust as needed
        this.width = 220;
        this.height = 220;

    // Stand near the top-right corner with a small margin
    this.x = this.canvasWidth - this.width - 120;
    this.y = 60; // raise higher toward the top

        // Animation timing/state
        this.frameIndex = 0;
        this.frameDelay = 8; // smaller = faster animation
        this.frameTimer = 0;
        this.state = 'idle'; // 'idle' | 'throwing'
        // Randomized cooldown (in frames at ~60fps) before next throw
        this.framesUntilThrow = Math.floor(120 + Math.random() * 240); // 2-6s
        
        // Callback to notify when a throw happens
        this.onThrow = null;

        BadGuy.load();
    }    update() {
        if (!BadGuy.loaded) return;
        // If only one frame, stay idle
        if (BadGuy.frameCount <= 1) {
            this.frameIndex = 0;
            return;
        }

        if (this.state === 'idle') {
            // Freeze on first frame while idle
            this.frameIndex = 0;
            if (this.framesUntilThrow > 0) {
                this.framesUntilThrow--;
            } else {
                // Begin a throw animation sequence
                this.state = 'throwing';
                this.frameIndex = 0;
                this.frameTimer = 0;
                // Trigger projectile spawn at the start of throw
                if (this.onThrow) {
                    this.onThrow(this.x, this.y + this.height / 3);
                }
            }
        } else if (this.state === 'throwing') {
            // Advance through frames once, then return to idle
            this.frameTimer++;
            if (this.frameTimer >= this.frameDelay) {
                this.frameTimer = 0;
                this.frameIndex++;
                if (this.frameIndex >= BadGuy.frameCount) {
                    // Throw finished; go back to idle and schedule next throw
                    this.state = 'idle';
                    this.frameIndex = 0;
                    this.framesUntilThrow = Math.floor(120 + Math.random() * 240);
                }
            }
        }
    }

    draw(ctx) {
        if (!BadGuy.loaded || BadGuy.frameWidth === 0) return;

        // Draw a subtle ground shadow beneath the bad guy
        ctx.save();
        const ovalWidth = this.width * 0.55;   // slightly smaller than character's
        const ovalHeight = this.height * 0.16; // flatter oval
        const ovalX = this.x + this.width / 2; // center under sprite
        const ovalY = this.groundLevel - 10;   // aligned near ground
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.ellipse(ovalX, ovalY, ovalWidth / 2, ovalHeight / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.restore();

        // Draw current animation frame
        const sx = this.frameIndex * BadGuy.frameWidth;
        const sy = 0;
        ctx.drawImage(
            BadGuy.sprite,
            sx, sy, BadGuy.frameWidth, BadGuy.frameHeight,
            this.x, this.y, this.width, this.height
        );
    }
}

export default BadGuy;
