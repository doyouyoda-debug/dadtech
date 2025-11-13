import Leaf from './Leaf.js';
import Character from './Character.js';
import Physics from './Physics.js';
import Burger from './Burger.js';
import BadGuy from './BadGuy.js';
import Broccoli from './Broccoli.js';
import Crumb from './Crumb.js';
import BroccoliPiece from './BroccoliPiece.js';
import Health from './Health.js';
import HealthBox from './HealthBox.js';
import Prickles from './Prickles.js';
import ScoreBubble from './ScoreBubble.js';
import HighScoreManager from './firebase-config.js';

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.groundLevel = canvas.height - 100;

        // Handle responsive canvas sizing for mobile
        const resizeCanvas = () => {
            if (window.innerWidth < 600) {
                const maxWidth = Math.min(window.innerWidth - 16, 600);
                const scale = maxWidth / 1200;
                canvas.style.width = maxWidth + 'px';
                canvas.style.height = (650 * scale) + 'px';
            } else {
                canvas.style.width = '';
                canvas.style.height = '';
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initialize game objects
        this.character = new Character(canvas.width, canvas.height, this.groundLevel);
        this.leaves = Array(20).fill(null).map(() => new Leaf(canvas.width, canvas.height));
        this.burgers = [];
        this.broccolis = [];
        this.crumbs = [];
        this.broccoliPieces = [];
        this.healthBoxes = [];
        this.scoreBubbles = [];
        this.score = 0;
        this.timeRemaining = 60; // seconds
        this.frameCount = 0;

        // HUD element refs
        this.scoreElement = document.getElementById('scoreValue');
        this.timeElement = document.getElementById('timeValue');
        this.heartsContainer = document.getElementById('heartsContainer');

        // Asset loading
        Character.load();
        Burger.load();
        Broccoli.load();
        Health.load();
        HealthBox.load();
        Prickles.load();
        ScoreBubble.load();

        // Actors & state
        this.health = new Health(5);
        this.prickles = new Prickles(canvas.width, this.groundLevel);
        this.pricklesTriggered = false;
        this.lastPricklesScore = 35; // First trigger at score 35
        this.lastHealthBoxScore = 0; // First trigger at score 75
        this.badGuy = new BadGuy(canvas.width, this.groundLevel);

        // Audio
        this.munchSound = new Audio('sounds/munch.wav');
        this.munchSound.volume = 0.5;

        // Background
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'images/autumn-forest.jpg';

        // Input state
        this.keys = { left: false, right: false, up: false, x: false };

        // High score (Firebase)
        this.scoreSaved = false;
        this.gameOverHandled = false;
        this.highScoreManager = new HighScoreManager();
        this.hsModal = document.getElementById('highscoreModal');
        this.hsNameInput = document.getElementById('hsNameInput');
        this.hsScoreText = document.getElementById('hsScoreText');
        this.hsSaveBtn = document.getElementById('hsSaveBtn');
        this.hsCancelBtn = document.getElementById('hsCancelBtn');
        this.hsMessage = document.getElementById('hsMessage');
        this.attachHighscoreHandlers();

        // Live high score list elements
        this.topScoresList = document.getElementById('topScoresList');
        this.topScoresEmpty = document.getElementById('topScoresEmpty');
        this.initializeLiveScores();

        // Contributors list
        this.contributorsList = document.getElementById('contributorsList');
        this.initializeContributors();

        // Title screen
        this.titleScreenModal = document.getElementById('titleScreenModal');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.gameStarted = false;
        this.setupTitleScreen();

        // Initialize HUD and controls
        this.initializeHearts();
        this.setupEventListeners();

        // BadGuy throws
        this.badGuy.onThrow = (x, y) => {
            const count = Math.floor(Math.random() * 2) + 1; // 1-2 broccoli
            for (let i = 0; i < count; i++) {
                const speedX = -(Math.random() * 10 + 2); // Vary distance: 2-12 px/frame
                const speedY = Math.random() * 4 - 1;
                this.broccolis.push(new Broccoli(x, y, speedX, speedY, this.groundLevel));
            }
        };
    }

    // ----- High score modal helpers -----
    attachHighscoreHandlers() {
        if (this.hsSaveBtn) {
            this.hsSaveBtn.addEventListener('click', async () => {
                const name = (this.hsNameInput?.value || 'Anonymous').trim();
                this.hsSaveBtn.disabled = true;
                try {
                    const ok = await this.highScoreManager.saveScore(name, this.score);
                    if (ok && this.hsMessage) {
                        this.hsMessage.classList.remove('hidden');
                        this.hsMessage.textContent = 'Saved!';
                    }
                    this.scoreSaved = true;
                } catch (e) {
                    if (this.hsMessage) {
                        this.hsMessage.classList.remove('hidden');
                        this.hsMessage.textContent = 'Save failed.';
                    }
                }
                setTimeout(() => this.hideHighscoreModal(), 900);
            });
        }
        if (this.hsCancelBtn) {
            this.hsCancelBtn.addEventListener('click', () => this.hideHighscoreModal());
        }
    }

    showHighscoreModal() {
        if (!this.hsModal) return;
        if (this.hsScoreText) this.hsScoreText.textContent = String(this.score);
        if (this.hsNameInput) {
            this.hsNameInput.value = '';
            this.hsNameInput.focus();
        }
        this.hsMessage?.classList.add('hidden');
        this.hsModal.classList.remove('hidden');
        this.hsModal.classList.add('flex');
        if (this.hsSaveBtn) this.hsSaveBtn.disabled = false;
    }

    hideHighscoreModal() {
        if (!this.hsModal) return;
        this.hsModal.classList.add('hidden');
        this.hsModal.classList.remove('flex');
    }

    async checkHighScoreAndMaybeShow() {
        if (this.score <= 0) return;
        try {
            const top = await this.highScoreManager.getTopScores(10);
            let qualifies = false;
            if (top.length < 10) {
                qualifies = true;
            } else {
                const minScore = top.reduce((m, s) => Math.min(m, Number(s.score || 0)), Infinity);
                qualifies = this.score > minScore;
            }
            if (qualifies && !this.scoreSaved) {
                this.showHighscoreModal();
            }
        } catch (e) {
            console.warn('High score check failed:', e);
        }
    }

    // ----- Live High Score List Rendering -----
    initializeLiveScores() {
        if (!this.topScoresList) return;
        this.highScoreManager.onScoresUpdate((scores) => {
            this.renderTopScores(scores);
        });
    }

    sanitize(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    renderTopScores(scores) {
        if (!this.topScoresList) return;
        const listEl = this.topScoresList;
        const emptyEl = this.topScoresEmpty;
        if (!scores || scores.length === 0) {
            listEl.classList.add('hidden');
            if (emptyEl) emptyEl.classList.remove('hidden');
            return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');
        listEl.classList.remove('hidden');
        const sorted = [...scores]
            .sort((a,b) => Number(b.score||0) - Number(a.score||0))
            .slice(0,10);
        listEl.innerHTML = sorted.map((s, idx) => {
            const name = this.sanitize(s.playerName || 'Anonymous');
            const score = Number(s.score||0);
            const rankClass = idx === 0 ? 'text-yellow-300 font-bold'
                : idx === 1 ? 'text-yellow-200'
                : idx === 2 ? 'text-yellow-100'
                : 'text-white/90';
            return `<li class="flex justify-between ${rankClass} border-b border-white/20 pb-2 mb-2"><span class="truncate max-w-[60%]">${idx+1}. ${name}</span><span>${score}</span></li>`;
        }).join('');
    }

    // ----- Contributors List -----
    initializeContributors() {
        // TO ADD A CONTRIBUTOR: Add their name and role to this array
        const contributors = [
            { name: 'Marie (Prickles)', role: 'Character Ideation' },
            { name: 'ThatFishingGuy', role: 'Music' },
            { name: 'Nathan', role: 'Game Ideation Specialist' },
            { name: 'Britzel', role: 'Game Ideation Specialist' },
            { name: 'DownToDrown', role: 'Game Ideation Specialist' },
            { name: 'Lynette', role: 'Game Ideation Specialist' },
            { name: 'Hannah', role: 'Game Ideation Specialist & Major Contributor' },
            { name: 'Brandy', role: 'Game Ideation Specialist & Major Contributor' }
            // Add more contributors here following the same format:
            // { name: 'Your Name', role: 'Your Role' },
        ];

        if (!this.contributorsList) return;
        
        this.contributorsList.innerHTML = contributors.map(c => {
            const name = this.sanitize(c.name);
            const role = this.sanitize(c.role);
            return `<div class="flex flex-col">
                <span class="font-semibold text-white">${name}</span>
                <span class="text-sm text-white/70">${role}</span>
            </div>`;
        }).join('');
    }

    // ----- Title Screen -----
    setupTitleScreen() {
        if (this.startGameBtn) {
            this.startGameBtn.addEventListener('click', () => {
                this.hideTitleScreen();
                this.gameStarted = true;
            });
        }
    }

    hideTitleScreen() {
        if (this.titleScreenModal) {
            this.titleScreenModal.classList.add('hidden');
        }
    }

    initializeHearts() {
        if (this.heartsContainer) {
            this.heartsContainer.innerHTML = '';
            for (let i = 0; i < this.health.maxHearts; i++) {
                const heart = document.createElement('div');
                heart.className = 'heart';
                heart.id = `heart-${i}`;
                this.heartsContainer.appendChild(heart);
            }
        }
    }

    updateHUD() {
        // Update score
        if (this.scoreElement) {
            this.scoreElement.textContent = this.score;
        }
        
        // Update time
        if (this.timeElement) {
            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            this.timeElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
        
        // Update hearts
        if (this.heartsContainer) {
            for (let i = 0; i < this.health.maxHearts; i++) {
                const heart = document.getElementById(`heart-${i}`);
                if (heart) {
                    if (i < this.health.currentHearts) {
                        heart.classList.remove('empty');
                    } else {
                        heart.classList.add('empty');
                    }
                }
            }
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.keys.left = true;
            if (e.key === 'ArrowRight') this.keys.right = true;
            if (e.key === 'ArrowUp' || e.key === ' ') {
                e.preventDefault(); // Prevent page scroll
                this.keys.up = true;
            }
            if (e.key === 'x' || e.key === 'X') this.keys.x = true;
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') this.keys.left = false;
            if (e.key === 'ArrowRight') this.keys.right = false;
            if (e.key === 'ArrowUp' || e.key === ' ') this.keys.up = false;
            if (e.key === 'x' || e.key === 'X') this.keys.x = false;
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.health.isGameOver()) {
                const rect = this.canvas.getBoundingClientRect();
                // Calculate the scale ratio between display size and internal size
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const x = (e.clientX - rect.left) * scaleX;
                const y = (e.clientY - rect.top) * scaleY;
                this.handleGameOverClick(x, y);
            }
        });
    }

    handleGameOverClick(x, y) {
        // Button dimensions (must match draw method)
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = this.canvas.width / 2 - buttonWidth / 2;
        const buttonY = this.canvas.height / 2 + 120;

        if (x >= buttonX && x <= buttonX + buttonWidth &&
            y >= buttonY && y <= buttonY + buttonHeight) {
            this.resetGame();
        }
    }

    async saveScore() {
        // (Removed old prompt-based saveScore; using modal-driven save now)
    }

    resetGame() {
        this.character = new Character(this.canvas.width, this.canvas.height, this.groundLevel);
        this.burgers = [];
        this.broccolis = [];
        this.crumbs = [];
        this.broccoliPieces = [];
        this.healthBoxes = [];
        this.scoreBubbles = [];
        this.score = 0;
        this.timeRemaining = 60;
        this.frameCount = 0;
        this.pricklesTriggered = false;
        this.lastPricklesScore = 35; // Reset to initial trigger score
        this.lastHealthBoxScore = 0; // Reset health box trigger
        this.prickles = new Prickles(this.canvas.width, this.groundLevel);
        this.health.reset();
        this.scoreSaved = false;
        this.gameOverHandled = false;
        this.hideHighscoreModal();
        this.updateHUD();
    }

    update() {
        // Update timer (decrement every 60 frames at 60fps = 1 second)
        this.frameCount++;
        if (this.frameCount >= 60) {
            this.frameCount = 0;
            if (this.timeRemaining > 0) {
                this.timeRemaining--;
            }
            // Trigger game over when time runs out
            if (this.timeRemaining === 0) {
                this.health.gameOver = true;
            }
        }

        this.character.update(this.keys, Physics);
        this.leaves.forEach(leaf => leaf.update());
        this.badGuy.update();

        // Check if score threshold reached to trigger Prickles
        // Prickles appears at 35, then every 40 points after (75, 115, 155, etc.)
        if (this.score >= this.lastPricklesScore && !this.pricklesTriggered) {
            this.pricklesTriggered = true;
            this.lastPricklesScore += 40; // Next trigger at +40
            this.prickles.start();
        }

        // Update Prickles
        this.prickles.update();

        // Reset prickles trigger flag when he becomes inactive
        if (this.pricklesTriggered && !this.prickles.isActive()) {
            this.pricklesTriggered = false;
        }

        // Check if score threshold reached to trigger HealthBox
        // HealthBox appears every 75 points (75, 150, 225, etc.)
        if (this.score >= this.lastHealthBoxScore + 75) {
            console.log('Spawning health box at score', this.score);
            this.lastHealthBoxScore += 75;
            const randomX = Math.random() * (this.canvas.width - 100) + 50;
            this.healthBoxes.push(new HealthBox(randomX, 0, 0, -8, this.groundLevel));
        }

        // Update crumbs and remove dead ones
        this.crumbs.forEach(c => c.update());
        for (let i = this.crumbs.length - 1; i >= 0; i--) {
            if (!this.crumbs[i].isAlive()) {
                this.crumbs.splice(i, 1);
            }
        }

        // Update broccoli pieces and remove dead ones
        this.broccoliPieces.forEach(p => p.update());
        for (let i = this.broccoliPieces.length - 1; i >= 0; i--) {
            if (!this.broccoliPieces[i].isAlive()) {
                this.broccoliPieces.splice(i, 1);
            }
        }

        // Update score bubbles and remove dead ones
        this.scoreBubbles.forEach(b => b.update());
        for (let i = this.scoreBubbles.length - 1; i >= 0; i--) {
            if (!this.scoreBubbles[i].isAlive()) {
                this.scoreBubbles.splice(i, 1);
            }
        }

        // Update health boxes and remove offscreen ones
        this.healthBoxes.forEach(h => h.update());
        for (let i = this.healthBoxes.length - 1; i >= 0; i--) {
            if (this.healthBoxes[i].isOffscreen(this.canvas.width, this.canvas.height)) {
                this.healthBoxes.splice(i, 1);
            }
        }

        // Update broccolis and remove offscreen ones
        this.broccolis.forEach(b => {
            const wasAboveGround = b.y + b.size / 2 < this.groundLevel;
            b.update();
            const isNowAtGround = b.y + b.size / 2 >= this.groundLevel;
            if (wasAboveGround && isNowAtGround) {
                this.spawnBroccoliPieces(b.x, this.groundLevel);
            }
        });
        for (let i = this.broccolis.length - 1; i >= 0; i--) {
            if (this.broccolis[i].isOffscreen(this.canvas.width, this.canvas.height) || 
                this.broccolis[i].shouldRemove()) {
                this.broccolis.splice(i, 1);
            }
        }

        // Check broccoli collision with character
        for (let i = this.broccolis.length - 1; i >= 0; i--) {
            const bb = this.broccolis[i].getBounds();
            // Use a tighter collision box around the character's center to avoid sprite corners
            const charCenterWidth = this.character.width * 0.6;
            const charCenterHeight = this.character.height * 0.6;
            const charBounds = {
                left: this.character.x - charCenterWidth / 2,
                right: this.character.x + charCenterWidth / 2,
                top: this.character.y + (this.character.height - charCenterHeight) / 2,
                bottom: this.character.y + (this.character.height + charCenterHeight) / 2
            };
            const intersects = !(bb.right < charBounds.left ||
                                 bb.left > charBounds.right ||
                                 bb.bottom < charBounds.top ||
                                 bb.top > charBounds.bottom);
            if (intersects) {
                this.score -= 10;
                this.character.getHurt();
                this.health.takeDamage();
                this.broccolis.splice(i, 1);
            }
        }

        // Spawn burgers randomly when sprite is loaded
        if (Burger.loaded && this.burgers.length < 15 && Math.random() < 0.02) {
            this.burgers.push(new Burger(this.canvas.width, this.canvas.height));
        }

        // Update burgers and handle offscreen removal and ground collision
        this.burgers.forEach(b => b.update());
        for (let i = this.burgers.length - 1; i >= 0; i--) {
            if (this.burgers[i].isOffscreen()) {
                this.burgers.splice(i, 1);
            } else if (this.burgers[i].hitGround(this.groundLevel)) {
                this.spawnCrumbs(this.burgers[i].x, this.groundLevel);
                this.burgers.splice(i, 1);
            }
        }

        // Collision detection with character (AABB)
        const charBounds = {
            left: this.character.x - this.character.width / 2,
            right: this.character.x + this.character.width / 2,
            top: this.character.y,
            bottom: this.character.y + this.character.height
        };
        for (let i = this.burgers.length - 1; i >= 0; i--) {
            const bb = this.burgers[i].getBounds();
            const intersects = !(bb.right < charBounds.left ||
                                 bb.left > charBounds.right ||
                                 bb.bottom < charBounds.top ||
                                 bb.top > charBounds.bottom);
            if (intersects) {
                // Only count and remove burger if X key is held down
                if (this.keys.x) {
                    this.score += 5;
                    // Spawn score bubble above character's head
                    this.scoreBubbles.push(new ScoreBubble(this.character.x, this.character.y - 50, 5));
                    // Only play sound if it's not already playing
                    if (this.munchSound.paused) {
                        this.munchSound.currentTime = 0;
                        this.munchSound.play().catch(err => console.log('Sound play failed:', err));
                    }
                    this.burgers.splice(i, 1);
                }
                // else: do nothing; let the burger keep falling and possibly be collected later
            }
        }

        // Collision detection between Prickles and burgers
        if (this.prickles.isActive()) {
            const pricklesBounds = this.prickles.getBounds();
            for (let i = this.burgers.length - 1; i >= 0; i--) {
                const bb = this.burgers[i].getBounds();
                const intersects = !(bb.right < pricklesBounds.left ||
                                     bb.left > pricklesBounds.right ||
                                     bb.bottom < pricklesBounds.top ||
                                     bb.top > pricklesBounds.bottom);
                if (intersects) {
                    this.score += 3;
                    // Spawn score bubble above Prickles
                    this.scoreBubbles.push(new ScoreBubble(this.prickles.x, this.prickles.y - 50, 3));
                    this.burgers.splice(i, 1);
                }
            }
        }

        // Collision detection between character and health boxes
        for (let i = this.healthBoxes.length - 1; i >= 0; i--) {
            const hb = this.healthBoxes[i].getBounds();
            const intersects = !(hb.right < charBounds.left ||
                                 hb.left > charBounds.right ||
                                 hb.bottom < charBounds.top ||
                                 hb.top > charBounds.bottom);
            if (intersects) {
                this.health.addHealth(2);
                this.healthBoxes.splice(i, 1);
            }
        }
        
        // Update HUD
        this.updateHUD();

        // On first game-over frame, check high score and maybe show modal
        if (this.health.isGameOver() && !this.gameOverHandled) {
            this.gameOverHandled = true;
            this.checkHighScoreAndMaybeShow();
        }
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        if (this.backgroundImage.complete) {
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw game objects
        this.leaves.forEach(leaf => leaf.draw(this.ctx));
        this.badGuy.draw(this.ctx);
        this.prickles.draw(this.ctx);
        // Draw burgers behind the character so character stays on top
        this.burgers.forEach(b => b.draw(this.ctx));
        // Draw broccolis
        this.broccolis.forEach(b => b.draw(this.ctx));
        // Draw crumbs
        this.crumbs.forEach(c => c.draw(this.ctx));
        // Draw broccoli pieces
        this.broccoliPieces.forEach(p => p.draw(this.ctx));
        // Draw health boxes
        this.healthBoxes.forEach(h => h.draw(this.ctx));
        // Draw score bubbles
        this.scoreBubbles.forEach(b => b.draw(this.ctx));
        this.character.draw(this.ctx);
        
        // Draw game over text if health is depleted
        if (this.health.isGameOver()) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 80px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            
            // Draw final score
            this.ctx.font = 'bold 48px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 60);
            
            // Draw Start Over button
            const buttonWidth = 200;
            const buttonHeight = 60;
            const buttonX = this.canvas.width / 2 - buttonWidth / 2;
            const buttonY = this.canvas.height / 2 + 120;
            
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 28px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Start Over', this.canvas.width / 2, buttonY + buttonHeight / 2);
        }
    }

    spawnCrumbs(x, y) {
        // Spawn 8-12 crumbs in all directions
        const count = Math.floor(Math.random() * 5) + 8;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = Math.random() * 4 + 3; // 3-7 px/frame
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 3; // Bias upward
            this.crumbs.push(new Crumb(x, y, vx, vy));
        }
    }

    spawnBroccoliPieces(x, y) {
        // Spawn 8-12 broccoli pieces in all directions
        const count = Math.floor(Math.random() * 5) + 8;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = Math.random() * 4 + 3; // 3-7 px/frame
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 3; // Bias upward
            this.broccoliPieces.push(new BroccoliPiece(x, y, vx, vy, this.groundLevel));
        }
    }

    gameLoop = () => {
        if (!this.health.isGameOver() && this.gameStarted) {
            this.update();
        }
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }

    start() {
        // Start the game loop once the background is loaded
        if (this.backgroundImage.complete) {
            this.gameLoop();
        } else {
            this.backgroundImage.onload = () => this.gameLoop();
        }
    }
}

export default Game;