class Sprite {
    constructor(img, x, y, width, height) {
        this.img = img;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw(ctx, drawX, drawY, displayWidth, displayHeight) {
        ctx.drawImage(
            this.img,
            this.x, this.y, this.width, this.height,
            drawX, drawY,
            displayWidth, displayHeight
        );
    }
}

class Character {
    static sprite = null;
    static runFrames = [];
    static standingFrame = null;
    static mouthOpenFrame = null;
    static hurtFrame = null;
    static landingFrame = null;

    static load() {
        if (Character.sprite) return;
        Character.sprite = new Image();
        Character.sprite.src = 'images/turtle-sprite.png';
        Character.sprite.onload = () => {
            Character.initFrames();
        };
    }

    static initFrames() {
        // Running frames (4 frames from top row)
        Character.runFrames = [
            new Sprite(Character.sprite, 0, 50, 400, 400),
            new Sprite(Character.sprite, 400, 50, 400, 400),
            new Sprite(Character.sprite, 800, 50, 400, 400),
            new Sprite(Character.sprite, 1200, 50, 400, 400)
        ];
        
        // Special frames from bottom row (y = 580)
        Character.standingFrame = new Sprite(Character.sprite, 0, 580, 400, 400);
        Character.mouthOpenFrame = new Sprite(Character.sprite, 400, 580, 400, 400);
        Character.hurtFrame = new Sprite(Character.sprite, 800, 580, 400, 400);
        Character.landingFrame = new Sprite(Character.sprite, 1200, 580, 400, 400);
    }

    constructor(canvasWidth, canvasHeight, groundLevel) {
        // Character dimensions and position
        this.width = 220;   // Increased size significantly
        this.height = 220;  // Increased size significantly
        this.x = canvasWidth / 2;
        this.y = groundLevel - this.height;  // Align with ground
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = 5;
        this.jumpForce = 18;
        this.isJumping = false;
        this.mouthOpen = false;
        this.hurtCounter = 0;  // Counter for hurt sprite flash duration
        this.canvasWidth = canvasWidth;
        this.groundLevel = groundLevel;

        // Animation properties
        this.currentFrame = 0;  // Current frame in animation
        this.frameCounter = 0;  // Counter for animation timing
        this.frameDelay = 8;    // Delay between frame changes
        this.facingLeft = false;// Track direction character is facing
        this.isMoving = false;  // Track if character is moving
        this.landingCounter = 0; // Counter for landing animation display
        this.wasJumping = false; // Track if jumping in previous frame for landing detection
        this.displayWidth = 220;
        this.displayHeight = 220;
    }

    update(keys, physics) {
        // Mouth open input state
        this.mouthOpen = !!keys.x;
        
        // Decrement hurt counter if active
        if (this.hurtCounter > 0) {
            this.hurtCounter--;
        }
        
        // Horizontal movement
        this.isMoving = false;
        if (keys.left) {
            this.velocityX -= physics.acceleration;
            if (this.velocityX < -physics.maxSpeed) this.velocityX = -physics.maxSpeed;
            this.facingLeft = true;
            this.isMoving = true;
        } else if (keys.right) {
            this.velocityX += physics.acceleration;
            if (this.velocityX > physics.maxSpeed) this.velocityX = physics.maxSpeed;
            this.facingLeft = false;
            this.isMoving = true;
        } else {
            this.velocityX *= physics.friction;
            if (Math.abs(this.velocityX) < 0.1) this.velocityX = 0;
        }

        // Update animation
        if (this.isMoving) {
            this.frameCounter++;
            if (this.frameCounter >= this.frameDelay) {
                this.frameCounter = 0;
                this.currentFrame = (this.currentFrame + 1) % Character.runFrames.length;
            }
        } else {
            this.currentFrame = -1; // Special value to indicate standing frame
        }

        // Jumping
        if (keys.up && !this.isJumping) {
            this.velocityY = -this.jumpForce;
            this.isJumping = true;
        }

        // Apply gravity
        this.velocityY += physics.gravity;

        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Keep character within canvas bounds
        this.x = Math.max(this.width/2, Math.min(this.canvasWidth - this.width/2, this.x));
        
        // Ground collision with bounce
        if (this.y > this.groundLevel - this.height) {
            this.y = this.groundLevel - this.height;
            
            if (this.velocityY > 3) {
                this.velocityY = -this.velocityY * physics.bounceCoefficient;
                this.isJumping = true;
                // Show landing frame when bouncing
                this.landingCounter = 60; // Display landing frame for 1 second (60 frames)
            } else {
                this.velocityY = 0;
                this.isJumping = false;
            }
        }
        
        // Update wasJumping for next frame
        this.wasJumping = this.isJumping;
        
        // Decrement landing counter
        if (this.landingCounter > 0) {
            this.landingCounter--;
        }
    }

    getHurt() {
        this.hurtCounter = 15; // Flash for 15 frames
    }

    draw(ctx) {
        if (!Character.sprite || !Character.sprite.complete) return;
        
        ctx.save();

        // Draw oval shadow under the character (fixed at ground level)
        const ovalWidth = this.width * 0.7;
        const ovalHeight = this.height * 0.18;
        const ovalX = this.x + 5;
        const ovalY = this.groundLevel - 10; // Always at ground level
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(ovalX, ovalY, ovalWidth / 2, ovalHeight / 2, 0, 0, 2 * Math.PI);
        ctx.fillStyle = '#222';
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Adjust drawing position to be centered and properly placed
        const drawX = Math.floor(this.x - this.displayWidth / 2);
        const drawY = Math.floor(this.y);

        // Select which frame to draw
        let frameToUse = null;
        if (this.landingCounter > 0) {
            frameToUse = Character.landingFrame;
        } else if (this.hurtCounter > 0) {
            frameToUse = Character.hurtFrame;
        } else if (this.mouthOpen) {
            frameToUse = Character.mouthOpenFrame;
        } else if (this.currentFrame === -1) {
            frameToUse = Character.standingFrame;
        } else {
            frameToUse = Character.runFrames[this.currentFrame];
        }

        // If facing left, flip the context
        if (this.facingLeft) {
            ctx.translate(drawX + this.displayWidth, drawY);
            ctx.scale(-1, 1);
            frameToUse.draw(ctx, 0, 0, this.displayWidth, this.displayHeight);
        } else {
            frameToUse.draw(ctx, drawX, drawY, this.displayWidth, this.displayHeight);
        }

        ctx.restore();
    }
}

export default Character;