class Broccoli {
    static sprite = null;
    static loaded = false;

    static load() {
        if (Broccoli.sprite) return;
        Broccoli.sprite = new Image();
        Broccoli.sprite.src = 'images/brock.png';
        Broccoli.sprite.onload = () => { 
            Broccoli.loaded = true;
        };
        Broccoli.sprite.onerror = (e) => console.error('Error loading brock.png', e);
    }

    constructor(startX, startY, speedX = -6, speedY = 2, groundLevel = 550) {
        this.x = startX;
        this.y = startY;
        this.size = 60; // sprite display size
        this.speedX = speedX; // move left toward player (varied)
        this.speedY = speedY; // initial arc downward (varied)
        this.rotation = 0;
        this.rotationSpeed = 0.15; // spin as it flies
        
        // Physics: randomized gravity and bounce for variety
        this.gravity = Math.random() * 0.3 + 0.2; // 0.3 to 0.7 (varies fall speed)
        this.bounceCoefficient = 0.3; // energy retained on bounce (0-1)
        this.groundLevel = groundLevel; // ground level (dynamically set)
        this.hasFinishedBouncing = false; // Track when bouncing stops
        this.framesSinceBounceStop = 0; // Count frames after bouncing stops
    }

    update() {
        this.x += this.speedX;
        
        // Apply gravity
        this.speedY += this.gravity;
        this.y += this.speedY;
        
        // Ground bounce: if broccoli hits the ground, reverse and dampen vertical speed
        const bottomBound = this.y + this.size / 2;
        if (bottomBound >= this.groundLevel) {
            this.y = this.groundLevel - this.size / 2;
            this.speedY = -this.speedY * this.bounceCoefficient;
            
            // Check if bouncing has essentially stopped (velocity very small)
            if (Math.abs(this.speedY) < 0.5) {
                this.hasFinishedBouncing = true;
            }
        }
        
        // If finished bouncing, increment counter for removal
        if (this.hasFinishedBouncing) {
            this.framesSinceBounceStop++;
        }
        
        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        if (!Broccoli.loaded) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.drawImage(
            Broccoli.sprite,
            -this.size / 2,
            -this.size / 2,
            this.size,
            this.size
        );
        ctx.restore();
    }

    getBounds() {
        return {
            left: this.x - this.size / 2,
            right: this.x + this.size / 2,
            top: this.y - this.size / 2,
            bottom: this.y + this.size / 2
        };
    }

    isOffscreen(canvasWidth, canvasHeight) {
        return this.x < -this.size || this.x > canvasWidth + this.size ||
               this.y > canvasHeight + this.size;
    }

    shouldRemove() {
        // Remove broccoli 30 frames after it stops bouncing
        return this.hasFinishedBouncing && this.framesSinceBounceStop > 30;
    }
}

export default Broccoli;
