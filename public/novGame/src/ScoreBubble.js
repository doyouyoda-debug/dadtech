class ScoreBubble {
    static sprite3 = null;
    static sprite5 = null;
    static loaded = false;

    static load() {
        if (ScoreBubble.sprite3 && ScoreBubble.sprite5) return;
        
        ScoreBubble.sprite3 = new Image();
        ScoreBubble.sprite3.src = 'images/scorebubble3.png';
        ScoreBubble.sprite3.onerror = (e) => console.error('Error loading scorebubble3.png', e);
        
        ScoreBubble.sprite5 = new Image();
        ScoreBubble.sprite5.src = 'images/scorebubble5.png';
        ScoreBubble.sprite5.onload = () => { ScoreBubble.loaded = true; };
        ScoreBubble.sprite5.onerror = (e) => console.error('Error loading scorebubble5.png', e);
    }

    constructor(x, y, type = 5) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.type = type; // 3 or 5
        this.width = 90;
        this.height = 90;
        this.lifetime = 60; // 60 frames at 60fps = 1 second
        this.age = 0;
        this.floatDistance = 80; // How far to float upward
    }

    update() {
        this.age++;
        // Float upward
        this.y = this.startY - (this.age / this.lifetime) * this.floatDistance;
    }

    draw(ctx) {
        if (!ScoreBubble.loaded) return;

        ctx.save();

        // Calculate opacity: fade out in the last 0.3 seconds
        const fadeStart = this.lifetime * 0.5; // Start fading at 50%
        let opacity = 1;
        if (this.age > fadeStart) {
            opacity = 1 - ((this.age - fadeStart) / (this.lifetime - fadeStart));
        }

        ctx.globalAlpha = opacity;

        const sprite = this.type === 3 ? ScoreBubble.sprite3 : ScoreBubble.sprite5;
        ctx.drawImage(
            sprite,
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );

        ctx.restore();
    }

    isAlive() {
        return this.age < this.lifetime;
    }
}

export default ScoreBubble;
