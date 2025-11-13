class BroccoliPiece {
    constructor(x, y, velocityX, velocityY, groundLevel = 550) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.gravity = 0.4;
        this.size = Math.random() * 4 + 3; // 3-7 pixels (slightly larger than crumbs)
        this.life = 1.0; // Alpha value, fades from 1 to 0
        this.maxLife = 1.0;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.groundLevel = groundLevel;
    }

    update() {
        // Apply gravity
        this.velocityY += this.gravity;
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Bounce off ground
        if (this.y > this.groundLevel) {
            this.y = this.groundLevel;
            this.velocityY *= -0.6; // Bounce with damping
            this.velocityX *= 0.95; // Friction
        }
        
        // Apply rotation
        this.rotation += this.rotationSpeed;
        
        // Fade out over time
        this.life -= 0.02;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = '#22C55E'; // Green color for broccoli pieces
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }

    isAlive() {
        return this.life > 0;
    }
}

export default BroccoliPiece;
