class Crumb {
    constructor(x, y, velocityX, velocityY) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.gravity = 0.4;
        this.size = Math.random() * 3 + 2; // 2-5 pixels
        this.life = 1.0; // Alpha value, fades from 1 to 0
        this.maxLife = 1.0;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        // Apply gravity
        this.velocityY += this.gravity;
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Bounce off ground (y > groundLevel)
        if (this.y > 900) { // Approximate ground level (canvas height - 100)
            this.y = 900;
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
        ctx.fillStyle = '#D2A679'; // Tan color for crumbs
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }

    isAlive() {
        return this.life > 0;
    }
}

export default Crumb;
