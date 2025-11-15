class Leaf {
    static sprite = null;
    static frameCount = 6;
    static frameWidth = 0;
    static frameHeight = 0;
    static spriteLoaded = false;
    static spriteLoadStarted = false;

    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.scale = 0.5;

        // Start loading the sprite sheet only once
        if (!Leaf.spriteLoadStarted) {
            Leaf.spriteLoadStarted = true;
            Leaf.sprite = new window.Image();
            Leaf.sprite.src = 'images/leaves.png';
            Leaf.sprite.onload = () => {
                // Use actual image width divided by 6 frames; no warnings
                Leaf.frameCount = 6;
                Leaf.frameWidth = Leaf.sprite.naturalWidth > 0
                    ? Leaf.sprite.naturalWidth / Leaf.frameCount
                    : 0;
                Leaf.frameHeight = Leaf.sprite.naturalHeight;
                Leaf.spriteLoaded = true;
                // sprite loaded
            };
            Leaf.sprite.onerror = (e) => console.error('Error loading leaf sprite:', e);
        }

        this.reset();
        this.y = Math.random() * canvasHeight;
    }

    reset() {
        this.x = Math.random() * this.canvasWidth;
        this.y = -20;
        this.size = Math.random() * 70 + 50;
        this.speedY = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        this.oscillationSpeed = Math.random() * 0.02;
        this.oscillationDistance = Math.random() * 3;
        this.time = Math.random() * 100;
        // Pick a random frame index (will be 0 if only one frame)
    this.frameIndex = Math.floor(Math.random() * Math.max(1, Leaf.frameCount));
    }

    update() {
        this.y += this.speedY;
        this.time += this.oscillationSpeed;
        this.x += Math.sin(this.time) * this.oscillationDistance + this.speedX;
        this.rotation += this.rotationSpeed;

        if (this.y > this.canvasHeight + 20) {
            this.reset();
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const size = this.size * this.scale;

        // Only draw sprite if loaded and frame info is valid; otherwise draw nothing
        if (Leaf.spriteLoaded && Leaf.sprite && Leaf.frameWidth > 0 && Leaf.frameHeight > 0) {
            const sx = (this.frameIndex % Leaf.frameCount) * Leaf.frameWidth;
            const sy = 0;
            try {
                ctx.drawImage(
                    Leaf.sprite,
                    sx, sy, Leaf.frameWidth, Leaf.frameHeight,
                    -size/2, -size/2, size, size
                );
            } catch (e) {
                console.error('Leaf draw error (drawImage):', e);
            }
        }

        ctx.restore();
    }
}

export default Leaf;