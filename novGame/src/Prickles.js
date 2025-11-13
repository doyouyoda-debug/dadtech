class Sprite {
    constructor(img, x, y, width, height) {
        this.img = img;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw(ctx, drawX, drawY, scale = 1) {
        ctx.drawImage(
            this.img,
            this.x, this.y, this.width, this.height,
            drawX, drawY,
            this.width * scale, this.height * scale
        );
    }
}

class Prickles {
    static sprite = null;
    static loaded = false;
    static runFrames = [];

    static load() {
        if (Prickles.sprite) return;
        Prickles.sprite = new Image();
        Prickles.sprite.src = 'images/pricklesSprite.png';
        Prickles.sprite.onload = () => {
            Prickles.loaded = true;
            Prickles.initSprites();
        };
        Prickles.sprite.onerror = (e) => console.error('Error loading pricklesSprite.png', e);
    }

    static initSprites() {
        // Define sprite frames: x, y, width, height
        Prickles.runFrames = [
            new Sprite(Prickles.sprite, 0, 0, 250, 305),
            new Sprite(Prickles.sprite, 250, 0, 250, 305),
            new Sprite(Prickles.sprite, 490, 0, 250, 305),
            new Sprite(Prickles.sprite, 250, 0, 250, 305),
            new Sprite(Prickles.sprite, 0, 0, 250, 305)
        ];
    }

    constructor(canvasWidth, groundLevel) {
        this.canvasWidth = canvasWidth;
        this.groundLevel = groundLevel;
        this.width = 250;
        this.height = 305;
        this.x = canvasWidth; // Start off-screen to the right
        this.y = groundLevel - 120;
        this.speed = 3; // Pixels per frame
        this.direction = -1; // -1 = left, 1 = right
        this.duration = 8 * 60; // 8 seconds at 60fps = 480 frames
        this.elapsedTime = 0;
        this.active = false;
        this.slideDistance = 300; // How far to slide each direction
        this.slideStartX = this.x;
        this.facingLeft = false;
        // Animation state
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameInterval = 7; // Advance frame every 7 game frames (~8.5 fps)
    }

    start() {
        this.active = true;
        this.elapsedTime = 0;
        this.x = this.canvasWidth;
        this.direction = -1;
        this.slideStartX = this.canvasWidth;
        this.facingLeft = true;
    }

    update() {
        if (!this.active) return;

        this.elapsedTime++;

        // Animate running frames
        this.frameTimer++;
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;
            this.frameIndex = (this.frameIndex + 1) % Prickles.runFrames.length;
        }

        // First, slide in from the right all the way to the left
        if (this.elapsedTime < 120) {
            this.x -= this.speed * 1.5;
            if (this.x < this.width / 2) {
                this.x = this.width / 2;
            }
            this.facingLeft = true;
        } else if (this.elapsedTime < this.duration) {
            const slideTime = this.elapsedTime - 120;
            const cycleDuration = 120;
            const cyclePosition = slideTime % cycleDuration;
            const slideRange = this.canvasWidth - this.width;
            if (Math.floor(slideTime / cycleDuration) % 2 === 0) {
                this.x = (this.width / 2) + (cyclePosition / cycleDuration) * slideRange;
                this.direction = 1;
                this.facingLeft = false;
            } else {
                this.x = (this.width / 2) + slideRange - (cyclePosition / cycleDuration) * slideRange;
                this.direction = -1;
                this.facingLeft = true;
            }
        } else {
            this.x += this.speed * 2;
            if (this.x > this.canvasWidth + 100) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (!Prickles.loaded || !this.active || Prickles.runFrames.length === 0) return;

        ctx.save();

        const drawX = Math.floor(this.x - this.width / 2);
        const drawY = Math.floor(this.y);
        const scale = 0.55;

        // Flip if facing right (don't flip for left)
        if (!this.facingLeft) {
            ctx.translate(drawX + this.width * scale, drawY);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(drawX, drawY);
        }

        // Draw correct frame from sprite array
        const sprite = Prickles.runFrames[this.frameIndex];
        sprite.draw(ctx, 0, 0, scale);

        ctx.restore();
    }

    isActive() {
        return this.active;
    }

    getBounds() {
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

export default Prickles;
