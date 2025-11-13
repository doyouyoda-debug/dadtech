class Burger {
    static sprite = null;
    static loaded = false;

    static load() {
        if (Burger.sprite) return;
        Burger.sprite = new Image();
        Burger.sprite.src = 'images/burger.png';
        Burger.sprite.onload = () => { Burger.loaded = true; };
        Burger.sprite.onerror = (e) => console.error('Error loading burger.png', e);
    }

    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.size = Math.random() * 40 + 80; // 80-120px
        this.x = Math.random() * (this.canvasWidth - this.size) + this.size / 2;
        this.y = -this.size - Math.random() * 200; // start above the view
        this.speedY = Math.random() * 2 + 2; // 2-4 px/frame

        // Rotation state: random initial angle and gentle rotation speed
        this.angle = Math.random() * Math.PI * 2;
        const base = Math.random() * 0.012 + 0.004; // 0.004 - 0.016 rad/frame
        this.rotationSpeed = Math.random() < 0.5 ? -base : base;
    }

    update() {
        this.y += this.speedY;
        this.angle += this.rotationSpeed;
    }

    draw(ctx) {
        if (!Burger.loaded) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.drawImage(
            Burger.sprite,
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

    isOffscreen() {
        return this.y - this.size / 2 > this.canvasHeight + 50;
    }

    hitGround(groundLevel) {
        return this.y + this.size / 2 >= groundLevel;
    }
}

export default Burger;
