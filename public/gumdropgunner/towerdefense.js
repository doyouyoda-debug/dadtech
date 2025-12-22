const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Canvas setup
canvas.width = 1000;
canvas.height = 600;

// Preload background image
const backgroundImg = new Image();
backgroundImg.src = '/gumdropgunner/gameback.png';

// Preload path texture
const pathImg = new Image();
pathImg.src = '/gumdropgunner/gingerpath.png';

// Preload tower image
const towerImg = new Image();
towerImg.src = '/gumdropgunner/breadtower.png';

// Preload gunner image
const gunnerImg = new Image();
gunnerImg.src = '/gumdropgunner/gunner.png';

// Preload snow turret image
const snowTurretImg = new Image();
snowTurretImg.src = '/gumdropgunner/snowturret.png';

// Preload gingerbread cannon image
const cannonImg = new Image();
cannonImg.src = '/gumdropgunner/gingercannon.png';

// Preload licorice launcher image (replaces bomb)
const licoriceImg = new Image();
licoriceImg.src = '/gumdropgunner/licoriceLauncher.png';

// Preload crater image
const craterImg = new Image();
craterImg.src = '/gumdropgunner/crater.png';

// Preload explosion sound
const explosionSound = new Audio('/gumdropgunner/explosion.mp3');
explosionSound.volume = 0.7;

// Preload and setup background music
const themeSong = new Audio('/gumdropgunner/themesong.mp3');
themeSong.loop = true;
themeSong.volume = 0.3;
let musicPlaying = false;

// Music control functions
function toggleMusic() {
    const button = document.getElementById('musicToggle');
    if (musicPlaying) {
        themeSong.pause();
        musicPlaying = false;
        button.textContent = '🔇 Play Music';
    } else {
        themeSong.play().catch(e => console.log('Audio play failed:', e));
        musicPlaying = true;
        button.textContent = '🔊 Pause Music';
    }
}

function setVolume(value) {
    themeSong.volume = value / 100;
    document.getElementById('volumeValue').textContent = value + '%';
}

// Preload enemy sprite sheet
const enemyImg = new Image();
enemyImg.src = '/gumdropgunner/mintGuySprite.png';

// Preload gumdrop enemy image
const gumdropEnemyImg = new Image();
gumdropEnemyImg.src = '/gumdropgunner/gumdrop.png';

// Preload pep guy image
const pepGuyImg = new Image();
pepGuyImg.src = '/gumdropgunner/pepGuy.png';

// Preload workshop image
const workshopImg = new Image();
workshopImg.src = '/gumdropgunner/workshop.png';

// Preload ingredient button images
const sugarBtnImg = new Image();
sugarBtnImg.src = '/gumdropgunner/sugarbtn.png';

const butterBtnImg = new Image();
butterBtnImg.src = '/gumdropgunner/butterbtn.png';

// Preload coin image
const coinImg = new Image();
coinImg.src = '/gumdropgunner/coin.png';

// Game variables
let money = 200;
let lives = 20;
let score = 0;
let gameOver = false;
let selectedTowerType = 'gun';
let wave = 1;
let enemiesSpawned = 0;
let enemiesKilled = 0;
let showTowerPreview = false;
let previewX = 0;
let previewY = 0;
let enemiesPerWave = 0;
let totalEnemiesThisWave = 0;

// Workshop phase variables
let inWorkshop = false;
let workshopTimer = 0;
let workshopDuration = 30 * 60; // 30 seconds at 60fps
let cookieBombs = 0;
let currentRecipe = [];
let selectedRecipeIndex = 0;

// Multiple recipes to craft
const recipes = [
    { 
        name: 'Cookie Bomb',
        ingredients: ['flour', 'sugar', 'butter'],
        description: 'Basic explosive cookie'
    },
    { 
        name: 'Super Cookie',
        ingredients: ['butter', 'flour', 'sugar'],
        description: 'Extra powerful bomb'
    },
    { 
        name: 'Quick Cookie',
        ingredients: ['sugar', 'butter', 'flour'],
        description: 'Fast crafting recipe'
    }
];

const ingredients = [
    { name: 'flour', emoji: '🌾', label: 'Flour', x: 850, y: 200 },
    { name: 'sugar', emoji: '🧂', label: 'Sugar', x: 850, y: 300 },
    { name: 'butter', emoji: '🧈', label: 'Butter', x: 850, y: 400 }
];

// Game objects
let towers = [];
let enemies = [];
let projectiles = [];
let particles = [];
let fallingCookies = []; // Array to track falling cookie bombs
let coins = []; // Array to track bouncing coins
let baseTower = null;
let flyingGunner = null; // gunner sprite thrown when base dies
let baseTowerDestroyed = false;
let baseTowerX = null; // store tower x for crater rendering
let baseTowerY = null; // store tower y for crater rendering
let gameOverCountdown = 0;

// Smooth angle lerp to avoid spin jitter
function lerpAngle(a, b, t) {
    const diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
}

// Tower costs and stats
const towerStats = {
    gun: { cost: 80, range: 120, damage: 6, fireRate: 30, color: '#4CAF50' },
    laser: { cost: 150, range: 150, damage: 10, fireRate: 20, color: '#FF4081' },
    gingerbread: { cost: 180, range: 140, damage: 12, fireRate: 25, color: '#D2691E' },
    bomb: { cost: 200, range: 100, damage: 20, fireRate: 50, color: '#FFC107' }
};

// Path configurations (changes every 3 waves)
const pathConfigs = [
    // Path 1 (Waves 1-3)
    [
        { x: -50, y: 150 },
        { x: 150, y: 150 },
        { x: 200, y: 200 },
        { x: 250, y: 150 },
        { x: 400, y: 150 },
        { x: 450, y: 300 },
        { x: 600, y: 300 },
        { x: 650, y: 450 },
        { x: 900, y: 450 },
        { x: 950, y: 450 }
    ],
    // Path 2 (Waves 4-6)
    [
        { x: -50, y: 300 },
        { x: 200, y: 300 },
        { x: 250, y: 200 },
        { x: 400, y: 200 },
        { x: 450, y: 350 },
        { x: 550, y: 350 },
        { x: 600, y: 450 },
        { x: 750, y: 450 },
        { x: 900, y: 450 },
        { x: 950, y: 450 }
    ],
    // Path 3 (Waves 7-9)
    [
        { x: -50, y: 450 },
        { x: 150, y: 450 },
        { x: 200, y: 350 },
        { x: 300, y: 350 },
        { x: 350, y: 200 },
        { x: 500, y: 200 },
        { x: 550, y: 350 },
        { x: 700, y: 350 },
        { x: 750, y: 450 },
        { x: 900, y: 450 },
        { x: 950, y: 450 }
    ],
    // Path 4 (Waves 10+)
    [
        { x: -50, y: 200 },
        { x: 100, y: 200 },
        { x: 150, y: 300 },
        { x: 250, y: 300 },
        { x: 300, y: 450 },
        { x: 500, y: 450 },
        { x: 550, y: 300 },
        { x: 700, y: 300 },
        { x: 750, y: 450 },
        { x: 900, y: 450 },
        { x: 950, y: 450 }
    ]
];

// Current path (starts with path 1)
let path = [...pathConfigs[0]];

// Function to update path based on wave
function updatePath() {
    const pathIndex = Math.min(Math.floor((wave - 1) / 3), pathConfigs.length - 1);
    path = [...pathConfigs[pathIndex]];
}

// Enemy class
class Enemy {
    constructor(type = 'mint') {
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.type = type;
        
        if (type === 'gumdrop') {
            // Gumdrop enemy - bigger and stronger
            this.speed = 1.2 + Math.random() * 0.3;
            this.health = 50;
            this.maxHealth = 50;
            this.radius = 30;
            this.canShoot = Math.random() < 0.7; // 70% can shoot
            this.moneyValue = 20;
            this.scoreValue = 200;
            this.hoverTime = Math.random() * Math.PI * 2; // Random start for wave
        } else if (type === 'pep') {
            // Pep guy - stronger enemy from wave 3+
            this.speed = 1.8 + Math.random() * 0.4;
            this.health = 40;
            this.maxHealth = 40;
            this.radius = 26;
            this.canShoot = Math.random() < 0.8; // 80% can shoot
            this.moneyValue = 25;
            this.scoreValue = 250;
        } else {
            // Mint enemy - default
            this.speed = 1.5 + Math.random() * 0.5;
            this.health = 30;
            this.maxHealth = 30;
            this.radius = 24;
            this.canShoot = Math.random() < 0.6; // 60% can shoot
            this.moneyValue = 15;
            this.scoreValue = 100;
        }
        
        this.fireCounter = 0;
        this.fireRate = 60 + Math.random() * 40; // Random fire rate
        this.frame = 0;
        this.frameCounter = 0;
        this.frameRate = 15; // Change frame every 15 game ticks for smoother animation
        this.totalFrames = 3; // 3 frames in walk cycle
    }

    update() {
        // Update hover animation for gumdrop
        if (this.type === 'gumdrop') {
            this.hoverTime += 0.08;
        }

        if (this.pathIndex < path.length - 1) {
            // Always steer toward the next waypoint from the enemy's CURRENT position
            const next = path[this.pathIndex + 1];
            const dx = next.x - this.x;
            const dy = next.y - this.y;
            const dist = Math.hypot(dx, dy);
            const moveDistance = this.speed;

            if (dist <= moveDistance || dist === 0) {
                // Snap to the waypoint to avoid drifting off-path, then advance
                this.x = next.x;
                this.y = next.y;
                this.pathIndex++;
            } else {
                // Move toward the waypoint using the current direction
                const ux = dx / dist;
                const uy = dy / dist;
                this.x += ux * moveDistance;
                this.y += uy * moveDistance;
            }
        }

        // Enemy shooting logic
        if (this.canShoot) {
            this.fireCounter++;
            if (this.fireCounter >= this.fireRate) {
                this.fireCounter = 0;
                this.shootAtTower();
            }
        }
    }

    shootAtTower() {
        // Find nearest tower to shoot at
        let closestTower = null;
        let closestDist = 200;

        for (let tower of towers) {
            const dist = Math.hypot(tower.x - this.x, tower.y - this.y);
            if (dist < closestDist) {
                closestDist = dist;
                closestTower = tower;
            }
        }

        if (closestTower) {
            projectiles.push(new Projectile(this.x, this.y, closestTower, 'enemybullet'));
        }
    }

    draw() {
        // Offset enemies up so they appear on the path rather than below it
        let drawY = this.y - 15;
        
        // Add hovering effect for gumdrop
        if (this.type === 'gumdrop') {
            drawY += Math.sin(this.hoverTime) * 5; // 5 pixel hover range
        }

        // Draw shadow underneath the enemy
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(this.x, drawY + this.radius + 5, this.radius * 0.8, this.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Update animation frame for mint enemies
        if (this.type === 'mint') {
            this.frameCounter++;
            if (this.frameCounter >= this.frameRate) {
                this.frameCounter = 0;
                this.frame = (this.frame + 1) % this.totalFrames;
            }
        }

        // Draw enemy based on type
        if (this.type === 'gumdrop') {
            // Draw gumdrop enemy
            if (gumdropEnemyImg.complete && gumdropEnemyImg.naturalWidth > 0) {
                ctx.save();
                ctx.translate(this.x, drawY);
                ctx.drawImage(gumdropEnemyImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.restore();
            } else {
                // Fallback circle
                ctx.fillStyle = '#FF1493';
                ctx.beginPath();
                ctx.arc(this.x, drawY, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'pep') {
            // Draw pep guy enemy
            if (pepGuyImg.complete && pepGuyImg.naturalWidth > 0) {
                ctx.save();
                ctx.translate(this.x, drawY);
                ctx.drawImage(pepGuyImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.restore();
            } else {
                // Fallback circle
                ctx.fillStyle = '#00FF00';
                ctx.beginPath();
                ctx.arc(this.x, drawY, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Draw mint enemy with sprite animation
            if (enemyImg.complete && enemyImg.naturalWidth > 0) {
                ctx.save();
                ctx.translate(this.x, drawY);
                
                // Sprite sheet has 4 frames, each 128px wide
                const frameWidth = 128;
                const frameHeight = enemyImg.height;
                const sx = this.frame * frameWidth;
                
                ctx.drawImage(
                    enemyImg,
                    sx, 0, frameWidth, frameHeight,
                    -this.radius, -this.radius, this.radius * 2, this.radius * 2
                );
                ctx.restore();
            } else {
                // Fallback: Enemy body circle
                ctx.fillStyle = '#FF6B6B';
                ctx.beginPath();
                ctx.arc(this.x, drawY, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // Eyes
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x - 5, drawY - 3, 3, 3);
                ctx.fillRect(this.x + 2, drawY - 3, 3, 3);
            }
        }

        // Health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.radius, drawY - this.radius - 8, this.radius * 2, 3);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.radius, drawY - this.radius - 8, this.radius * 2 * healthPercent, 3);
    }

    isAlive() {
        return this.health > 0;
    }

    takeDamage(damage) {
        this.health -= damage;
    }
}

// Tower class
class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.stats = towerStats[type];
        this.fireCounter = 0;
        this.health = 50;
        this.maxHealth = 50;
        this.rotation = 0;
        this.rotationTarget = 0;
        this.rotationSpeed = 0.18; // smoothing factor
        this.rotationOffset = type === 'bomb' ? Math.PI / 2 : (type === 'gun' ? Math.PI * 3/4 : 0); // rotation offset for aiming
    }

    update() {
        this.fireCounter++;
        if (this.fireCounter >= this.stats.fireRate) {
            this.fireCounter = 0;
            this.findAndShoot();
        }

        // Always track the nearest enemy, even outside range
        let closest = null;
        let closestDist = Infinity;

        for (let enemy of enemies) {
            if (enemy.isAlive()) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = enemy;
                }
            }
        }

        if (closest) {
            const dx = closest.x - this.x;
            const dy = closest.y - this.y;
            this.rotationTarget = Math.atan2(dy, dx);
        }

        // Smoothly rotate toward target angle
        this.rotation = lerpAngle(this.rotation, this.rotationTarget, this.rotationSpeed);
    }

    findAndShoot() {
        let closest = null;
        let closestDist = this.stats.range;

        for (let enemy of enemies) {
            if (enemy.isAlive()) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = enemy;
                }
            }
        }

        if (closest) {
            // Calculate angle to target
            const dx = closest.x - this.x;
            const dy = closest.y - this.y;
            this.rotationTarget = Math.atan2(dy, dx);
            
            // Calculate spawn position offset from the left side of cannon
            const offsetDist = 20;
            const rotForShot = this.rotation; // use smoothed rot for projectile
            const spawnX = this.x - Math.cos(rotForShot) * offsetDist;
            const spawnY = this.y - Math.sin(rotForShot) * offsetDist;
            
            const projectile = new Projectile(spawnX, spawnY, closest, this.type);
            projectiles.push(projectile);
        }
    }

    takeDamage(damage) {
        this.health -= damage;
    }

    isAlive() {
        return this.health > 0;
    }

    draw() {
        // Draw tower images based on type
        if (this.type === 'gun' && snowTurretImg.complete && snowTurretImg.naturalWidth > 0) {
            // Draw snow turret sprite sheet: first 377px = cannon (vertical), remainder = base
            const cannonW = 377;
            const cannonH = snowTurretImg.height;
            const baseW = snowTurretImg.width - cannonW;
            const baseH = snowTurretImg.height;

            if (baseW > 0 && cannonH > 0) {
                const desiredHeight = 60; // target on-canvas height
                const scale = desiredHeight / Math.max(baseH, cannonH);

                ctx.save();
                ctx.translate(this.x, this.y);

                // Draw cannon first (rotates; behind base)
                ctx.save();
                ctx.rotate(this.rotation + this.rotationOffset);
                const cannonOffsetX = -(cannonW * scale) / 2 - 6 * scale; // embed slightly into base
                const cannonOffsetY = -(cannonH * scale) * 0.5 - 15; // move up to be more visible
                ctx.drawImage(
                    snowTurretImg,
                    0, 0, cannonW, cannonH,
                    cannonOffsetX,
                    cannonOffsetY,
                    cannonW * scale,
                    cannonH * scale
                );
                ctx.restore();

                // Draw base on top (static, no rotation)
                ctx.drawImage(
                    snowTurretImg,
                    cannonW, 0, baseW, baseH,
                    - (baseW * scale) / 2,
                    - (baseH * scale) / 2,
                    baseW * scale,
                    baseH * scale
                );

                ctx.restore();
            } else {
                // Fallback if sheet dimensions unexpected
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.drawImage(snowTurretImg, -25, -25, 50, 50);
                ctx.restore();
            }
        } else if (this.type === 'gingerbread' && cannonImg.complete && cannonImg.naturalWidth > 0) {
            // Draw gingerbread cannon
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation + Math.PI);
            ctx.scale(-1, 1);
            ctx.drawImage(cannonImg, -25, -25, 50, 50);
            ctx.restore();
        } else if (this.type === 'bomb' && licoriceImg.complete && licoriceImg.naturalWidth > 0) {
            // Draw licorice launcher sprite sheet: first 365px = tube, remainder = base
            const tubeW = 365;
            const tubeH = licoriceImg.height;
            const baseW = licoriceImg.width - tubeW;
            const baseH = licoriceImg.height;

            if (baseW > 0 && tubeH > 0) {
                const desiredHeight = 60; // target on-canvas height
                const scale = desiredHeight / Math.max(baseH, tubeH);

                ctx.save();
                ctx.translate(this.x, this.y);

                // Draw base (static, no rotation)
                ctx.drawImage(
                    licoriceImg,
                    tubeW, 0, baseW, baseH,
                    - (baseW * scale) / 2,
                    - (baseH * scale) / 2,
                    baseW * scale,
                    baseH * scale
                );

                // Draw tube (rotates; pivot at bottom of tube)
                ctx.save();
                ctx.rotate(this.rotation + this.rotationOffset);
                const tubeOffsetX = -(tubeW * scale) / 2 - 6 * scale; // embed slightly into base
                const tubeOffsetY = -(tubeH * scale) * 0.5; // center vertically on base
                ctx.drawImage(
                    licoriceImg,
                    0, 0, tubeW, tubeH,
                    tubeOffsetX,
                    tubeOffsetY,
                    tubeW * scale,
                    tubeH * scale
                );
                ctx.restore();

                ctx.restore();
            } else {
                // Fallback if sheet dimensions unexpected
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.drawImage(licoriceImg, -25, -25, 50, 50);
                ctx.restore();
            }
        } else {
            // Fallback: Tower base circle
            ctx.fillStyle = this.stats.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
            ctx.fill();

            // Tower top
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - 5, this.y - 8, 10, 8);
        }

        // Health bar for towers taking damage
        if (this.health < this.maxHealth) {
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(this.x - 20, this.y - 25, 40, 3);
            ctx.fillStyle = '#00FF00';
            const healthPercent = this.health / this.maxHealth;
            ctx.fillRect(this.x - 20, this.y - 25, 40 * healthPercent, 3);
        }

        // Range indicator (faint)
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.stats.range, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Base Tower class - Large tower at the end of the road
class BaseTower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.range = 200;
        this.damage = 8;
        this.fireRate = 15;
        this.fireCounter = 0;
        this.charRotation = 0;
        this.health = 100;
        this.maxHealth = 100;
    }

    update() {
        this.fireCounter++;
        if (this.fireCounter >= this.fireRate) {
            this.fireCounter = 0;
            this.findAndShoot();
        }
    }

    findAndShoot() {
        let closest = null;
        let closestDist = this.range;

        for (let enemy of enemies) {
            if (enemy.isAlive()) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = enemy;
                }
            }
        }

        if (closest) {
            this.charRotation = Math.atan2(closest.y - this.y, closest.x - this.x);
            // Shoot from the top of the tower, offset outward to prevent sticking
            const shootY = this.y - 120;
            const offsetDist = 40;
            const shootX = this.x + Math.cos(this.charRotation) * offsetDist;
            const projectile = new Projectile(shootX, shootY, closest, 'gumdrop');
            projectiles.push(projectile);
        }
    }

    takeDamage(damage) {
        this.health -= damage;
        
        // Create red sparks flying out from tower
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
            const speed = 3 + Math.random() * 3;
            const spark = {
                x: this.x + Math.random() * 40 - 20,
                y: this.y - 80 + Math.random() * 40,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 20 + Math.random() * 15,
                maxLife: 35,
                size: 3 + Math.random() * 3
            };
            particles.push(spark);
        }
        
        if (this.health <= 0 && !baseTowerDestroyed) {
            this.health = 0;
            baseTowerDestroyed = true;
            baseTowerX = this.x;
            baseTowerY = this.y;
            gameOverCountdown = 60; // ~1 second delay before game over

            // Play explosion sound
            explosionSound.currentTime = 0;
            explosionSound.play().catch(() => {}); // Ignore audio errors

            // Crumble effect: spawn falling debris/rubble particles
            for (let i = 0; i < 40; i++) {
                const x = this.x + (Math.random() - 0.5) * 120;
                const y = this.y - 100 + (Math.random() - 0.5) * 100;
                const vx = (Math.random() - 0.5) * 8;
                const vy = Math.random() * -6 - 2; // upward momentum
                particles.push(new CrumbleParticle(x, y, vx, vy));
            }

            // Launch the gunner upward and to the left
            flyingGunner = {
                x: this.x,
                y: this.y - 140,
                vx: -6,
                vy: -10,
                rotation: 0,
                vrot: 0.35,
                life: 240
            };
        }
    }

    draw() {
        // Don't draw tower if destroyed
        if (baseTowerDestroyed) {
            return;
        }

        // Save context state
        ctx.save();
        
        // Translate to tower position, flip horizontally, then draw
        ctx.translate(this.x, this.y);
        ctx.scale(-1, 1); // Flip horizontally
        
        // Draw the tower image only if it's loaded
        if (towerImg.complete && towerImg.naturalWidth > 0) {
            ctx.drawImage(towerImg, -100, -150, 200, 200);
        } else {
            // Fallback: draw a simple tower shape
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(-60, -60, 120, 120);
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 3;
            ctx.strokeRect(-60, -60, 120, 120);
        }
        
        // Draw gunner on top of tower if loaded
        if (gunnerImg.complete && gunnerImg.naturalWidth > 0) {
            ctx.save();
            ctx.translate(0, -140);
            ctx.scale(-1, 1);
            ctx.drawImage(gunnerImg, -30, -50, 60, 100);
            ctx.restore();
        }
        
        ctx.restore();

        // Health bar background
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - 45, this.y + 50, 90, 8);
        
        // Health bar fill
        ctx.fillStyle = '#00FF00';
        const healthPercent = Math.max(0, this.health / this.maxHealth);
        ctx.fillRect(this.x - 45, this.y + 50, 90 * healthPercent, 8);
        
        // Health bar border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - 45, this.y + 50, 90, 8);
        
        // Health text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, Math.floor(this.health))}/${this.maxHealth}`, this.x, this.y + 65);

        // Range indicator
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Projectile class
class Projectile {
    constructor(x, y, target, type) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.type = type;
        this.distanceTraveled = 0;
        this.maxDistance = 1000; // Max distance before removal
        
        // Store initial direction
        if (target) {
            const dx = target.x - x;
            const dy = target.y - y;
            const dist = Math.hypot(dx, dy);
            this.dirX = dist > 0 ? dx / dist : 1;
            this.dirY = dist > 0 ? dy / dist : 0;
        } else {
            this.dirX = 1;
            this.dirY = 0;
        }
        
        if (type === 'gumdrop') {
            this.speed = 5;
            this.damage = 8;
            this.size = 6;
        } else if (type === 'enemybullet') {
            this.speed = 3;
            this.damage = 5;
            this.size = 4;
        } else {
            this.speed = 4;
            this.damage = towerStats[type].damage;
            this.size = type === 'bomb' ? 8 : 4;
        }
    }

    update() {
        if (this.target && this.target.isAlive()) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist < this.speed) {
                this.hit();
                return true; // Remove this projectile
            }

            this.dirX = dx / dist;
            this.dirY = dy / dist;
            this.x += this.dirX * this.speed;
            this.y += this.dirY * this.speed;
        } else {
            // Target is dead, keep moving in established direction
            this.x += this.dirX * this.speed;
            this.y += this.dirY * this.speed;
        }
        
        this.distanceTraveled += this.speed;
        
        // Remove projectile if it goes off-screen or travels too far
        if (this.x < -50 || this.x > canvas.width + 50 || 
            this.y < -50 || this.y > canvas.height + 50 ||
            this.distanceTraveled > this.maxDistance) {
            return true; // Remove this projectile
        }
        
        return false;
    }

    hit() {
        if (this.type === 'bomb') {
            // Bomb explodes in radius
            ctx.fillStyle = 'rgba(255, 193, 7, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 50, 0, Math.PI * 2);
            ctx.fill();

            for (let enemy of enemies) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < 50) {
                    enemy.takeDamage(this.damage);
                    createExplosion(enemy.x, enemy.y, '#FFC107');
                }
            }
        } else if (this.type === 'enemybullet') {
            // Enemy bullet damages towers
            this.target.takeDamage(this.damage);
            createExplosion(this.target.x, this.target.y, '#FF6B6B');
        } else {
            this.target.takeDamage(this.damage);
            const color = this.type === 'gumdrop' ? '#FF69B4' : towerStats[this.type].color;
            createExplosion(this.target.x, this.target.y, color);
        }
    }

    draw() {
        if (this.type === 'gumdrop') {
            // Draw gumdrop as a circular candy
            ctx.fillStyle = '#FF69B4';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Highlight on gumdrop
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x - 2, this.y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'enemybullet') {
            // Draw enemy bullet as red projectile
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Tower projectile colors
            let projectileColor;
            if (this.type === 'gun') {
                projectileColor = '#FFFFFF'; // Snow turret - white
            } else if (this.type === 'gingerbread') {
                projectileColor = '#8B4513'; // Gingerbread cannon - brown
            } else if (this.type === 'bomb') {
                projectileColor = '#800020'; // Licorice launcher - maroon
            } else {
                projectileColor = towerStats[this.type].color; // fallback
            }
            
            ctx.fillStyle = projectileColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Crumble particle for tower destruction
class CrumbleParticle {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = 60 + Math.random() * 40;
        this.maxLife = this.life;
        this.size = 4 + Math.random() * 8;
        this.color = ['#8B4513', '#A0522D', '#654321', '#704214'][Math.floor(Math.random() * 4)];
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.groundLevel = 600; // approximate ground
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.25; // gravity
        
        // Bounce off ground
        if (this.y >= this.groundLevel) {
            this.y = this.groundLevel;
            this.vy *= -0.6; // bounce with damping
            this.vx *= 0.9; // friction
        }
        
        this.rotation += this.rotationSpeed;
        this.life--;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
    }

    isAlive() {
        return this.life > 0;
    }
}

// Bouncing coin class
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = -4 - Math.random() * 4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.3;
        this.gravity = 0.35;
        this.bounce = 0.5;
        this.friction = 0.95;
        this.life = 120; // Coins last 2 seconds
        this.collected = false;
        this.groundY = 550; // Ground level
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
        
        // Bounce off ground
        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.vy *= -this.bounce;
            this.vx *= this.friction;
            
            // Stop bouncing if velocity is too low
            if (Math.abs(this.vy) < 0.5) {
                this.vy = 0;
            }
        }
        
        // Apply friction
        this.vx *= 0.99;
        
        this.life--;
    }

    draw() {
        if (coinImg.complete && coinImg.naturalWidth > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.globalAlpha = Math.min(1, this.life / 30); // Fade out in last 30 frames
            ctx.drawImage(coinImg, -15, -15, 30, 30);
            ctx.restore();
        } else {
            // Fallback: yellow circle
            ctx.fillStyle = '#FFD700';
            ctx.globalAlpha = Math.min(1, this.life / 30);
            ctx.beginPath();
            ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    isAlive() {
        return this.life > 0 && !this.collected;
    }
}

// Particle class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 30;
        this.maxLife = 30;
        this.color = color;
        this.size = this.size || 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // gravity
        this.vx *= 0.98; // air resistance
        this.life--;
    }

    draw() {
        const alpha = this.life / (this.maxLife || 30);
        ctx.globalAlpha = alpha;
        
        // Draw spark with gradient (red to yellow)
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size || 3);
        gradient.addColorStop(0, this.color || '#FF0000');
        gradient.addColorStop(0.5, '#FF6600');
        gradient.addColorStop(1, '#FF8800');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size || 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isAlive() {
        return this.life > 0;
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateFlyingGunner() {
    if (!flyingGunner) return;
    flyingGunner.x += flyingGunner.vx;
    flyingGunner.y += flyingGunner.vy;
    flyingGunner.vy += 0.35; // gravity
    flyingGunner.rotation += flyingGunner.vrot;
    flyingGunner.life--;
    if (flyingGunner.life <= 0 || flyingGunner.y > canvas.height + 100) {
        flyingGunner = null;
    }
}

function drawFlyingGunner() {
    if (!flyingGunner) return;
    ctx.save();
    ctx.translate(flyingGunner.x, flyingGunner.y);
    ctx.rotate(flyingGunner.rotation);
    if (gunnerImg.complete && gunnerImg.naturalWidth > 0) {
        ctx.drawImage(gunnerImg, -30, -50, 60, 100);
    } else {
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// Game functions
function selectTower(type) {
    selectedTowerType = type;
    showTowerPreview = true;
    document.querySelectorAll('.tower-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
}

function placeTower(x, y) {
    const cost = towerStats[selectedTowerType].cost;
    const newRange = towerStats[selectedTowerType].range;
    
    // Check if new tower would overlap with any existing tower's range
    for (let tower of towers) {
        const distance = Math.hypot(tower.x - x, tower.y - y);
        const existingRange = towerStats[tower.type].range;
        
        // Prevent placement if within another tower's range circle
        if (distance < existingRange) {
            return; // Can't place here - too close to existing tower
        }
    }
    
    if (money >= cost) {
        towers.push(new Tower(x, y, selectedTowerType));
        money -= cost;
        updateUI();
    }
}

function spawnEnemy() {
    if (enemies.length < 3 + wave && enemiesSpawned < totalEnemiesThisWave) {
        let type = 'mint'; // default
        
        if (wave >= 3) {
            // From wave 3+, spawn pep guys, gumdrops, and mints
            const rand = Math.random();
            if (rand < 0.2) {
                type = 'pep'; // 20% pep guy
            } else if (rand < 0.5) {
                type = 'gumdrop'; // 30% gumdrop
            } else {
                type = 'mint'; // 50% mint
            }
        } else {
            // Before wave 3, only gumdrops and mints
            let gumdropChance = 0.25; // 25% base
            if (wave >= 2) gumdropChance = 0.35; // 35% from wave 2
            type = Math.random() < gumdropChance ? 'gumdrop' : 'mint';
        }
        
        enemies.push(new Enemy(type));
        enemiesSpawned++;
    }
}

function updateUI() {
    document.getElementById('money').textContent = money;
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('enemyCount').textContent = enemies.filter(e => e.isAlive()).length;
    document.getElementById('cookieBombs').textContent = cookieBombs;
    
    // Update wave progress
    document.getElementById('waveNumber').textContent = wave;
    const remainingEnemies = totalEnemiesThisWave - enemiesKilled;
    document.getElementById('enemiesRemaining').textContent = remainingEnemies;
}

function updateEnemyDots() {
    const dotsContainer = document.getElementById('enemyDots');
    const remainingEnemies = totalEnemiesThisWave - enemiesKilled;
    
    // Create dots for remaining enemies
    dotsContainer.innerHTML = '';
    for (let i = 0; i < remainingEnemies; i++) {
        const dot = document.createElement('div');
        dot.style.width = '12px';
        dot.style.height = '12px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = '#4ade80';
        dot.style.boxShadow = '0 0 5px #4ade80';
        dotsContainer.appendChild(dot);
    }
}

function endGame() {
    gameOver = true;
    document.getElementById('gameOverText').textContent = baseTower.health <= 0 ? 'TOWER DESTROYED!' : 'WAVE ' + wave + ' COMPLETE!';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalLives').textContent = Math.max(0, Math.floor(baseTower.health));
    document.getElementById('gameOver').style.display = 'block';
}

function testExplodeTower() {
    if (!gameOver && !baseTowerDestroyed) {
        baseTower.takeDamage(baseTower.health); // trigger explosion
    }
}

// Canvas click to place towers
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (inWorkshop) {
        // Check if clicked on recipe selection card
        const recipeCardX = 100;
        const recipeCardY = 150;
        const recipeCardWidth = 200;
        const recipeCardHeight = 80;
        const recipeCardSpacing = 100;
        
        for (let i = 0; i < recipes.length; i++) {
            const cardY = recipeCardY + i * recipeCardSpacing;
            if (x >= recipeCardX - recipeCardWidth/2 && 
                x <= recipeCardX + recipeCardWidth/2 &&
                y >= cardY - recipeCardHeight/2 && 
                y <= cardY + recipeCardHeight/2) {
                selectedRecipeIndex = i;
                currentRecipe = []; // Reset progress when switching recipes
                return;
            }
        }
        
        // Check if clicked on ingredient button
        for (let ing of ingredients) {
            const dx = x - ing.x;
            const dy = y - ing.y;
            if (Math.abs(dx) < 40 && Math.abs(dy) < 40) {
                addIngredient(ing.name);
                return;
            }
        }
    } else if (cookieBombs > 0 && e.shiftKey) {
        // Drop cookie bomb with shift+click
        dropCookieBomb(x, y);
    } else {
        placeTower(x, y);
    }
});

// Workshop functions
let lastCraftMessage = '';
let craftMessageTimer = 0;

function addIngredient(ingredientName) {
    if (!inWorkshop) return;
    
    currentRecipe.push(ingredientName);
    
    // Check if recipe matches the currently selected recipe
    const selectedRecipe = recipes[selectedRecipeIndex];
    if (currentRecipe.length === selectedRecipe.ingredients.length) {
        let correct = true;
        for (let i = 0; i < selectedRecipe.ingredients.length; i++) {
            if (currentRecipe[i] !== selectedRecipe.ingredients[i]) {
                correct = false;
                break;
            }
        }
        
        if (correct) {
            cookieBombs++;
            currentRecipe = [];
            lastCraftMessage = selectedRecipe.name + ' Created! +1';
            craftMessageTimer = 120; // Show for 2 seconds at 60fps
            updateUI();
        } else {
            currentRecipe = [];
            lastCraftMessage = 'Wrong recipe!';
            craftMessageTimer = 120;
        }
    }
}

function startWorkshop() {
    inWorkshop = true;
    workshopTimer = 0;
    currentRecipe = [];
}

function exitWorkshop() {
    inWorkshop = false;
    // Start next wave
    wave++;
    
    // Update path every 3 waves
    if ((wave - 1) % 3 === 0) {
        updatePath();
    }
    
    enemiesSpawned = 0;
    enemiesKilled = 0;
    totalEnemiesThisWave = 5 + wave * 5;
    updateEnemyDots();
}

// Helper function to check if a point is near the path
function isNearPath(x, y, threshold = 30) {
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        
        // Check distance to line segment
        const A = x - p1.x;
        const B = y - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = p1.x;
            yy = p1.y;
        } else if (param > 1) {
            xx = p2.x;
            yy = p2.y;
        } else {
            xx = p1.x + param * C;
            yy = p1.y + param * D;
        }
        
        const dist = Math.hypot(x - xx, y - yy);
        if (dist < threshold) {
            return { nearPath: true, pathY: yy };
        }
    }
    return { nearPath: false, pathY: null };
}

function dropCookieBomb(x, y) {
    if (cookieBombs <= 0 || inWorkshop) return;
    
    cookieBombs--;
    updateUI();
    
    // Create a falling cookie bomb object
    fallingCookies.push({
        x: x,
        y: y,
        startY: y,
        velocityY: 0,
        gravity: 0.5,
        radius: 15,
        rotation: 0,
        rotationSpeed: 0.2
    });
}

// Canvas mousemove to track preview position
canvas.addEventListener('mousemove', (e) => {
    if (showTowerPreview) {
        const rect = canvas.getBoundingClientRect();
        previewX = e.clientX - rect.left;
        previewY = e.clientY - rect.top;
    }
});

// Hide preview when leaving canvas
canvas.addEventListener('mouseleave', () => {
    showTowerPreview = false;
});

// Game loop
let spawnCounter = 0;
function gameLoop() {
    // Continue rendering even after game over, so animations can finish
    // Only skip gameplay updates
    const isGameplay = !gameOver;

    // Check if in workshop phase
    if (inWorkshop) {
        // Draw workshop background
        if (workshopImg.complete && workshopImg.naturalWidth > 0) {
            ctx.drawImage(workshopImg, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw recipe selection cards on the left
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        const recipeCardX = 100;
        const recipeCardY = 150;
        const recipeCardWidth = 200;
        const recipeCardHeight = 80;
        const recipeCardSpacing = 100;
        
        for (let i = 0; i < recipes.length; i++) {
            const y = recipeCardY + i * recipeCardSpacing;
            
            // Highlight selected recipe
            if (i === selectedRecipeIndex) {
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = '#FF8C00';
                ctx.lineWidth = 5;
            } else {
                ctx.fillStyle = '#FFE4B5';
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 3;
            }
            
            ctx.fillRect(recipeCardX - recipeCardWidth/2, y - recipeCardHeight/2, recipeCardWidth, recipeCardHeight);
            ctx.strokeRect(recipeCardX - recipeCardWidth/2, y - recipeCardHeight/2, recipeCardWidth, recipeCardHeight);
            
            // Recipe name
            ctx.fillStyle = '#000';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(recipes[i].name, recipeCardX, y - 10);
            
            // Recipe ingredients preview
            ctx.font = '14px Arial';
            const ingredientEmojis = recipes[i].ingredients.map(name => {
                const ing = ingredients.find(item => item.name === name);
                return ing ? ing.emoji : '';
            }).join(' → ');
            ctx.fillText(ingredientEmojis, recipeCardX, y + 15);
        }
        
        // Draw ingredient buttons with numbered order indicators
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        const selectedRecipe = recipes[selectedRecipeIndex];
        
        // Draw semi-transparent black background behind ingredient buttons
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(810, 140, 120, 280);
        
        for (let ing of ingredients) {
            // Find all positions of this ingredient in the recipe
            const positions = [];
            for (let i = 0; i < selectedRecipe.ingredients.length; i++) {
                if (selectedRecipe.ingredients[i] === ing.name) {
                    positions.push(i + 1); // 1-indexed for display
                }
            }
            
            // Draw ingredient button
            if (ing.name === 'sugar' && sugarBtnImg.complete && sugarBtnImg.naturalWidth > 0) {
                // Draw sugar button image
                ctx.drawImage(sugarBtnImg, ing.x - 40, ing.y - 40, 80, 80);
            } else if (ing.name === 'butter' && butterBtnImg.complete && butterBtnImg.naturalWidth > 0) {
                // Draw butter button image
                ctx.drawImage(butterBtnImg, ing.x - 40, ing.y - 40, 80, 80);
            } else {
                // Draw default button with emoji
                ctx.fillStyle = '#FFE4B5';
                ctx.fillRect(ing.x - 40, ing.y - 40, 80, 80);
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 3;
                ctx.strokeRect(ing.x - 40, ing.y - 40, 80, 80);
                ctx.fillText(ing.emoji, ing.x, ing.y + 10);
            }
            
            // Draw order numbers if this ingredient is in the recipe
            if (positions.length > 0) {
                ctx.fillStyle = '#FF6347';
                ctx.font = 'bold 16px Arial';
                const orderText = positions.join(', ');
                ctx.fillText(orderText, ing.x, ing.y - 55);
            }
        }
        
        // Draw current recipe progress
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        const progressText = currentRecipe.map((name, idx) => {
            const ing = ingredients.find(item => item.name === name);
            return ing ? ing.emoji : name;
        }).join(' → ');
        ctx.fillText('Progress: ' + (progressText || '(none)'), 400, 50);
        ctx.fillText('Cookie Bombs: ' + cookieBombs, 400, 80);
        
        // Draw craft message if active
        if (craftMessageTimer > 0) {
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            const messageColor = lastCraftMessage.includes('Wrong') ? '#FF0000' : '#00FF00';
            ctx.fillStyle = messageColor;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(lastCraftMessage, canvas.width / 2, 120);
            ctx.fillText(lastCraftMessage, canvas.width / 2, 120);
            craftMessageTimer--;
        }
        
        // Draw timer
        const timeLeft = Math.ceil((workshopDuration - workshopTimer) / 60);
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.fillText('Workshop: ' + timeLeft + 's', canvas.width / 2, canvas.height - 50);
        
        // Update timer
        workshopTimer++;
        if (workshopTimer >= workshopDuration) {
            exitWorkshop();
        }
        
        updateUI();
        requestAnimationFrame(gameLoop);
        return;
    }

    // Draw background image if loaded, otherwise use fallback color
    if (backgroundImg.complete && backgroundImg.naturalWidth > 0) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = 'rgba(135, 206, 235, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw path with texture
    if (pathImg.complete && pathImg.naturalWidth > 0) {
        // Create a pattern from the path texture
        const pattern = ctx.createPattern(pathImg, 'repeat');
        ctx.strokeStyle = pattern;
    } else {
        ctx.strokeStyle = '#8B7355';
    }
    
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

    // Draw crater if tower was destroyed (after path so it's on top)
    if (baseTowerDestroyed && craterImg.complete && craterImg.naturalWidth > 0) {
        ctx.drawImage(craterImg, baseTowerX - 75, baseTowerY - 75, 150, 150);
    }

    // Only run gameplay logic if game is not over
    if (isGameplay) {
        // Spawn enemies
        spawnCounter++;
        if (spawnCounter > 60) {
            spawnEnemy();
            spawnCounter = 0;
        }

        // Update towers
        for (let i = towers.length - 1; i >= 0; i--) {
            const tower = towers[i];
            tower.update();
            tower.draw();
            
            // Remove destroyed towers
            if (!tower.isAlive()) {
                towers.splice(i, 1);
            }
        }

        // Update base tower
        baseTower.update();
        baseTower.draw();

        // Update enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            enemy.update();

            if (enemy.pathIndex >= path.length - 1) {
                enemies.splice(i, 1);
                baseTower.takeDamage(10);
                enemiesKilled++; // Count as removed from wave
                updateUI();
                updateEnemyDots();
            } else if (!enemy.isAlive()) {
                // Spawn coins before removing enemy
                const numCoins = 2 + Math.floor(Math.random() * 3); // 2-4 coins
                for (let c = 0; c < numCoins; c++) {
                    coins.push(new Coin(enemy.x, enemy.y));
                }
                
                enemies.splice(i, 1);
                money += enemy.moneyValue;
                score += enemy.scoreValue;
                enemiesKilled++;
                updateUI();
                updateEnemyDots();
            } else {
                enemy.draw();
            }
        }

        // Update and draw falling cookies
        for (let i = fallingCookies.length - 1; i >= 0; i--) {
            const cookie = fallingCookies[i];
            
            // Update physics
            cookie.velocityY += cookie.gravity;
            cookie.y += cookie.velocityY;
            cookie.rotation += cookie.rotationSpeed;
            
            // Check if hit path or bottom of screen
            const pathCheck = isNearPath(cookie.x, cookie.y, 15);
            let shouldExplode = false;
            let explodeY = cookie.y;
            
            if (pathCheck.nearPath) {
                shouldExplode = true;
                explodeY = pathCheck.pathY;
            } else if (cookie.y >= canvas.height - cookie.radius) {
                shouldExplode = true;
                explodeY = canvas.height;
            }
            
            if (shouldExplode) {
                // Create explosion
                const explosionRadius = 80;
                
                // Visual explosion effect
                for (let j = 0; j < 20; j++) {
                    const angle = (Math.PI * 2 * j) / 20;
                    const speed = 2 + Math.random() * 3;
                    particles.push({
                        x: cookie.x,
                        y: explodeY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 30,
                        maxLife: 30,
                        color: '#FFA500',
                        size: 4 + Math.random() * 4,
                        update: function() {
                            this.x += this.vx;
                            this.y += this.vy;
                            this.life--;
                        },
                        draw: function(ctx) {
                            ctx.fillStyle = this.color;
                            ctx.globalAlpha = this.life / this.maxLife;
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.globalAlpha = 1;
                        },
                        isAlive: function() {
                            return this.life > 0;
                        }
                    });
                }
                
                // Damage all enemies in radius
                for (let enemy of enemies) {
                    const dist = Math.hypot(enemy.x - cookie.x, enemy.y - explodeY);
                    if (dist < explosionRadius) {
                        enemy.takeDamage(60);
                        createExplosion(enemy.x, enemy.y, '#FFA500');
                    }
                }
                
                // Remove cookie
                fallingCookies.splice(i, 1);
            } else {
                // Draw falling cookie
                ctx.save();
                ctx.translate(cookie.x, cookie.y);
                ctx.rotate(cookie.rotation);
                
                // Draw cookie (brown circle with chips)
                ctx.fillStyle = '#D2691E';
                ctx.beginPath();
                ctx.arc(0, 0, cookie.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw chocolate chips
                ctx.fillStyle = '#8B4513';
                for (let j = 0; j < 5; j++) {
                    const angle = (Math.PI * 2 * j) / 5;
                    const chipX = Math.cos(angle) * (cookie.radius * 0.5);
                    const chipY = Math.sin(angle) * (cookie.radius * 0.5);
                    ctx.beginPath();
                    ctx.arc(chipX, chipY, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
            }
        }

        // Update projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];
            if (projectile.update()) {
                projectiles.splice(i, 1);
            } else {
                projectile.draw();
            }
        }
    } else {
        // Game is over - only draw towers and enemies, don't update them
        baseTower.draw();
        for (let i = 0; i < enemies.length; i++) {
            enemies[i].draw();
        }
        for (let i = 0; i < towers.length; i++) {
            towers[i].draw();
        }
        for (let i = 0; i < projectiles.length; i++) {
            projectiles[i].draw();
        }
    }

    // Update flying gunner (always, during and after game)
    updateFlyingGunner();

    // Draw flying gunner after enemies/projectiles for visibility
    drawFlyingGunner();

    // Update particles (always, during and after game)
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].isAlive && !particles[i].isAlive()) {
            particles.splice(i, 1);
        } else {
            particles[i].draw(ctx);
        }
    }

    // Update and draw coins
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].update();
        if (!coins[i].isAlive()) {
            coins.splice(i, 1);
        } else {
            coins[i].draw();
        }
    }

    // Draw tower preview (only during gameplay)
    if (isGameplay && showTowerPreview) {
        const cost = towerStats[selectedTowerType].cost;
        const range = towerStats[selectedTowerType].range;
        
        // Don't show preview if player can't afford it
        if (money < cost) {
            requestAnimationFrame(gameLoop);
            return;
        }
        
        // Check if placement is valid (not overlapping existing tower ranges)
        let isValidPlacement = true;
        for (let tower of towers) {
            const distance = Math.hypot(tower.x - previewX, tower.y - previewY);
            const existingRange = towerStats[tower.type].range;
            if (distance < existingRange) {
                isValidPlacement = false;
                break;
            }
        }
        
        // Draw range circle (red if invalid, faint red if valid)
        if (isValidPlacement) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.05)';
        } else {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(previewX, previewY, range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw X if invalid placement
        if (!isValidPlacement) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
            ctx.lineWidth = 4;
            const xSize = 40;
            ctx.beginPath();
            ctx.moveTo(previewX - xSize, previewY - xSize);
            ctx.lineTo(previewX + xSize, previewY + xSize);
            ctx.moveTo(previewX + xSize, previewY - xSize);
            ctx.lineTo(previewX - xSize, previewY + xSize);
            ctx.stroke();
        }
        
        // Draw tower preview
        if (selectedTowerType === 'gun' && snowTurretImg.complete && snowTurretImg.naturalWidth > 0) {
            // Draw snow turret preview with sprite sheet (cannon + base)
            const cannonW = 377;
            const cannonH = snowTurretImg.height;
            const baseW = snowTurretImg.width - cannonW;
            const baseH = snowTurretImg.height;
            const desiredHeight = 60;
            const scale = desiredHeight / Math.max(baseH, cannonH);

            ctx.save();
            ctx.translate(previewX, previewY);
            ctx.globalAlpha = 0.7;

            // Draw cannon first (behind base)
            const cannonOffsetX = -(cannonW * scale) / 2 - 6 * scale;
            const cannonOffsetY = -(cannonH * scale) * 0.5 - 15;
            ctx.drawImage(
                snowTurretImg,
                0, 0, cannonW, cannonH,
                cannonOffsetX,
                cannonOffsetY,
                cannonW * scale,
                cannonH * scale
            );

            // Draw base on top
            ctx.drawImage(
                snowTurretImg,
                cannonW, 0, baseW, baseH,
                -(baseW * scale) / 2,
                -(baseH * scale) / 2,
                baseW * scale,
                baseH * scale
            );

            ctx.restore();
        } else if (selectedTowerType === 'gingerbread' && cannonImg.complete && cannonImg.naturalWidth > 0) {
            ctx.save();
            ctx.translate(previewX, previewY);
            ctx.scale(-1, 1);
            ctx.globalAlpha = 0.7;
            ctx.drawImage(cannonImg, -25, -25, 50, 50);
            ctx.restore();
        } else if (selectedTowerType === 'bomb' && licoriceImg.complete && licoriceImg.naturalWidth > 0) {
            // Draw licorice launcher preview
            const tubeW = 365;
            const tubeH = licoriceImg.height;
            const baseW = licoriceImg.width - tubeW;
            const baseH = licoriceImg.height;
            const desiredHeight = 60;
            const scale = desiredHeight / Math.max(baseH, tubeH);

            ctx.save();
            ctx.translate(previewX, previewY);
            ctx.globalAlpha = 0.7;

            // Draw base
            ctx.drawImage(
                licoriceImg,
                tubeW, 0, baseW, baseH,
                -(baseW * scale) / 2,
                -(baseH * scale) / 2,
                baseW * scale,
                baseH * scale
            );

            // Draw tube
            const tubeOffsetX = -(tubeW * scale) / 2 - 6 * scale;
            const tubeOffsetY = -(tubeH * scale) * 0.5;
            ctx.drawImage(
                licoriceImg,
                0, 0, tubeW, tubeH,
                tubeOffsetX,
                tubeOffsetY,
                tubeW * scale,
                tubeH * scale
            );

            ctx.restore();
        } else {
            // Fallback: colored circle for other tower types
            ctx.fillStyle = towerStats[selectedTowerType].color;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(previewX, previewY, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    // Check win/lose or wave completion
    if (baseTowerDestroyed) {
        if (gameOverCountdown > 0) gameOverCountdown--;
        else endGame();
    } else if (baseTower.health <= 0) {
        // Fallback guard (should be handled in takeDamage)
        endGame();
    } else if (enemies.length === 0 && enemiesKilled >= totalEnemiesThisWave && !inWorkshop) {
        // Enter workshop phase
        startWorkshop();
    }

    updateUI();
    requestAnimationFrame(gameLoop);
}

// Start game
baseTower = new BaseTower(950, 440);
totalEnemiesThisWave = 5 + wave * 5;
enemiesKilled = 0;
updateUI();
updateEnemyDots();

// Auto-start background music on first user interaction
let musicStarted = false;
function startMusicOnInteraction() {
    if (!musicStarted) {
        themeSong.play().then(() => {
            musicPlaying = true;
            musicStarted = true;
            document.getElementById('musicToggle').textContent = '🔊 Pause Music';
        }).catch(e => console.log('Audio autoplay blocked:', e));
    }
}

// Try to start immediately
startMusicOnInteraction();

// Also start on first click if autoplay was blocked
document.addEventListener('click', startMusicOnInteraction, { once: true });

gameLoop();
