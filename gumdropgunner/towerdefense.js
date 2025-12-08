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

// Preload enemy sprite sheet
const enemyImg = new Image();
enemyImg.src = '/gumdropgunner/mintGuySprite.png';

// Preload gumdrop enemy image
const gumdropEnemyImg = new Image();
gumdropEnemyImg.src = '/gumdropgunner/gumdrop.png';

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

// Game objects
let towers = [];
let enemies = [];
let projectiles = [];
let particles = [];
let baseTower = null;

// Tower costs and stats
const towerStats = {
    gun: { cost: 80, range: 120, damage: 6, fireRate: 30, color: '#4CAF50' },
    laser: { cost: 150, range: 150, damage: 10, fireRate: 20, color: '#FF4081' },
    gingerbread: { cost: 180, range: 140, damage: 12, fireRate: 25, color: '#D2691E' },
    bomb: { cost: 200, range: 100, damage: 20, fireRate: 50, color: '#FFC107' }
};

// Path for enemies (road)
const path = [
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
];

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
        if (this.pathIndex < path.length - 1) {
            const current = path[this.pathIndex];
            const next = path[this.pathIndex + 1];
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const moveDistance = this.speed;

            this.x += (dx / distance) * moveDistance;
            this.y += (dy / distance) * moveDistance;

            const distToNext = Math.hypot(next.x - this.x, next.y - this.y);
            if (distToNext < moveDistance) {
                this.pathIndex++;
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
                ctx.translate(this.x, this.y);
                ctx.drawImage(gumdropEnemyImg, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
                ctx.restore();
            } else {
                // Fallback circle
                ctx.fillStyle = '#FF1493';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Draw mint enemy with sprite animation
            if (enemyImg.complete && enemyImg.naturalWidth > 0) {
                ctx.save();
                ctx.translate(this.x, this.y);
                
                // Sprite sheet has 4 frames, each 420px wide
                const frameWidth = 420;
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
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();

                // Eyes
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x - 5, this.y - 3, 3, 3);
                ctx.fillRect(this.x + 2, this.y - 3, 3, 3);
            }
        }

        // Health bar
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 8, this.radius * 2, 3);
        ctx.fillStyle = '#00FF00';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 8, this.radius * 2 * healthPercent, 3);
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
    }

    update() {
        this.fireCounter++;
        if (this.fireCounter >= this.stats.fireRate) {
            this.fireCounter = 0;
            this.findAndShoot();
        }
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
            this.rotation = Math.atan2(dy, dx);
            
            // Calculate spawn position offset from the left side of cannon
            const offsetDist = 20;
            const spawnX = this.x - Math.cos(this.rotation) * offsetDist;
            const spawnY = this.y - Math.sin(this.rotation) * offsetDist;
            
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
            // Draw snow turret
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.drawImage(snowTurretImg, -25, -25, 50, 50);
            ctx.restore();
        } else if (this.type === 'gingerbread' && cannonImg.complete && cannonImg.naturalWidth > 0) {
            // Draw gingerbread cannon
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation + Math.PI);
            ctx.scale(-1, 1);
            ctx.drawImage(cannonImg, -25, -25, 50, 50);
            ctx.restore();
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
    }

    draw() {
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
            ctx.fillStyle = towerStats[this.type].color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
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
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // gravity
        this.life--;
    }

    draw() {
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(x, y, color));
    }
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
    if (money >= cost) {
        towers.push(new Tower(x, y, selectedTowerType));
        money -= cost;
        updateUI();
    }
}

function spawnEnemy() {
    if (enemies.length < 3 + wave && enemiesSpawned < totalEnemiesThisWave) {
        // Increase gumdrop spawn rate as waves progress
        let gumdropChance = 0.25; // 25% base
        if (wave >= 2) gumdropChance = 0.35; // 35% from wave 2
        if (wave >= 4) gumdropChance = 0.45; // 45% from wave 4
        
        const type = Math.random() < gumdropChance ? 'gumdrop' : 'mint';
        enemies.push(new Enemy(type));
        enemiesSpawned++;
    }
}

function updateUI() {
    document.getElementById('money').textContent = money;
    document.getElementById('lives').textContent = lives;
    document.getElementById('score').textContent = score;
    document.getElementById('enemyCount').textContent = enemies.filter(e => e.isAlive()).length;
    
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

// Canvas click to place towers
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    placeTower(x, y);
});

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
    if (gameOver) {
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
    
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();

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

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        if (projectile.update()) {
            projectiles.splice(i, 1);
        } else {
            projectile.draw();
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    // Draw tower preview
    if (showTowerPreview) {
        const range = towerStats[selectedTowerType].range;
        
        // Draw range circle (faint red)
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(previewX, previewY, range, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw tower preview
        if (selectedTowerType === 'gun' && snowTurretImg.complete && snowTurretImg.naturalWidth > 0) {
            ctx.save();
            ctx.translate(previewX, previewY);
            ctx.globalAlpha = 0.7;
            ctx.drawImage(snowTurretImg, -25, -25, 50, 50);
            ctx.restore();
        } else if (selectedTowerType === 'gingerbread' && cannonImg.complete && cannonImg.naturalWidth > 0) {
            ctx.save();
            ctx.translate(previewX, previewY);
            ctx.scale(-1, 1);
            ctx.globalAlpha = 0.7;
            ctx.drawImage(cannonImg, -25, -25, 50, 50);
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
    if (baseTower.health <= 0) {
        endGame();
    } else if (enemies.length === 0 && enemiesKilled >= totalEnemiesThisWave) {
        // Start next wave
        wave++;
        enemiesSpawned = 0;
        enemiesKilled = 0;
        totalEnemiesThisWave = 5 + wave * 5;
        
        updateEnemyDots();
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
gameLoop();
