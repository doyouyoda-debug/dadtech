class HealthBox {
    static sprite = null;
    static loaded = false;

    static load() {
        if (HealthBox.sprite) return;
        HealthBox.sprite = new Image();
        HealthBox.sprite.src = 'images/healthbox.png';
        HealthBox.sprite.onload = () => { HealthBox.loaded = true; };
        HealthBox.sprite.onerror = (e) => console.error('Error loading healthbox.png', e);
    }

    constructor(x, y, speedX = 0, speedY = -8, groundLevel = 550) {
        this.x = x;
        this.y = y;
        this.speedX = speedX;
        this.speedY = speedY;
        this.gravity = 0.4;
        this.size = 150;
        this.groundLevel = groundLevel;
        this.bounceCoefficient = 0.6;
        this.rotation = 0;
        this.rotationSpeed = 0.05;
    }

    update() {
        this.x += this.speedX;
        
        // Apply gravity
        this.speedY += this.gravity;
        this.y += this.speedY;
        
        // Ground bounce: if healthbox hits the ground, reverse and dampen vertical speed
        const bottomBound = this.y + this.size / 2;
        if (bottomBound >= this.groundLevel) {
            this.y = this.groundLevel - this.size / 2;
            this.speedY = -this.speedY * this.bounceCoefficient;
        }
        
        this.rotation += this.rotationSpeed;
    }

    draw(ctx) {
        if (!HealthBox.loaded) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.drawImage(
            HealthBox.sprite,
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
}

export default HealthBox;
