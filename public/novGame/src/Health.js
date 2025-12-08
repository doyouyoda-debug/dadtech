class Health {
    static sprite = null;
    static loaded = false;

    static load() {
        if (Health.sprite) return;
        Health.sprite = new Image();
        Health.sprite.src = 'images/heart.png';
        Health.sprite.onload = () => { Health.loaded = true; };
        Health.sprite.onerror = (e) => console.error('Error loading heart.png', e);
    }

    constructor(maxHearts = 5) {
        this.maxHearts = maxHearts;
        this.currentHearts = maxHearts;
        this.heartSize = 40;
        this.heartSpacing = 50; // Space between hearts
        this.startX = 300;
        this.startY = 20;
        this.gameOver = false;
        this.restartRequested = false;
    }

    takeDamage() {
        if (this.currentHearts > 0) {
            this.currentHearts--;
            if (this.currentHearts === 0) {
                this.gameOver = true;
            }
        }
    }

    addHealth(amount = 1) {
        this.currentHearts = Math.min(this.currentHearts + amount, this.maxHearts);
    }

    draw(ctx) {
        if (!Health.loaded) return;

        for (let i = 0; i < this.maxHearts; i++) {
            const x = this.startX + i * this.heartSpacing;
            const y = this.startY;

            // Draw heart if still alive, otherwise draw empty space
            if (i < this.currentHearts) {
                ctx.drawImage(
                    Health.sprite,
                    x, y,
                    this.heartSize, this.heartSize
                );
            }
        }
    }

    isGameOver() {
        return this.gameOver;
    }

    getHealth() {
        return this.currentHearts;
    }

    reset() {
        this.currentHearts = this.maxHearts;
        this.gameOver = false;
        this.restartRequested = false;
    }

    requestRestart() {
        this.restartRequested = true;
    }

    hasRestartRequested() {
        return this.restartRequested;
    }
}

export default Health;
