import Bomb from './entities/Bomb.js';
import MouseTrap from './entities/MouseTrap.js';
import Tramp from './entities/Tramp.js';
import Actor from './entities/Actor.js';
import Character from './entities/Character.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc, collection, query, orderBy, limit, getDocs, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const GRAVITY = 2000; // px/s^2
const STAGE_HEIGHT = 55; // height of stage area at bottom
const MIN_HOLE_IMPACT_VY = 600; // minimum downward velocity to punch a stage hole
const MAX_BOMBS = 6; // bomb limit per level
let lastTime = null;
const falling = new Set();
const particles = new Set();
const holes = new Set(); // track holes in the stage
const actors = new Set(); // track actors on stage
const props = new Set(); // stage props (e.g., lamp)
const platforms = new Set(); // floating platforms
const pixelSpots = new Set(); // hidden pixel spots for treasure hunt
let sky, character, leftBtn, rightBtn, dropBtn, statsText, scoreText, bombIconsEl, weaponQueueEl;
let leftDown = false, rightDown = false;
let charX = 250; // center of screen
let charVelocity = 0; // character horizontal velocity
let charY = 33; // character Y position
let canvas, ctx, bgImg, bgLoaded = false, bombImg, bombImgLoaded = false, lampImg, lampImgLoaded = false, platImg, platImgLoaded = false, mouseTrapImg, mouseTrapImgLoaded = false, trampImg, trampImgLoaded = false, ladyRestingImg, ladyRestingImgLoaded = false, ladyScreamSound, bombHitSound;
let lampAspect = 0.6; // fallback aspect until image loads
let platAspect = 1.0; // fallback aspect for platforms
let bombsLeft = MAX_BOMBS;
let weaponQueue = []; // queue of weapon types: 'bomb', 'mousetrap', or 'tramp'
let currentLevel = 1;
let gameFailed = false;
let lastBombDropTime = 0;
let lastBombSettleTime = 0; // time when the most recent bomb settled (landed or fell off-screen)
let score = 0;
let charAnimFrame = 0;
let charAnimTime = 0;
let charLastDir = 1; // 1 for right, -1 for left
let charFalling = false;
let charFallVy = 0;
let charFallRotation = 0;
let charSplat = false;
let charSplatTime = 0;
let charLandingStarted = false;
let gameWon = false;
let levelStartTime = 0; // Track when level starts for time-based scoring
let player = null; // Character instance (mirrors existing char* vars)
let levelData = null; // Current level configuration from Firestore
let levelsCache = {}; // Cache all levels
const LEVEL_STARS_KEY = 'monsterOpera_levelStars';
const TEST_MODE_KEY = 'monsterOpera_testMode';
let testMode = false; // Test mode flag
let tutorialOverlay = null;
let tutorialTrapEl = null;
let tutorialTimeout = null;
let tutorialStylesInjected = false;
let tutorialPhase = 0; // 0=none, 1=movement, 2=drop
let tutorialMovementTime = 0;
let tutorialMovementStarted = false;
const LEVEL_TIMES_KEY = 'monsterOpera_levelTimes';
const LEVEL_WEAPONS_KEY = 'monsterOpera_levelWeapons';
let totalLevels = 0;

function createFalling(x){
  if(weaponQueue.length === 0) return; // don't create weapon if out of weapons
  
  const weaponType = weaponQueue.shift(); // remove first weapon from queue
  let obj;
  
  if(weaponType === 'mousetrap'){
    obj = new MouseTrap(x);
    if(currentLevel === 1 && tutorialPhase > 0){
      localStorage.setItem('mo_tutorial_seen', '1');
      hideLevel1Tutorial();
      tutorialPhase = 0;
    }
  } else if(weaponType === 'tramp'){
    obj = new Tramp(x);
    if(currentLevel === 1 && tutorialPhase > 0){
      localStorage.setItem('mo_tutorial_seen', '1');
      hideLevel1Tutorial();
      tutorialPhase = 0;
    }
  } else {
    obj = new Bomb(x);
  }
  
  falling.add(obj);
  lastBombDropTime = Date.now(); // record when weapon was dropped
  if(statsText) updateStatsDisplay();
}

function spawnSparks(obj){
  // Spawn 2-3 sparks from top of bomb
  const numSparks = Math.floor(Math.random() * 2) + 2;
  for(let i = 0; i < numSparks; i++){
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 150 + 100;
    const particle = {
      x: obj.x,
      y: obj.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100, // bias upward
      life: 0.6, // lifetime in seconds
      maxLife: 0.6
    };
    particles.add(particle);
  }
}

function spawnDebris(obj, count = 8){
  // Spawn debris particles when bomb or actor lands (scattered outward)
  const numDebris = count;
  for(let i = 0; i < numDebris; i++){
    const angle = (i / numDebris) * Math.PI * 2; // spread evenly in circle
    const speed = Math.random() * 500 + 400; // increased speed
    const size = Math.random() * 6 + 4; // vary size from 4 to 10
    const particle = {
      x: obj.x,
      y: obj.y - 50, // spawn higher up
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.3 - 400, // increased upward bias
      life: 1.2, // increased lifetime
      maxLife: 1.2,
      isDebris: true,
      color: ['#8B4513', '#A0522D', '#6B4423'][Math.floor(Math.random() * 3)], // brown shades for stage
      rotation: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 20, // rotation speed in rad/s
      size: size
    };
    particles.add(particle);
  }
}

function spawnDecorativeSpark(){
  // Spawn gentle falling decorative sparks from below the character platform
  const sparksY = 140; // below where the character walks
  const x = Math.random() * sky.clientWidth;
  const stageTop = sky.clientHeight - STAGE_HEIGHT - 35;
  const distanceToStage = stageTop - sparksY;
  // Calculate lifetime so sparks reach the stage (distance / speed = time)
  const fallSpeed = Math.random() * 3 + 2; // 2-5 px/s fall speed (slower)
  const lifetime = (distanceToStage / fallSpeed) + 1; // +1 second buffer
  
  const particle = {
    x: x,
    y: sparksY,
    vx: 0, // will be set by sine wave
    vy: fallSpeed, // fall speed in px/s
    life: lifetime,
    maxLife: lifetime,
    isDecorativeSpark: true,
    opacity: Math.random() * 0.4 + 0.3, // 0.3-0.7 opacity
    size: Math.random() * 1 + 0.5, // 0.5-1.5px (smaller)
    swingPhase: Math.random() * Math.PI * 2, // random starting phase for swing
    swingSpeed: Math.random() * 1.5 + 1, // 1-2.5 rad/s swing frequency
    swingAmplitude: Math.random() * 12 + 8 // 8-20 px swing width (more subtle)
  };
  particles.add(particle);
}

let lastDecorativeSparkTime = 0;

function updateObjects(dt){
  const skyHeight = sky.clientHeight;
  const stageTop = skyHeight - STAGE_HEIGHT - 35;
  
  for(const obj of Array.from(falling)){
    const isBomb = obj.type !== 'mousetrap' && obj.type !== 'tramp';
    const isMouseTrap = obj.type === 'mousetrap';
    const isTramp = obj.type === 'tramp';
    
    if(!obj.resting && isBomb) spawnSparks(obj); // only bombs spawn sparks
    if(obj.resting){
      if(isBomb){
        obj.animationTime += dt; // advance smoke animation
        // Remove bomb after smoke animation completes (10 frames * 0.08s = 0.8s)
        if(obj.animationTime >= 0.8){
          falling.delete(obj);
        }
      } else if(isMouseTrap){
        // Check if mousetrap still has a platform underneath it (only if not on stage)
        const trapBottom = obj.y + obj.h - 20; // account for sprite padding
        const onStage = trapBottom >= stageTop - 10; // check if on stage (with tolerance)
        
        if(onStage){
          // On stage - don't do anything, just rest
        } else {
          // Only check for platforms if not the stage
          let hasPlatformBelow = false;
          const trapCenterX = obj.x + obj.w / 2;
          
          for(const plat of platforms){
            const platRight = plat.x + plat.w;
            // Check if trap center is over this platform and trap bottom is near platform top
            if(trapCenterX > plat.x && trapCenterX < platRight && Math.abs(trapBottom - plat.y) < 5){
              hasPlatformBelow = true;
              break;
            }
          }
          
          // If platform was destroyed, start falling again
          if(!hasPlatformBelow){
            obj.resting = false;
            obj.vy = 50; // give it some initial downward velocity
          }
        }
      } else if(isTramp){
        // Tramp stays resting on stage once landed
        // Check if any actor is landing on it
        const trampCenterX = obj.x + obj.w / 2;
        const trampTop = obj.y;
        
        for(const actor of actors){
          const actorCenterX = actor.x + actor.w / 2;
          const actorBottom = actor.y + actor.h;
          
          // Check if actor is overlapping horizontally with tramp
          const actorRight = actor.x + actor.w;
          const trampRight = obj.x + obj.w;
          const overlappingHorizontally = actor.x < trampRight && actorRight > obj.x;
          
          // Check if actor is at approximately the same height as tramp (within tolerance)
          const atTrampLevel = actorBottom >= trampTop - 10 && actorBottom <= trampTop + 20;
          
          if(overlappingHorizontally && atTrampLevel){
            // Actor hits tramp from any angle - bounce them sideways and up
            const bounceHeight = 850; // moderate bounce height
            const horizontalBoost = actor.vx < 0 ? -1900 : 1900; // much stronger sideways boost based on travel direction
            actor.vy = -bounceHeight;
            actor.vx = horizontalBoost;
          }
        }
      }
      continue;
    }
    obj.vy += GRAVITY * dt;
    obj.y += obj.vy * dt;
    obj.rotation += obj.angularVelocity * dt; // spin the weapon
    const bottom = obj.y + obj.h;
    
    // Check for collision with platforms (only bombs destroy platforms)
    if(obj.vy > 0 && isBomb){
      for(const plat of Array.from(platforms)){
        const bombRight = obj.x + obj.w;
        const platRight = plat.x + plat.w;
        const platBottom = plat.y + plat.h;
        // Check if bomb is falling onto platform
        if(obj.x < platRight && bombRight > plat.x && obj.y < platBottom && bottom > plat.y && bottom - obj.vy * 0.016 <= plat.y){
          // Make actors on this platform jump before destroying it
          const bombCenterX = obj.x + obj.w / 2;
          for(const actor of actors){
            const actorCenterX = actor.x + actor.w / 2;
            const onThisPlat = actorCenterX > plat.x && actorCenterX < plat.x + plat.w;
            if(onThisPlat){
              actor.vy = -600; // jump upward
              // Push actor away from bomb impact
              actor.vx = bombCenterX < actorCenterX ? 400 : -400;
            }
          }
          // Bomb hits platform from above - destroy it
          platforms.delete(plat);
          spawnDebris(obj); // spawn debris from platform destruction
          // Play bomb hit sound on platform impact
          if(bombHitSound){
            const sound = bombHitSound.cloneNode();
            sound.volume = bombHitSound.volume;
            sound.play().catch(e => console.log('Audio play failed:', e));
          }
          // Remove the bomb immediately after destroying platform
          obj.resting = true;
          obj.animationTime = 0.8; // Set to end of animation so it gets removed immediately
          break;
        }
      }
    }
    
    // Mousetraps bounce on platforms without destroying them
    if(obj.vy > 0 && isMouseTrap){
      for(const plat of Array.from(platforms)){
        const trapRight = obj.x + obj.w;
        const platRight = plat.x + plat.w;
        const platBottom = plat.y + plat.h;
        // Check if mousetrap is falling onto platform
        if(obj.x < platRight && trapRight > plat.x && obj.y < platBottom && bottom > plat.y && bottom - obj.vy * 0.016 <= plat.y){
          // Mousetrap lands on platform - adjust for sprite padding
          obj.y = plat.y - obj.h + 20; // add 20px offset to account for transparent padding in sprite
          obj.vy = 0;
          obj.resting = true;
          lastBombSettleTime = Date.now();
          // Make actors on this platform jump when trap lands
          const trapCenterX = obj.x + obj.w / 2;
          for(const actor of actors){
            const actorCenterX = actor.x + actor.w / 2;
            const onThisPlat = actorCenterX > plat.x && actorCenterX < plat.x + plat.w;
            if(onThisPlat){
              actor.vy = -600; // jump upward
              // Push actor away from trap impact
              actor.vx = trapCenterX < actorCenterX ? 400 : -400;
            }
          }
          break;
        }
      }
    }
    
    // Tramps land on platforms without destroying them
    if(obj.vy > 0 && isTramp){
      for(const plat of Array.from(platforms)){
        const trampRight = obj.x + obj.w;
        const platRight = plat.x + plat.w;
        const platBottom = plat.y + plat.h;
        // Check if tramp is falling onto platform
        if(obj.x < platRight && trampRight > plat.x && obj.y < platBottom && bottom > plat.y && bottom - obj.vy * 0.016 <= plat.y){
          // Tramp lands flat on platform
          obj.y = plat.y - obj.h;
          obj.vy = 0;
          obj.resting = true;
          obj.rotation = 0; // land flat
          lastBombSettleTime = Date.now();
          break;
        }
      }
    }
    
    // Check for collision with lamps before hitting the stage (only if falling down and not recently bounced)
    if(!obj.bounced && obj.vy > 0){
      for(const lamp of props){
        if(lamp.type === 'lamp'){
          const inset = 14; // tighter lamp hitbox for falling weapons
          const bombRight = obj.x + obj.w;
          const lampLeft = lamp.x + inset;
          const lampRight = lamp.x + lamp.w - inset;
          const lampTop = lamp.y + inset;
          const lampBottom = lamp.y + lamp.h - inset;
          // Check if bomb overlaps (tighter box)
          if(obj.x < lampRight && bombRight > lampLeft && obj.y < lampBottom && bottom > lampTop){
            // Bounce away from lamp based on hit position (deterministic)
            const objCenterX = obj.x + obj.w / 2;
            const lampCenterX = lamp.x + lamp.w / 2;
            const direction = objCenterX < lampCenterX ? -1 : 1; // left hit goes left, right hit goes right
            const baseSpeed = 520;
            obj.vx = direction * baseSpeed;
            obj.vy = obj.vy * -0.65; // reverse and reduce vertical velocity
            obj.angularVelocity = direction * 10; // consistent spin direction
            obj.bounced = true; // prevent re-bouncing immediately
            // Push bomb out of collision zone
            if(direction > 0){
              obj.x = lampRight + 2;
            } else {
              obj.x = lampLeft - obj.w - 2;
            }
            break; // only bounce once per frame
          }
        }
      }
    }
    
    // Apply horizontal velocity if bomb has bounced
    if(obj.vx){
      obj.x += obj.vx * dt;
      obj.vx *= 0.95; // air resistance
    }
    
    // Check if bomb is falling through a hole
    let inHole = false;
    for(const hole of holes){
      if(obj.x > hole.x && obj.x < hole.x + hole.w && bottom > hole.y){
        inHole = true;
        break;
      }
    }
    
    if(!inHole && bottom >= stageTop){
      // Position weapons consistently when hitting stage
      if(isMouseTrap){
        obj.y = stageTop - obj.h + 20;
      } else if(isTramp){
        obj.y = stageTop - obj.h + 10;
      } else {
        obj.y = stageTop - obj.h;
      }
      
      if(isMouseTrap && !obj.hasBounced){
        // Mousetrap bounces a little on first impact and triggers actor reactions
        obj.vy = -150; // small upward bounce
        obj.hasBounced = true;
        
        // Immediately affect nearby actors on impact
        for(const actor of actors){
          const actorCenter = actor.x + actor.w / 2;
          const distance = Math.abs(obj.x - actorCenter);
          const maxDistance = 200; // distance where push becomes minimal
          const maxVelocity = 900; // maximum push velocity
          
          // Calculate push force based on distance (closer = stronger)
          const pushForce = maxVelocity * Math.max(0, 1 - (distance / maxDistance));
          
          // Only affect actors if close enough (pushForce > 0)
          if(pushForce > 0){
            if(obj.x < actorCenter){
              // Weapon on left, push actor right
              actor.vx = pushForce;
            }else{
              // Weapon on right, push actor left
              actor.vx = -pushForce;
            }
            
            // Make nearby actors jump (scared reaction) based on distance
            const jumpForce = 700 * (1 - (distance / maxDistance));
            actor.vy = -jumpForce;
          }
        }
      } else if(isMouseTrap && obj.hasBounced){
        // After bounce, rest the mousetrap
        obj.vy = 0;
        obj.resting = true;
        lastBombSettleTime = Date.now();
      } else if(isTramp && !obj.hasBounced){
        // Tramp lands flat on stage - settle immediately
        obj.vy = 0;
        obj.resting = true;
        obj.rotation = 0;
        obj.hasBounced = true;
        lastBombSettleTime = Date.now();
      } else if(isBomb) {
        obj.vy = 0;
        obj.resting = true;
        // Play bomb hit sound on first contact with stage
        if(bombHitSound){
          const sound = bombHitSound.cloneNode();
          sound.volume = bombHitSound.volume;
          sound.play().catch(e => console.log('Audio play failed:', e));
        }
        // mark settle time when the weapon lands on the stage
        lastBombSettleTime = Date.now();
      }
      
      if(isBomb && obj.resting){
        // Bombs create holes and spawn debris
        spawnDebris(obj); // spawn debris particles on impact
        // Create hole in stage - position hole at top of stage
        const newHole = {x: obj.x - 53.5, y: stageTop, w: 107, h: 117};
        holes.add(newHole);
        console.log('Created hole at', newHole.x, newHole.y, 'Total holes:', holes.size);
        
        // Destroy nearby mousetraps
        const explosionRadius = 200;
        for(const mousetrap of Array.from(falling)){
          if(mousetrap.type === 'mousetrap'){
            const trapDistance = Math.abs(mousetrap.x - obj.x);
            if(trapDistance < explosionRadius){
              falling.delete(mousetrap);
            }
          }
        }
      }
      
      // Push actors from bombs based on weapon position (only when bomb settles)
      if(isBomb && obj.resting){
        for(const actor of actors){
          const actorCenter = actor.x + actor.w / 2;
          const distance = Math.abs(obj.x - actorCenter);
          const maxDistance = 200; // distance where push becomes minimal
          const maxVelocity = 900; // maximum push velocity
          
          // Calculate push force based on distance (closer = stronger)
          const pushForce = maxVelocity * Math.max(0, 1 - (distance / maxDistance));
          
          // Only affect actors if close enough (pushForce > 0)
          if(pushForce > 0){
            if(obj.x < actorCenter){
              // Weapon on left, push actor right
              actor.vx = pushForce;
            }else{
              // Weapon on right, push actor left
              actor.vx = -pushForce;
            }
          }
        }
      }
    }

    // If the bomb fell through a hole and dropped off-screen, remove it and
    // record the settle time so failure check can proceed.
    if(inHole && obj.y > skyHeight + 150){
      falling.delete(obj);
      lastBombSettleTime = Date.now();
      continue;
    }
  }
  
  // Update particles
  for(const p of Array.from(particles)){
    p.life -= dt;
    if(p.life <= 0){
      particles.delete(p);
      continue;
    }
    if(p.isDecorativeSpark){
      // Decorative sparks fall gently and swing side to side
      p.swingPhase += p.swingSpeed * dt;
      p.vx = Math.sin(p.swingPhase) * p.swingAmplitude;
      p.vy += 2 * dt; // very gentle fall acceleration (slower)
    } else {
      p.vx *= 0.95; // air resistance
      p.vy += GRAVITY * dt * 0.5; // lighter gravity for particles
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if(p.isDebris && p.angularVelocity){
      p.rotation += p.angularVelocity * dt; // rotate debris particles
    }

    // Debris bounces on the stage before settling
    if(p.isDebris){
      const stageTop = skyHeight - STAGE_HEIGHT - 35;
      if(p.y >= stageTop){
        p.y = stageTop;
        // Simple bounce with energy loss; stop if slow
        if(Math.abs(p.vy) > 120){
          p.vy = -p.vy * 0.35;
          p.vx *= 0.6;
        } else {
          p.vy = 0;
          p.vx *= 0.5;
        }
      }
    }
  }
  
  // Spawn decorative sparks periodically
  lastDecorativeSparkTime += dt;
  if(lastDecorativeSparkTime > 0.6){ // spawn every 0.6 seconds (more subtle)
    spawnDecorativeSpark();
    lastDecorativeSparkTime = 0;
  }
  
  // Update actors
  for(const actor of Array.from(actors)){
    if(actor.createdHole === undefined) actor.createdHole = false;
    if(actor.hasLandedInitially === undefined) actor.hasLandedInitially = false;
    if(actor.hasFallenThroughHole === undefined) actor.hasFallenThroughHole = false;
    
    // Update animation for lady actors
    if(actor.isLady && actor.animationFrames > 1){
      actor.animationTime += dt;
      const frameTime = 1.0 / actor.animationSpeed;
      if(actor.animationTime >= frameTime){
        actor.animationTime -= frameTime;
        // Cycle through 8 steps: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 0...
        actor.animationStep = (actor.animationStep + 1) % 8;
        // Map to frame sequence [0,1,2,3,4,3,2,1]: frame = 4 - |4 - step|
        actor.currentFrame = 4 - Math.abs(4 - actor.animationStep);
      }
    }
    
    actor.vy += GRAVITY * dt;
    actor.x += actor.vx * dt;
    actor.y += actor.vy * dt;
    actor.vx *= 0.9; // friction
    
    // Check if actor is on a floating platform
    let isOnPlatform = false;
    for(const plat of platforms){
      const actorBottom = actor.y + actor.h;
      // Platform collision offset - accounts for empty space at top of platform sprite
      const platCollisionOffset = 20;
      const platTop = plat.y + platCollisionOffset;
      const platBottom = plat.y + plat.h;
      const platLeft = plat.x;
      const platRight = plat.x + plat.w;
      // Actor standing on platform? (increased tolerance to 20px for better collision)
      if(actor.vy >= 0 && actorBottom >= platTop && actorBottom <= platTop + 20 &&
         actor.x + actor.w / 2 > platLeft && actor.x + actor.w / 2 < platRight){
        actor.y = platTop - actor.h;
        actor.vy = 0;
        isOnPlatform = true;
        actor.hasLandedInitially = true;
        break;
      }
    }
    
    // Keep actor on stage or let fall through holes
    let isOverHole = false;
    if(!isOnPlatform){
      for(const hole of holes){
        if(actor.x + actor.w / 2 > hole.x && actor.x + actor.w / 2 < hole.x + hole.w){
          isOverHole = true;
          break;
        }
      }
      
      // Check if actor falls off left or right edge (40px gap)
      const leftEdge = 40;
      const rightEdge = sky.clientWidth - 40;
      if(actor.x + actor.w / 2 < leftEdge || actor.x + actor.w / 2 > rightEdge){
        // Actor is off the edge, let it fall
        isOverHole = true;
      }

      // If actor impacts the stage after having settled, cut a hole and let them fall through
      const actorBottom = actor.y + actor.h;
      const holeCreationUnlocked = (Date.now() - levelStartTime) > 1500; // wait for initial settle
      const impactVy = actor.vy;
      if(holeCreationUnlocked && actor.hasLandedInitially && impactVy >= MIN_HOLE_IMPACT_VY && !isOverHole && actorBottom >= stageTop){
        const holeW = 107;
        const holeH = 117;
        const centerX = actor.x + actor.w / 2;
        const clampedX = Math.max(0, Math.min(centerX - holeW / 2, sky.clientWidth - holeW));
        holes.add({ x: clampedX, y: stageTop, w: holeW, h: holeH });
        // Kick up debris like a bomb impact
        spawnDebris({ x: centerX, y: stageTop }, 14);
        actor.createdHole = true;
        isOverHole = true; // allow this and following actors to fall through
      }
    }
    
    const actorBottom = actor.y + actor.h;
    // Only snap to stage if actor is not over a hole AND is falling down towards it (not already below it)
    if(!isOverHole && actorBottom >= stageTop && actorBottom < stageTop + 50){
      actor.y = stageTop - actor.h;
      actor.vy = 0;
      actor.hasLandedInitially = true;
    } else if(isOverHole && !actor.hasFallenThroughHole && actor.isLady && actorBottom > stageTop){
      // Lady actor is falling through hole for first time
      actor.hasFallenThroughHole = true;
      if(ladyScreamSound){
        const sound = ladyScreamSound.cloneNode();
        sound.volume = 0.7;
        sound.play().catch(e => console.log('Audio play failed:', e));
      }
    }
    
    // Prop collisions: bounce back horizontally when bumping into props (or upward for trampolines)
    for(const prop of props){
      const inset = prop.type === 'lamp' ? 8 : 0; // lamps get a tighter hitbox
      const ax1 = actor.x, ay1 = actor.y, ax2 = actor.x + actor.w, ay2 = actor.y + actor.h;
      const px1 = prop.x + inset, py1 = prop.y + inset, px2 = prop.x + prop.w - inset, py2 = prop.y + prop.h - inset;
      const overlap = ax1 < px2 && ax2 > px1 && ay1 < py2 && ay2 > py1;
      if(overlap){
        const actorCenterX = actor.x + actor.w / 2;
        const propCenterX = prop.x + prop.w / 2;
        
        if(prop.type === 'tramp'){
          // Tramp bounce: launch actor upward and sideways based on direction of travel
          actor.vy = -850;
          actor.vx = actor.vx > 0 ? 1900 : -1900;
        } else {
          // Other props: bounce back horizontally
          const bounce = 250; // small bounce impulse
          if(actorCenterX < propCenterX){
            // Bumped into left side of prop: push left
            actor.x = Math.min(actor.x, px1 - actor.w);
            actor.vx = -Math.abs(actor.vx) - bounce;
          } else {
            // Bumped into right side of prop: push right
            actor.x = Math.max(actor.x, px2);
            actor.vx = Math.abs(actor.vx) + bounce;
          }
        }
      }
    }
    
    // Actor-to-actor collisions: push actors apart when they collide
    for(const other of Array.from(actors)){
      if(actor === other) continue; // skip self
      const ax1 = actor.x, ay1 = actor.y, ax2 = actor.x + actor.w, ay2 = actor.y + actor.h;
      const ox1 = other.x, oy1 = other.y, ox2 = other.x + other.w, oy2 = other.y + other.h;
      const overlap = ax1 < ox2 && ax2 > ox1 && ay1 < oy2 && ay2 > oy1;
      if(overlap){
        const actorCenterX = actor.x + actor.w / 2;
        const otherCenterX = other.x + other.w / 2;
        const pushForce = 80; // gentle push impulse
        if(actorCenterX < otherCenterX){
          // Actor on left side: push left, push other right
          actor.vx = -Math.abs(actor.vx) - pushForce;
          other.vx = Math.abs(other.vx) + pushForce;
        } else {
          // Actor on right side: push right, push other left
          actor.vx = Math.abs(actor.vx) + pushForce;
          other.vx = -Math.abs(other.vx) - pushForce;
        }
      }
    }
    
    // Remove actor if it falls too far below stage
    if(actor.y > sky.clientHeight + 100){
      score += 100;
      updateScoreDisplay();
      actors.delete(actor);
    }
  }
}

function updateChar(dt){
  const accel = 1200; // acceleration px/s^2
  const friction = 300; // friction px/s^2 (deceleration when no key pressed)
  const maxSpeed = 320; // max speed px/s
  
  // Apply acceleration based on input
  if(leftDown) charVelocity = Math.max(charVelocity - accel * dt, -maxSpeed);
  else if(rightDown) charVelocity = Math.min(charVelocity + accel * dt, maxSpeed);
  else {
    // Apply friction when no key is pressed
    if(charVelocity > 0) charVelocity = Math.max(0, charVelocity - friction * dt);
    else if(charVelocity < 0) charVelocity = Math.min(0, charVelocity + friction * dt);
  }
  
  // Update position based on velocity
  charX += charVelocity * dt;
  
  // Allow character to fall off edges (100px gaps on left and right)
  const bounds = sky.clientWidth;
  const charWidth = 75; // character sprite width
  const leftEdge = 100;
  const rightEdge = bounds - 100;
  const stageTop = sky.clientHeight - STAGE_HEIGHT - 35;
  
  // Check if in gaps and start falling
  if((charX < leftEdge || charX > rightEdge) && !charFalling && !charLandingStarted){
    charFalling = true;
    charFallVy = 0;
    charFallRotation = 0;
  }
  
  // Apply falling physics
  if(charFalling){
    charFallVy += GRAVITY * dt;
    charY = (charY || 18) + charFallVy * dt; // 18 is standing Y position
    charFallRotation += 10 * dt; // rotate while falling
    charVelocity *= 0.95; // air friction
    
    // Check if back on stage (landed)
    if(charY >= stageTop - 100 && !charLandingStarted){
      charFalling = false;
      charLandingStarted = true;
      charY = stageTop; // Lock at stage level
      charFallVy = 0;
      charFallRotation = 0;
      // Start splat animation
      charSplat = true;
      charSplatTime = 0;
      // Spawn smoke poof at landing position
      for(let i = 0; i < 5; i++){
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 300 + 200;
        const particle = {
          x: charX,
          y: stageTop - 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 400,
          life: 0.8,
          maxLife: 0.8
        };
        particles.add(particle);
      }
    }
  }else{
    // Normal clamping when not falling - allow movement up to edge
    if(charX < leftEdge) charX = leftEdge;
    if(charX > rightEdge) charX = rightEdge;
  }
  
  // Keep charY locked at stage level when splat is showing
  if(charSplat){
    charY = stageTop;
  }
  
  // Only update DOM position when not falling (we draw on canvas when falling)
  if(!charFalling){
    character.style.left = `${charX - charWidth/2}px`;
  }

  // Keep Character class instance in sync (non-breaking refactor step)
  if(player){
    player.x = charX;
    player.y = charY;
    player.velocity = charVelocity;
    player.animFrame = charAnimFrame;
    player.animTime = charAnimTime;
    player.lastDir = charLastDir;
    player.falling = charFalling;
    player.fallVy = charFallVy;
    player.fallRotation = charFallRotation;
    player.splat = charSplat;
    player.splatTime = charSplatTime;
    player.landingStarted = charLandingStarted;
  }
  
  // Track movement for tutorial phase 1
  if(tutorialPhase === 1 && (leftDown || rightDown)){
    if(!tutorialMovementStarted){
      tutorialMovementStarted = true;
      tutorialMovementTime = 0;
    }
    tutorialMovementTime += dt;
    // After 1.5 seconds of movement, advance to drop tutorial
    if(tutorialMovementTime >= 1.5){
      tutorialPhase = 2;
      showLevel1DropTutorial();
    }
  }
}

function drawBackground(dt){
  if(!bgLoaded) return;
  const w = sky.clientWidth;
  const h = sky.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw background sprite
  const sx = 100;
  const sy = 0;
  const sHeight = 497;
  const sWidth = Math.max(1, bgImg.width - sx);
  try{
    ctx.drawImage(bgImg, sx, sy, sWidth, sHeight, 0, 0, w, h);
  }catch(e){
    ctx.fillStyle = '#6cc';
    ctx.fillRect(0, 0, w, h);
  }
  
  // Draw splat sprite first if character has landed
  const stageTop = h - STAGE_HEIGHT - 35;
  if(charSplat){
    try{
      // Splat sprite: x:25-195 (170px wide), y:950-997 (47px tall)
      const splatW = 170;
      const splatH = 47;
      const splatScreenX = charX - splatW / 2;
      const splatScreenY = stageTop - splatH; // Position at stage level
      ctx.drawImage(bgImg, 25, 950, splatW, splatH, splatScreenX, splatScreenY, splatW, splatH);
    }catch(e){
      // fallback
    }
  }
  
  // Draw holes right after background
  // Draw character sprite with walking animation
  try{
    let charSpriteX, charSpriteY, charFrameWidth, charFrameHeight;
    const charScreenY = (charFalling || charSplat) ? charY : 33;
    
    if(charSplat){
      // Draw splat sprite instead of character
      // Splat will be drawn below
    }else if(charFalling){
      // Falling - rotate standing sprite
      charSpriteX = 0;
      charSpriteY = 255;
      charFrameWidth = 75;
      charFrameHeight = 100;
      
      const charScreenX = charX - 75 / 2;
      ctx.save();
      ctx.translate(charScreenX + 37.5, charScreenY + 50);
      ctx.rotate(charFallRotation);
      ctx.drawImage(bgImg, charSpriteX, charSpriteY, charFrameWidth, charFrameHeight, -37.5, -50, 75, 100);
      ctx.restore();
    }else if(charVelocity !== 0){
      // Walking frames: right at y:723-819, left at y:837-933, x: 26, 76, 126, 176 (50px each)
      charFrameWidth = 56;
      charFrameHeight = 96; // 819 - 723
      charLastDir = charVelocity > 0 ? 1 : -1; // update direction
      charSpriteX = 26 + charAnimFrame * charFrameWidth;
      charSpriteY = charLastDir === 1 ? 723 : 837;
      
      // Update animation
      charAnimTime += 0.016; // ~60fps
      if(charAnimTime > 0.1){ // change frame every 100ms
        charAnimFrame = (charAnimFrame + 1) % 4;
        charAnimTime = 0;
      }
      
      const charScreenX = charX - 75 / 2;
      if(charVelocity !== 0){
        // Draw walking sprite at correct size (50x96)
        ctx.drawImage(bgImg, charSpriteX, charSpriteY, charFrameWidth, charFrameHeight, charScreenX - 12.5, charScreenY, 50, 96);
      }
    }else{
      // Idle - standing still facing forward (original sprite)
      charSpriteX = 0;
      charSpriteY = 255;
      charFrameWidth = 75;
      charFrameHeight = 100;
      charAnimFrame = 0; // reset animation
      charAnimTime = 0;
      
      const charScreenX = charX - 75 / 2;
      // Draw standing sprite (75x100) - centered relative to walking sprite
      ctx.drawImage(bgImg, charSpriteX, charSpriteY, charFrameWidth, charFrameHeight, charScreenX - 25, charScreenY, 75, 100);
    }
  }catch(e){
    // fallback: draw placeholder rect if sprite fails
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(charX - 30, 18, 60, 100);
  }
  
  // Draw splat sprite when character lands
  if(charSplat){
    // Show modal after a brief delay to see the splat animation
    charSplatTime += dt;
    console.log('charSplat:', charSplatTime, 'gameFailed:', gameFailed, 'gameWon:', gameWon, 'actors:', actors.size, 'bombsLeft:', bombsLeft);
    if(charSplatTime > 0.3 && !gameWon){
      console.log('Landing check: actors.size =', actors.size);
      if(actors.size > 0){
        gameFailed = true;
        console.log('Setting gameFailed=true, showing failure screen');
        showFailureScreen();
      } else {
        // All actors are gone, so it's a win!
        gameWon = true;
        console.log('All actors defeated, showing success screen');
        showSuccessScreen();
      }
    }
  }
  
  // Draw holes first (they go behind)
  for(const hole of holes){
    try{
      ctx.drawImage(bgImg, 306, 733, 107, 117, hole.x, hole.y - 17, hole.w, hole.h);
    }catch(e){
      ctx.fillStyle = '#f0f';
      ctx.fillRect(hole.x, hole.y - 17, hole.w, hole.h);
    }
  }
  
  // Draw falling objects (bombs and mousetraps) and smoke animations - drawn after holes so they appear in front
  for(const obj of falling){
    const isBomb = obj.type !== 'mousetrap' && obj.type !== 'tramp';
    const isMouseTrap = obj.type === 'mousetrap';
    const isTramp = obj.type === 'tramp';
    
    if(obj.resting){
      // Draw smoke animation (only for bombs)
      if(isBomb){
        try{
          const frameIndex = Math.floor(obj.animationTime / 0.08) % 10; // 10 frames at 80ms each
          const smokeX = frameIndex * 100;
          const smokeY = 598;
          const smokeW = 100;
          const smokeH = 100;
          ctx.drawImage(bgImg, smokeX, smokeY, smokeW, smokeH, obj.x - smokeW/2, obj.y - smokeH/2 - 30, smokeW, smokeH);
        }catch(e){
          // fallback
        }
      } else if(isMouseTrap){
        // Draw resting mousetrap (not spinning)
        try{
          if(mouseTrapImgLoaded){
            ctx.drawImage(mouseTrapImg, 0, 0, mouseTrapImg.width, mouseTrapImg.height, obj.x, obj.y, obj.w, obj.h);
          } else {
            // Fallback: draw a simple trap shape
            ctx.fillStyle = '#666';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
          }
        }catch(e){
          // fallback
        }
      } else if(isTramp){
        // Draw resting tramp (flat)
        try{
          if(trampImgLoaded){
            ctx.drawImage(trampImg, 0, 0, trampImg.width, trampImg.height, obj.x, obj.y, obj.w, obj.h);
          } else {
            // Fallback: draw a simple rectangle
            ctx.fillStyle = '#a68';
            ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
            ctx.strokeStyle = '#774';
            ctx.lineWidth = 2;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
          }
        }catch(e){
          // fallback
        }
      }
    }else{
      // Draw spinning weapon
      try{
        ctx.save();
        const centerX = obj.x + obj.w / 2;
        const centerY = obj.y + obj.h / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(obj.rotation);
        
        if(isBomb){
          if(bombImgLoaded){
            ctx.drawImage(bombImg, 0, 0, bombImg.width, bombImg.height, -obj.w/2, -obj.h/2, obj.w, obj.h);
          } else {
            ctx.drawImage(bgImg, 25, 384, 59, 41, -obj.w/2, -obj.h/2, obj.w, obj.h);
          }
        } else if(isMouseTrap){
          if(mouseTrapImgLoaded){
            ctx.drawImage(mouseTrapImg, 0, 0, mouseTrapImg.width, mouseTrapImg.height, -obj.w/2, -obj.h/2, obj.w, obj.h);
          } else {
            // Fallback: draw a simple trap shape
            ctx.fillStyle = '#666';
            ctx.fillRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
          }
        } else if(isTramp){
          if(trampImgLoaded){
            ctx.drawImage(trampImg, 0, 0, trampImg.width, trampImg.height, -obj.w/2, -obj.h/2, obj.w, obj.h);
          } else {
            // Fallback: draw a simple rectangle
            ctx.fillStyle = '#a68';
            ctx.fillRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
            ctx.strokeStyle = '#774';
            ctx.lineWidth = 2;
            ctx.strokeRect(-obj.w/2, -obj.h/2, obj.w, obj.h);
          }
        }
        
        ctx.restore();
      }catch(e){
        ctx.fillStyle = isMouseTrap ? '#666' : (isTramp ? '#a68' : '#8ab');
        ctx.fillRect(obj.x - obj.w/2, obj.y, obj.w, obj.h);
      }
    }
  }
  
  // Draw platforms
  for(const plat of platforms){
    if(plat.type === 'floatplat' && platImgLoaded){
      ctx.drawImage(platImg, 0, 0, platImg.width, platImg.height, plat.x, plat.y, plat.w, plat.h);
    } else {
      ctx.fillStyle = '#8b6f47';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = '#d4a574';
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }
  }
  
  // Draw props (above holes, below actors)
  for(const prop of props){
    if(prop.type === 'lamp' && lampImgLoaded){
      ctx.drawImage(lampImg, 0, 0, lampImg.width, lampImg.height, prop.x, prop.y, prop.w, prop.h);
    } else if(prop.type === 'tramp' && trampImgLoaded){
      ctx.drawImage(trampImg, 0, 0, trampImg.width, trampImg.height, prop.x, prop.y, prop.w, prop.h);
    } else {
      ctx.fillStyle = '#444';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
    }
  }
  
  // Draw actors on top (so they appear in front of holes)
  for(const actor of actors){
    try{
      if(actor.isLady && ladyRestingImgLoaded){
        // Draw shadow under lady actor
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        const shadowX = actor.x + actor.w / 2 + 8;
        const shadowY = actor.y + actor.h - 3;
        const shadowRadiusX = actor.w * 0.35;
        const shadowRadiusY = 6;
        ctx.beginPath();
        ctx.ellipse(shadowX, shadowY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Use resting animation for lady actors
        // Each frame is 95 pixels wide, preserve aspect ratio, smaller display
        const frameWidth = 95;
        const frameHeight = ladyRestingImg.height;
        const spriteX = actor.currentFrame * frameWidth;
        // Scale sprite maintaining aspect ratio to fit actor width (reduced by 20%)
        const displayWidth = actor.w * 0.8;
        const displayHeight = (frameHeight / frameWidth) * displayWidth;
        ctx.drawImage(ladyRestingImg, spriteX, 0, frameWidth, frameHeight, actor.x + (actor.w - displayWidth) / 2, actor.y - (displayHeight - actor.h) / 2, displayWidth, displayHeight);
      } else {
        // Use original sprite sheet for knights and fallback for ladies
        ctx.drawImage(bgImg, actor.spriteX, actor.spriteY, actor.w, actor.h, actor.x, actor.y, actor.w, actor.h);
      }
    }catch(e){
      ctx.fillStyle = '#f0f';
      ctx.fillRect(actor.x, actor.y, actor.w, actor.h);
    }
  }
  
  // Draw particles (sparks and debris)
  for(const p of particles){
    const alpha = p.life / p.maxLife; // fade out
    if(p.isDecorativeSpark){
      // Draw decorative spark as a glowing firefly-like point
      const size = p.size || 2;
      const opacity = (p.opacity || 0.5) * alpha;
      
      // Outer glow
      ctx.fillStyle = `rgba(255, 235, 59, ${opacity * 0.3})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Middle glow
      ctx.fillStyle = `rgba(255, 235, 59, ${opacity * 0.6})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.fillStyle = `rgba(255, 235, 59, ${opacity})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if(p.isDebris){
      // Draw debris as rotating rectangles
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, '0');
      const s = p.size || 6;
      ctx.fillRect(-s/2, -s/2, s, s);
      ctx.restore();
    }else{
      // Draw spark
      ctx.fillStyle = `rgba(255, 200, 100, ${alpha * 0.8})`;
      const size = 3 + alpha * 2; // particles get smaller
      ctx.fillRect(p.x - size/2, p.y - size/2, size, size);
    }
  }
  
  // Holes not drawn - debugging what's being drawn
}

function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = Math.min(0.05, (ts - lastTime) / 1000);
  lastTime = ts;
  updateChar(dt);
  updateObjects(dt);
  checkLevelFailure();
  drawBackground(dt);
  requestAnimationFrame(loop);
}

function handleResize(){
  const dpr = window.devicePixelRatio || 1;
  const w = sky.clientWidth;
  const h = sky.clientHeight;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  charX = Math.max(charX, character.offsetWidth/2);
  character.style.left = `${charX - character.offsetWidth/2}px`;
}

function doDrop(){
  createFalling(charX);
}

function updateStatsDisplay(){
  const weaponCount = weaponQueue.length;
  if(statsText) statsText.textContent = `Level: ${currentLevel} | Weapons: ${weaponCount}`;
  // Render all weapons from queue
  if(bombIconsEl){
    bombIconsEl.innerHTML = '';
    for(let i = 0; i < weaponQueue.length; i++){
      const icon = document.createElement('span');
      if(weaponQueue[i] === 'mousetrap'){
        icon.className = 'mousetrap-icon';
      } else if(weaponQueue[i] === 'tramp'){
        icon.className = 'tramp-icon';
      } else {
        icon.className = 'bomb-icon';
      }
      if(i === 0) icon.classList.add('weapon-next'); // next weapon to drop
      bombIconsEl.appendChild(icon);
    }
  }
  // Hide separate weapon queue element since we're showing everything in bombIconsEl
  if(weaponQueueEl){
    weaponQueueEl.innerHTML = '';
  }
}

// Helper function to add mousetraps to the weapon queue
window.addMouseTrap = function(){
  weaponQueue.push('mousetrap');
  updateStatsDisplay();
  console.log('MouseTrap added to queue. Queue:', weaponQueue);
}

// Helper function to add bombs to the weapon queue
window.addBomb = function(){
  weaponQueue.push('bomb');
  updateStatsDisplay();
  console.log('Bomb added to queue. Queue:', weaponQueue);
}

// Helper function to add tramps to the weapon queue
window.addTramp = function(){
  weaponQueue.push('tramp');
  updateStatsDisplay();
  console.log('Tramp added to queue. Queue:', weaponQueue);
}

function updateScoreDisplay(){
  if(scoreText) scoreText.textContent = `Score: ${score}`;
}

function checkLevelFailure(){
  if(gameFailed || gameWon) return;
  
  // WIN CONDITION: All actors defeated, regardless of bombs remaining
  if(actors.size === 0){
    console.log('🎉 ALL ACTORS DEFEATED! YOU WIN!');
    gameWon = true;
    showSuccessScreen();
    return;
  }
  
  // LOSS CONDITION: Only check if out of weapons
  if(weaponQueue.length === 0) {
    // Check if all bombs have settled (either landed or gone off screen)
    const fallingBombs = Array.from(falling);
    const allBombsSettled = fallingBombs.length === 0 || fallingBombs.every(o => o.resting);
    
    if(!allBombsSettled) return;
    
    // All bombs used and settled - wait for actors to fall
    const lastEventTime = lastBombSettleTime || lastBombDropTime || 0;
    const timeSinceLastEvent = Date.now() - lastEventTime;
    
    // Give actors 2.5 seconds to fall off the stage after last bomb settles
    if(timeSinceLastEvent > 2500){
      console.log('❌ OUT OF BOMBS - LEVEL FAILED');
      gameFailed = true;
      showFailureScreen();
    }
  }
}

function showFailureScreen(){
  const overlay = document.getElementById('failureOverlay');
  if(overlay) {
    overlay.classList.remove('hidden');
    overlay.style.display = ''; // Clear any inline display style
    console.log('Modal shown');
  } else {
    console.log('failureOverlay element not found');
  }
}

function showSuccessScreen(){
  const overlay = document.getElementById('successOverlay');
  if(overlay) {
    // Compute stars based on time efficiency and weapons left
    const timeElapsed = (Date.now() - levelStartTime) / 1000; // seconds
    const weaponsUnused = weaponQueue.length;
    let stars = 1;
    
    // Universal 3-star criteria: under 10 seconds with any weapons left
    if(timeElapsed < 10 && weaponsUnused >= 1){
      stars = 3;
    }
    // 2 stars: reasonable time or weapons saved
    else if(timeElapsed < 20 || weaponsUnused >= 2){
      stars = 2;
    }

    // Persist best stars per level
    setLevelStars(currentLevel, stars);
    // Save level time and weapons for leaderboard calculation
    saveLevelCompletion(currentLevel, timeElapsed, weaponsUnused);
    
    // Check if this is the final level
    if(currentLevel === totalLevels){
      // Show leaderboard prompt instead of regular success screen
      checkAndShowLeaderboardPrompt(timeElapsed, weaponsUnused, stars);
      return;
    }
    
    // Immediately refresh level tiles to reflect earned stars
    populateLevelButtons();
    renderSuccessStars(stars);
    displaySuccessStats(timeElapsed, weaponsUnused);
    launchConfetti();

    overlay.classList.remove('hidden');
    overlay.style.display = '';
    console.log('Success modal shown with', stars, 'stars (time:', timeElapsed.toFixed(1), 's, weapons left:', weaponsUnused, ')');
  } else {
    console.log('successOverlay element not found');
  }
}

function loadStoredStars(){
  try {
    const raw = localStorage.getItem(LEVEL_STARS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e){
    console.warn('Could not parse stored stars', e);
    return {};
  }
}

function setLevelStars(level, stars){
  const data = loadStoredStars();
  const prev = data[level] || 0;
  if(stars > prev){
    data[level] = stars;
    try {
      localStorage.setItem(LEVEL_STARS_KEY, JSON.stringify(data));
    } catch (e){
      console.warn('Could not store stars', e);
    }
  }
}

function getLevelStars(level){
  const data = loadStoredStars();
  return data[level] || 0;
}

// Expose a reset for local star scores
window.clearLevelStars = function(){
  try {
    localStorage.removeItem(LEVEL_STARS_KEY);
  } catch (e){
    console.warn('Could not clear stored stars', e);
  }
  populateLevelButtons();
};

function displaySuccessStats(timeElapsed, bombsUnused){
  // Display time with bounce
  const timeEl = document.getElementById('successTime');
  if(timeEl){
    timeEl.textContent = timeElapsed.toFixed(1) + 's';
    timeEl.classList.remove('stat-bounce');
    void timeEl.offsetWidth; // trigger reflow
    timeEl.classList.add('stat-bounce');
  }
  
  // Animate bomb count with bounce
  const bombsEl = document.getElementById('successBombs');
  if(bombsEl){
    bombsEl.textContent = '0';
    bombsEl.classList.remove('stat-bounce');
    void bombsEl.offsetWidth; // trigger reflow
    bombsEl.classList.add('stat-bounce');
    
    const duration = 800; // ms
    const start = Date.now();
    const animate = ()=>{
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress * bombsUnused);
      bombsEl.textContent = current;
      if(progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }
}

function renderSuccessStars(count){
  const starsEl = document.getElementById('successStars');
  if(!starsEl) return;
  const stars = [0,1,2].map(i => {
    const filled = i < count;
    const popDelay = 0.1 + i * 0.15;
    const twinkleDelay = popDelay + 0.5;
    const opacity = filled ? 1 : 0.3;
    return `<span class="success-star" style="animation: starPop 450ms ease forwards ${popDelay}s, starTwinkle 2s ease-in-out ${twinkleDelay}s infinite">
      <img src="./images/star.png" alt="star" style="width: 72px; height: 72px; opacity: ${opacity};">
    </span>`;
  }).join('');
  starsEl.innerHTML = stars;
}

function launchConfetti(){
  const layer = document.getElementById('confettiLayer');
  if(!layer) return;
  layer.innerHTML = '';
  const colors = ['#f87171','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6','#fb7185','#f59e0b','#10b981','#3b82f6'];
  const pieces = 80;
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 2;
  
  for(let i = 0; i < pieces; i++){
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const angle = (i / pieces) * Math.PI * 2; // distribute around circle
    const speed = 300 + Math.random() * 400; // px/s velocity
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 200; // upward bias
    const width = 6 + Math.random() * 6;
    const height = 10 + Math.random() * 10;
    const duration = 2.5 + Math.random() * 1.2;
    
    piece.style.backgroundColor = color;
    piece.style.left = `${startX}px`;
    piece.style.top = `${startY}px`;
    piece.style.width = `${width}px`;
    piece.style.height = `${height}px`;
    piece.style.opacity = '0.95';
    piece.style.position = 'fixed';
    piece.style.pointerEvents = 'none';
    piece.style.setProperty('--vx', `${vx}px`);
    piece.style.setProperty('--vy', `${vy}px`);
    piece.style.animation = `confettiBurst ${duration}s ease-out forwards`;
    layer.appendChild(piece);
  }
}

function clearConfetti(){
  const layer = document.getElementById('confettiLayer');
  if(layer) layer.innerHTML = '';
}

// Save level completion data for leaderboard calculation
function saveLevelCompletion(level, time, weapons) {
  try {
    const times = JSON.parse(localStorage.getItem(LEVEL_TIMES_KEY) || '{}');
    const weaponsData = JSON.parse(localStorage.getItem(LEVEL_WEAPONS_KEY) || '{}');
    times[level] = time;
    weaponsData[level] = weapons;
    localStorage.setItem(LEVEL_TIMES_KEY, JSON.stringify(times));
    localStorage.setItem(LEVEL_WEAPONS_KEY, JSON.stringify(weaponsData));
  } catch (e) {
    console.warn('Could not save level completion', e);
  }
}

// Calculate total score from all completed levels
function calculateTotalScore() {
  try {
    const times = JSON.parse(localStorage.getItem(LEVEL_TIMES_KEY) || '{}');
    const weaponsData = JSON.parse(localStorage.getItem(LEVEL_WEAPONS_KEY) || '{}');
    
    let totalTime = 0;
    let totalWeapons = 0;
    
    for (let i = 1; i <= totalLevels; i++) {
      if (times[i] !== undefined) {
        totalTime += times[i];
      }
      if (weaponsData[i] !== undefined) {
        totalWeapons += weaponsData[i];
      }
    }
    
    // Score calculation: Lower time is better, more weapons is better
    // Score = (weapons * 100) - (time in seconds)
    const score = (totalWeapons * 100) - Math.round(totalTime);
    
    return {
      score,
      totalTime: totalTime.toFixed(1),
      totalWeapons,
      completedLevels: Object.keys(times).length
    };
  } catch (e) {
    console.warn('Could not calculate score', e);
    return { score: 0, totalTime: '0.0', totalWeapons: 0, completedLevels: 0 };
  }
}

// Check if player made top 10 and show leaderboard prompt
async function checkAndShowLeaderboardPrompt(lastLevelTime, lastLevelWeapons, stars) {
  const totalScore = calculateTotalScore();
  
  // Load current leaderboard
  const leaderboard = await loadLeaderboard();
  
  // Check if player made top 10
  const madeTopTen = leaderboard.length < 10 || totalScore.score > leaderboard[leaderboard.length - 1].score;
  
  // Show leaderboard prompt modal
  showLeaderboardPrompt(totalScore, madeTopTen, stars);
}

// Show leaderboard entry prompt
function showLeaderboardPrompt(scoreData, madeTopTen, stars) {
  const overlay = document.getElementById('leaderboardPromptOverlay');
  if (!overlay) return;
  
  populateLevelButtons();
  renderLeaderboardPromptStars(stars);
  
  const scoreEl = document.getElementById('finalScore');
  const timeEl = document.getElementById('finalTime');
  const weaponsEl = document.getElementById('finalWeapons');
  const messageEl = document.getElementById('topTenMessage');
  
  if (scoreEl) scoreEl.textContent = scoreData.score;
  if (timeEl) timeEl.textContent = scoreData.totalTime + 's';
  if (weaponsEl) weaponsEl.textContent = scoreData.totalWeapons;
  
  if (messageEl) {
    if (madeTopTen) {
      messageEl.textContent = '🎉 You made the TOP 10! 🎉';
      messageEl.style.color = '#fbbf24';
    } else {
      messageEl.textContent = 'Keep practicing to make the leaderboard!';
      messageEl.style.color = '#a0aec0';
    }
  }
  
  launchConfetti();
  overlay.classList.remove('hidden');
  overlay.style.display = '';
}

function renderLeaderboardPromptStars(count) {
  const starsEl = document.getElementById('leaderboardPromptStars');
  if (!starsEl) return;
  const stars = [0, 1, 2].map(i => {
    const filled = i < count;
    const popDelay = 0.1 + i * 0.15;
    const twinkleDelay = popDelay + 0.5;
    const opacity = filled ? 1 : 0.3;
    return `<span class="success-star" style="animation: starPop 450ms ease forwards ${popDelay}s, starTwinkle 2s ease-in-out ${twinkleDelay}s infinite">
      <img src="./images/star.png" alt="star" style="width: 72px; height: 72px; opacity: ${opacity};">
    </span>`;
  }).join('');
  starsEl.innerHTML = stars;
}

// Submit score to leaderboard
async function submitToLeaderboard() {
  const nameInput = document.getElementById('playerNameInput');
  const name = nameInput ? nameInput.value.trim() : '';
  
  if (!name || name.length < 2) {
    alert('Please enter a name (at least 2 characters)');
    return;
  }
  
  const scoreData = calculateTotalScore();
  
  try {
    // Save to Firebase
    const timestamp = Date.now();
    const entryId = `${timestamp}_${Math.random().toString(36).substring(7)}`;
    const docRef = doc(db, 'monsterOperaLeaderboard', entryId);
    
    await setDoc(docRef, {
      name,
      score: scoreData.score,
      totalTime: parseFloat(scoreData.totalTime),
      totalWeapons: scoreData.totalWeapons,
      completedLevels: scoreData.completedLevels,
      timestamp
    });
    
    console.log('Score submitted successfully');
    
    // Hide prompt and refresh leaderboard display
    const overlay = document.getElementById('leaderboardPromptOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
      clearConfetti();
    }
    
    // Refresh leaderboard display
    await displayLeaderboard();
    
  } catch (e) {
    console.error('Error submitting score:', e);
    alert('Error submitting score. Please try again.');
  }
}

// Load top 10 from leaderboard
async function loadLeaderboard() {
  try {
    const leaderboardRef = collection(db, 'monsterOperaLeaderboard');
    const q = query(leaderboardRef, orderBy('score', 'desc'), limit(10));
    const snap = await getDocs(q);
    
    const entries = [];
    snap.forEach(docSnap => {
      entries.push(docSnap.data());
    });
    
    return entries;
  } catch (e) {
    console.error('Error loading leaderboard:', e);
    return [];
  }
}

// Display leaderboard in UI
async function displayLeaderboard() {
  const leaderboard = await loadLeaderboard();
  const tableBody = document.getElementById('leaderboardTableBody');
  
  if (!tableBody) return;
  
  if (leaderboard.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-400 py-4">No entries yet. Be the first!</td></tr>';
    return;
  }
  
  tableBody.innerHTML = leaderboard.map((entry, index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
    return `
      <tr class="border-b border-gray-700">
        <td class="py-3 px-4 text-center font-bold">${medal}</td>
        <td class="py-3 px-4">${entry.name}</td>
        <td class="py-3 px-4 text-center font-bold text-yellow-400">${entry.score}</td>
        <td class="py-3 px-4 text-center">${entry.totalTime.toFixed(1)}s</td>
        <td class="py-3 px-4 text-center">${entry.totalWeapons}</td>
      </tr>
    `;
  }).join('');
}

// Skip leaderboard submission
function skipLeaderboard() {
  const overlay = document.getElementById('leaderboardPromptOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    clearConfetti();
  }
}

async function restartLevel(){
  // Hide failure modal
  const failureOverlay = document.getElementById('failureOverlay');
  if(failureOverlay) failureOverlay.classList.add('hidden');
  const successOverlay = document.getElementById('successOverlay');
  if(successOverlay) successOverlay.classList.add('hidden');
  clearConfetti();
  
  // Reset game state
  gameFailed = false;
  gameWon = false;
  charSplat = false;
  charSplatTime = 0;
  charLandingStarted = false;
  charY = 33;
  charVelocity = 0;
  charAnimFrame = 0;
  charAnimTime = 0;
  charFalling = false;
  charFallVy = 0;
  charFallRotation = 0;
  lastBombDropTime = 0;
  lastBombSettleTime = 0;
  falling.clear();
  particles.clear();
  holes.clear();
  actors.clear();
  charX = sky.clientWidth / 2;
  character.style.left = `${charX - 37.5}px`;
  charVelocity = 0;
  
  // Recreate actors from level data
  await loadAndSetupLevel(currentLevel);
  
  // Hide overlay
  const overlay = document.getElementById('failureOverlay');
  if(overlay) overlay.classList.add('hidden');
}

function generateRandomActors(){
  const stageTop = sky.clientHeight - STAGE_HEIGHT - 35;
  const centerX = sky.clientWidth / 2;
  const actorTypes = [
    { w: 95, h: 116, spriteX: 0, spriteY: 0, isLady: true },     // lady type 1 - resting animation (5 frames)
    { w: 60, h: 116, spriteX: 24, spriteY: 124, isLady: false },  // knight
    { w: 95, h: 116, spriteX: 0, spriteY: 0, isLady: true }      // lady type 2 - resting animation (5 frames)
  ];
  
  // Random number of actors between 4-6
  const actorCount = 4 + Math.floor(Math.random() * 3);
  
  for(let i = 0; i < actorCount; i++){
    const actorType = actorTypes[Math.floor(Math.random() * actorTypes.length)];
    // Spread actors across the stage with some randomness
    const posX = (centerX * 0.1) + Math.random() * (centerX * 1.8 - actorType.w);

    actors.add(new Actor({
      x: posX,
      y: stageTop - 96,
      w: actorType.w,
      h: actorType.h,
      spriteX: actorType.spriteX,
      spriteY: actorType.spriteY,
      animationFrames: actorType.isLady ? 5 : 1,
      isLady: actorType.isLady
    }));
  }
}

async function nextLevel(){
  // Hide success modal
  const successOverlay = document.getElementById('successOverlay');
  if(successOverlay) successOverlay.classList.add('hidden');
  clearConfetti();
  
  // Reset game state
  currentLevel++;
  gameWon = false;
  charSplat = false;
  charSplatTime = 0;
  charLandingStarted = false;
  charY = 33;
  charVelocity = 0;
  charAnimFrame = 0;
  charAnimTime = 0;
  charFalling = false;
  charFallVy = 0;
  charFallRotation = 0;
  lastBombDropTime = 0;
  lastBombSettleTime = 0;
  falling.clear();
  particles.clear();
  holes.clear();
  actors.clear();
  charX = sky.clientWidth / 2;
  character.style.left = `${charX - 37.5}px`;
  charVelocity = 0;
  
  // Load next level from Firestore
  await loadAndSetupLevel(currentLevel);
}

async function claimPixelSpot(){
  // Trigger the pixel hunt claim from Monster Opera
  const url = 'https://claimpixel-uevkr2ryoa-uc.a.run.app';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({timestamp: Date.now(), found: true})
    });

    const data = await response.json();

    if (data.success) {
      // Open the pixel modal on the parent window/document
      const pixelModal = document.getElementById('pixelModal');
      if (pixelModal) {
        document.getElementById('pixelCode').textContent = data.code;
        pixelModal.showModal();
      } else {
        // Fallback: show an alert if modal isn't available
        alert(`🎉 Pixel Found! Your code: ${data.code}`);
      }
    } else if (data.alreadyClaimed) {
      const claimedModal = document.getElementById('claimedModal');
      if (claimedModal) {
        claimedModal.showModal();
      } else {
        alert('This pixel has already been claimed by another explorer!');
      }
    } else {
      alert('Error claiming pixel: ' + (data.error || 'Unknown error'));
    }
  } catch (e) {
    console.error('Error claiming pixel:', e);
    alert('Error claiming pixel. Please try again.');
  }
}

let inputsBound = false;
function bindInputs(){
  if(inputsBound) return; // Prevent double-binding
  inputsBound = true;
  
  leftBtn.addEventListener('mousedown', ()=> leftDown = true);
  leftBtn.addEventListener('mouseup', ()=> leftDown = false);
  rightBtn.addEventListener('mousedown', ()=> rightDown = true);
  rightBtn.addEventListener('mouseup', ()=> rightDown = false);
  leftBtn.addEventListener('touchstart', (e)=>{e.preventDefault(); leftDown=true});
  leftBtn.addEventListener('touchend', ()=> leftDown=false);
  rightBtn.addEventListener('touchstart', (e)=>{e.preventDefault(); rightDown=true});
  rightBtn.addEventListener('touchend', ()=> rightDown=false);
  dropBtn.addEventListener('click', doDrop);
  const restartBtn = document.getElementById('restartBtn');
  if(restartBtn) restartBtn.addEventListener('click', (e)=>{ e.preventDefault(); restartBtn.blur(); restartLevel(); });
  const retryBtn = document.getElementById('retryBtn');
  if(retryBtn) retryBtn.addEventListener('click', (e)=>{ e.preventDefault(); retryBtn.blur(); restartLevel(); });
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  if(nextLevelBtn) nextLevelBtn.addEventListener('click', (e)=>{ e.preventDefault(); nextLevelBtn.blur(); nextLevel(); });
  document.addEventListener('keydown', (e)=>{
    if(e.code === 'ArrowLeft') leftDown = true;
    if(e.code === 'ArrowRight') rightDown = true;
    if(e.code === 'Space') {
      e.preventDefault(); // Prevent page scroll
      if(!e.repeat) doDrop(); // Only drop on first press, not when held
    }
  });
  document.addEventListener('keyup', (e)=>{
    if(e.code === 'ArrowLeft') leftDown = false;
    if(e.code === 'ArrowRight') rightDown = false;
  });
  
  // Add click detection for pixel spots on the canvas
  if(canvas){
    canvas.addEventListener('click', (e)=>{
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // Check if click hits any pixel spot
      for(const spot of pixelSpots){
        const distance = Math.sqrt(Math.pow(clickX - spot.x, 2) + Math.pow(clickY - spot.y, 2));
        if(distance <= spot.size){
          // Hit a pixel spot - trigger pixel hunt
          claimPixelSpot();
          break;
        }
      }
    });
  }
}

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCU2R3qRVbgULXXNNb_ylFrNgEi503NmzY",
  authDomain: "dadtechgames.firebaseapp.com",
  databaseURL: "https://dadtechgames-default-rtdb.firebaseio.com",
  projectId: "dadtechgames",
  storageBucket: "dadtechgames.firebasestorage.app",
  messagingSenderId: "789983660743",
  appId: "1:789983660743:web:1cac887b0bc490ab764ce2",
  measurementId: "G-BV33W61TY2"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function loadAllLevels() {
  try {
    const levelsRef = collection(db, 'monsterOperaLevels');
    const q = query(levelsRef, orderBy('level', 'asc'));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      const data = docSnap.data();
      levelsCache[data.level] = data;
    });
    totalLevels = Object.keys(levelsCache).length;
    console.log('Loaded levels:', totalLevels);
  } catch (e) {
    console.error('Error loading levels:', e);
  }
}

async function loadAndSetupLevel(levelNum) {
  // Try to get from cache first
  levelData = levelsCache[levelNum];
  
  // If not in cache, try to fetch
  if (!levelData) {
    try {
      const docRef = doc(db, 'monsterOperaLevels', `level_${levelNum}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        levelData = docSnap.data();
        levelsCache[levelNum] = levelData;
      }
    } catch (e) {
      console.error('Error loading level:', e);
    }
  }
  
  // If still no level data, use defaults
  if (!levelData) {
    console.warn(`No level ${levelNum} found, using defaults`);
    levelData = {
      level: levelNum,
      weapons: Array(6).fill('bomb'),
      actors: [
        { x: 120, y: 350, type: 'lady' },
        { x: 420, y: 350, type: 'knight' },
        { x: 720, y: 350, type: 'lady' }
      ]
    };
  }
  
  // Set weapon queue from level data (all weapons in order)
  if (Array.isArray(levelData.weapons)) {
    weaponQueue = [...levelData.weapons]; // load all weapons in order
  } else {
    weaponQueue = Array(6).fill('bomb'); // default to 6 bombs
  }
  bombsLeft = 0; // will be counted from queue
  
  // Create actors from level data
  const stageTop = sky.clientHeight - STAGE_HEIGHT - 35;
  actors.clear();
  
  if (Array.isArray(levelData.actors)) {
    // Map actor positions from editor/admin canvas to game canvas
    const adminCanvasW = 900;
    const adminCanvasH = 480;
    const adminStageTop = 380; // admin/editor stage top reference
    const gameWidth = sky.clientWidth;
    const gameCanvasH = sky.clientHeight;
    const gameStageTop = stageTop;

    levelData.actors.forEach(actorData => {
      const isKnight = actorData.type === 'knight';
      const rawX = actorData.x != null ? Number(actorData.x) : 400;
      const rawY = actorData.y != null ? Number(actorData.y) : (gameStageTop - 96);
      // Scale X based on canvas width
      const scaledX = Math.round(rawX * (gameWidth / adminCanvasW));
      // Scale Y relative to stage top region
      let scaledY;
      if (rawY <= adminStageTop) {
        // Above stage - scale proportionally to game stage top
        scaledY = Math.round((rawY / adminStageTop) * gameStageTop);
      } else {
        // Below stage - map into game stage area
        scaledY = Math.round(gameStageTop + ((rawY - adminStageTop) / (adminCanvasH - adminStageTop)) * (gameCanvasH - gameStageTop));
      }
      const isLady = !isKnight;
      const actor = new Actor({
        x: scaledX,
        y: scaledY,
        w: isKnight ? 60 : 95,
        h: isKnight ? 106 : 116,
        spriteX: isKnight ? 24 : 0,
        spriteY: isKnight ? 124 : 0,
        animationFrames: isLady ? 5 : 1, // lady has 5 resting frames
        isLady: isLady
      });
      // Give actors initial downward velocity so they fall and settle onto platforms/stage
      actor.vy = 200;
      actors.add(actor);
    });
  }
  
  // Create props from level data (lamps and tramps)
  props.clear();
  if (Array.isArray(levelData.props)) {
    levelData.props.forEach(p => {
      if (p.type === 'lamp') {
        const aspect = lampAspect || (p.w && p.h ? p.w / p.h : 0.6);
        const baseH = p.h != null ? p.h : (p.w != null ? Math.round(p.w / aspect) : 90);
        const h = baseH;
        const w = p.w != null ? p.w : Math.round(h * aspect);
        // Map admin/editor coords to game coords like platforms, allowing lamps anywhere (floating, no sinking)
        const adminCanvasW = 900;
        const adminCanvasH = 480;
        const adminStageTop = 380;
        const gameWidth = sky.clientWidth;
        const gameCanvasH = sky.clientHeight;
        const gameStageTop = sky.clientHeight - STAGE_HEIGHT - 35;
        const rawX = p.x != null ? Number(p.x) : (gameWidth / 2);
        const rawY = p.y != null ? Number(p.y) : (gameStageTop - h);
        const scaledX = Math.round(rawX * (gameWidth / adminCanvasW));
        let scaledY;
        if (rawY <= adminStageTop) {
          scaledY = Math.round((rawY / adminStageTop) * gameStageTop);
        } else {
          scaledY = Math.round(gameStageTop + ((rawY - adminStageTop) / (adminCanvasH - adminStageTop)) * (gameCanvasH - gameStageTop));
        }
        const clampedY = Math.min(Math.max(scaledY, 0), gameCanvasH - h); // allow anywhere in air
        const x = Math.max(0, Math.min(scaledX, sky.clientWidth - w));
        props.add({
          type: 'lamp',
          x,
          y: clampedY,
          w,
          h
        });
      } else if (p.type === 'tramp') {
        // Tramps are static springboards on the stage
        const adminCanvasW = 900;
        const adminCanvasH = 480;
        const adminStageTop = 380;
        const gameWidth = sky.clientWidth;
        const gameCanvasH = sky.clientHeight;
        const gameStageTop = sky.clientHeight - STAGE_HEIGHT - 35;
        const w = p.w != null ? p.w : 70;
        const h = p.h != null ? p.h : 20;
        const rawX = p.x != null ? Number(p.x) : (gameWidth / 2);
        const rawY = p.y != null ? Number(p.y) : gameStageTop;
        const scaledX = Math.round(rawX * (gameWidth / adminCanvasW));
        // Tramps placed on the stage in admin should map to the stage in game
        let scaledY;
        if (rawY >= adminStageTop) {
          // On the stage in admin = on the stage in game (slightly above visual stage)
          scaledY = gameStageTop - h + 10;
        } else if (rawY <= adminStageTop) {
          scaledY = Math.round((rawY / adminStageTop) * gameStageTop);
        } else {
          scaledY = Math.round(gameStageTop + ((rawY - adminStageTop) / (adminCanvasH - adminStageTop)) * (gameCanvasH - gameStageTop));
        }
        const clampedY = Math.min(Math.max(scaledY, 0), gameCanvasH - h);
        const x = Math.max(0, Math.min(scaledX, sky.clientWidth - w));
        props.add({
          type: 'tramp',
          x,
          y: clampedY,
          w,
          h
        });
      }
    });
  }
  
  // Create platforms from level data
  platforms.clear();
  if (Array.isArray(levelData.platforms)) {
    levelData.platforms.forEach(p => {
      if (p.type === 'floatplat') {
              // Convert platform coordinates from admin canvas to game canvas
              // Admin canvas: 900x480 with stageTop at 380
              // Game canvas: 550px height with stageTop at sky.clientHeight - 55 - 35
              const adminCanvasW = 900;
              const adminCanvasH = 480;
              const adminStageTop = 380;
              const gameStageTop = sky.clientHeight - STAGE_HEIGHT - 35;
              const gameCanvasH = sky.clientHeight;
      
              // Scale X coordinates based on canvas width
              const gameWidth = sky.clientWidth;
              const scaledX = (p.x || 300) * (gameWidth / adminCanvasW);
      
              // Scale Y coordinates to match game coordinate system
              const adminY = p.y || 200;
              // Map admin Y (relative to admin canvas) to game Y
              // Admin coords: 0-380 is above stage, 380+ is stage area
              // Game coords: 0-gameStageTop is above stage, gameStageTop+ is stage area
              let scaledY;
              if (adminY <= adminStageTop) {
                // Above stage - scale proportionally
                scaledY = (adminY / adminStageTop) * gameStageTop;
              } else {
                // Below stage - map to game stage area
                scaledY = gameStageTop + ((adminY - adminStageTop) / (adminCanvasH - adminStageTop)) * (gameCanvasH - gameStageTop);
              }
      
        // Clamp legacy small widths up to 80 to match editor defaults
        const width = Math.max(80, p.w != null ? Number(p.w) : 80);
        const height = (platImgLoaded && platAspect)
          ? Math.max(20, Math.round(width / platAspect))
          : Math.max(20, (p.h != null ? Number(p.h) : 30));
        // Mutate loaded data so any later use (or re-saves) keeps corrected sizes
        p.w = width;
        p.h = height;
        platforms.add({
          type: 'floatplat',
          x: Math.round(scaledX),
          y: Math.round(scaledY),
          w: width,
          h: height
        });
      }
    });
  }
  
  // Load holes from level data (pre-placed holes in stage)
  holes.clear();
  if (Array.isArray(levelData.holes)) {
    levelData.holes.forEach(h => {
      // Map hole coordinates from admin canvas to game canvas
      const adminCanvasW = 900;
      const adminCanvasH = 480;
      const adminStageTop = 380;
      const gameWidth = sky.clientWidth;
      const gameCanvasH = sky.clientHeight;
      const gameStageTop = sky.clientHeight - STAGE_HEIGHT - 35;
      
      const rawX = h.x != null ? Number(h.x) : 300;
      const rawY = h.y != null ? Number(h.y) : 300;
      const scaledX = Math.round(rawX * (gameWidth / adminCanvasW));
      let scaledY;
      if (rawY <= adminStageTop) {
        scaledY = Math.round((rawY / adminStageTop) * gameStageTop);
      } else {
        scaledY = Math.round(gameStageTop + ((rawY - adminStageTop) / (adminCanvasH - adminStageTop)) * (gameCanvasH - gameStageTop));
      }
      
      holes.add({
        x: scaledX,
        y: scaledY,
        w: h.w || 107,
        h: h.h || 117
      });
    });
  }
  
  // Load pixel spots from level data (hidden treasure hunt locations)
  pixelSpots.clear();
  if (Array.isArray(levelData.pixelSpots)) {
    levelData.pixelSpots.forEach(spot => {
      // Map pixel spot coordinates from admin canvas to game canvas
      const adminCanvasW = 900;
      const adminCanvasH = 480;
      const adminStageTop = 380;
      const gameWidth = sky.clientWidth;
      const gameCanvasH = sky.clientHeight;
      const gameStageTop = sky.clientHeight - STAGE_HEIGHT - 35;
      
      const rawX = spot.x != null ? Number(spot.x) : 450;
      const rawY = spot.y != null ? Number(spot.y) : 200;
      const scaledX = Math.round(rawX * (gameWidth / adminCanvasW));
      
      let scaledY;
      if (rawY <= adminStageTop) {
        scaledY = Math.round((rawY / adminStageTop) * gameStageTop);
      } else {
        scaledY = Math.round(gameStageTop + ((rawY - adminStageTop) / (adminCanvasH - adminStageTop)) * (gameCanvasH - gameStageTop));
      }
      
      const spotSize = spot.size || 20; // clickable radius
      pixelSpots.add({
        x: scaledX,
        y: scaledY,
        size: spotSize,
        claimed: false
      });
    });
  }
  
  updateStatsDisplay();
  levelStartTime = Date.now();
  if(levelNum === 1){
    showLevel1Tutorial();
  } else {
    hideLevel1Tutorial();
  }
  console.log(`Level ${levelNum} loaded:`, levelData);
}

function recomputePlatformHeights(){
  if(!platImgLoaded || !platAspect) return;
  for(const plat of platforms){
    if(plat.type === 'floatplat'){
      plat.h = Math.max(10, Math.round(plat.w / platAspect));
    }
  }
}

function ensureTutorialStyles(){
  if(tutorialStylesInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes tutorialTrapFall { 
      0% { transform: translate(-50%, -140px) rotate(-15deg); opacity: 0; }
      10% { opacity: 1; }
      65% { transform: translate(-50%, calc(var(--end) * 0.8)) rotate(8deg); opacity: 1; }
      82% { transform: translate(-50%, var(--end)) rotate(0deg); opacity: 1; }
      100% { transform: translate(-50%, var(--end)); opacity: 0; }
    }
    @keyframes tutorialDashPulse {
      0% { opacity: 0.25; }
      50% { opacity: 0.95; }
      100% { opacity: 0.25; }
    }
  `;
  document.head.appendChild(style);
  tutorialStylesInjected = true;
}

function hideLevel1Tutorial(){
  if(tutorialTimeout){
    clearTimeout(tutorialTimeout);
    tutorialTimeout = null;
  }
  if(tutorialOverlay && tutorialOverlay.parentNode){
    tutorialOverlay.parentNode.removeChild(tutorialOverlay);
  }
  tutorialOverlay = null;
  tutorialTrapEl = null;
}

function showLevel1Tutorial(force=false){
  if(!force && localStorage.getItem('mo_tutorial_seen') === '1') return;
  if(!sky) return;
  ensureTutorialStyles();
  hideLevel1Tutorial();
  tutorialPhase = 1;
  tutorialMovementTime = 0;
  tutorialMovementStarted = false;
  showLevel1MovementTutorial();
}

function showLevel1MovementTutorial(){
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '35';

  const hint = document.createElement('div');
  hint.textContent = 'Use ◀ ▶ Arrow Keys to Move';
  hint.style.position = 'absolute';
  hint.style.left = '50%';
  hint.style.top = '24px';
  hint.style.transform = 'translateX(-50%)';
  hint.style.color = '#fff';
  hint.style.fontWeight = '800';
  hint.style.fontSize = '18px';
  hint.style.letterSpacing = '0.5px';
  hint.style.textShadow = '0 2px 6px rgba(0,0,0,0.6)';
  hint.style.padding = '8px 16px';
  hint.style.background = 'rgba(0,0,0,0.5)';
  hint.style.border = '1px solid rgba(255,255,255,0.3)';
  hint.style.borderRadius = '12px';
  hint.style.pointerEvents = 'none';

  const arrowLeft = document.createElement('div');
  arrowLeft.textContent = '◀';
  arrowLeft.style.position = 'absolute';
  arrowLeft.style.left = '42%';
  arrowLeft.style.top = '12%';
  arrowLeft.style.fontSize = '48px';
  arrowLeft.style.color = 'rgba(255,255,255,0.9)';
  arrowLeft.style.textShadow = '0 4px 12px rgba(0,0,0,0.8)';
  arrowLeft.style.animation = 'tutorialDashPulse 1.5s ease-in-out infinite';

  const arrowRight = document.createElement('div');
  arrowRight.textContent = '▶';
  arrowRight.style.position = 'absolute';
  arrowRight.style.left = '58%';
  arrowRight.style.top = '12%';
  arrowRight.style.fontSize = '48px';
  arrowRight.style.color = 'rgba(255,255,255,0.9)';
  arrowRight.style.textShadow = '0 4px 12px rgba(0,0,0,0.8)';
  arrowRight.style.animation = 'tutorialDashPulse 1.5s ease-in-out infinite 0.3s';

  overlay.appendChild(hint);
  overlay.appendChild(arrowLeft);
  overlay.appendChild(arrowRight);
  sky.appendChild(overlay);
  tutorialOverlay = overlay;
}

function showLevel1DropTutorial(){
  hideLevel1Tutorial();
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '35';

  const stageY = sky.clientHeight - STAGE_HEIGHT - 90;
  const guideX = '58%';
  const hint = document.createElement('div');
  hint.textContent = 'Press SPACE bar';
  hint.style.position = 'absolute';
  hint.style.left = guideX;
  hint.style.top = '14px';
  hint.style.transform = 'translateX(-50%)';
  hint.style.color = '#fff';
  hint.style.fontWeight = '800';
  hint.style.fontSize = '16px';
  hint.style.letterSpacing = '0.5px';
  hint.style.textShadow = '0 2px 6px rgba(0,0,0,0.6)';
  hint.style.padding = '6px 10px';
  hint.style.background = 'rgba(0,0,0,0.45)';
  hint.style.border = '1px solid rgba(255,255,255,0.25)';
  hint.style.borderRadius = '10px';
  hint.style.pointerEvents = 'none';

  const line = document.createElement('div');
  line.style.position = 'absolute';
  line.style.left = guideX;
  line.style.top = '60px';
  line.style.width = '2px';
  line.style.height = `${Math.max(180, stageY - 40)}px`;
  line.style.transform = 'translateX(-50%)';
  line.style.backgroundImage = 'linear-gradient(rgba(255,255,255,0.95) 10px, rgba(255,255,255,0) 10px)';
  line.style.backgroundSize = '2px 18px';
  line.style.animation = 'tutorialDashPulse 1.2s ease-in-out infinite';
  line.style.filter = 'drop-shadow(0 0 6px rgba(0,0,0,0.45))';

  const trap = document.createElement('div');
  trap.style.position = 'absolute';
  trap.style.left = guideX;
  trap.style.top = '10px';
  trap.style.width = '42px';
  trap.style.height = '30px';
  trap.style.transform = 'translateX(-50%)';
  trap.style.backgroundImage = "url('./images/mousetrap.png')";
  trap.style.backgroundSize = 'contain';
  trap.style.backgroundRepeat = 'no-repeat';
  trap.style.backgroundPosition = 'center';
  trap.style.animation = 'tutorialTrapFall 1.6s ease-in-out infinite';
  trap.style.setProperty('--end', `${stageY}px`);
  trap.style.filter = 'drop-shadow(0 0 4px rgba(0,0,0,0.55))';

  overlay.appendChild(hint);
  overlay.appendChild(line);
  overlay.appendChild(trap);
  sky.appendChild(overlay);
  tutorialOverlay = overlay;
  tutorialTrapEl = trap;
}

let gameInitialized = false;
export default async function init(){
  if(gameInitialized) {
    console.warn('Game already initialized, skipping');
    return;
  }
  gameInitialized = true;
  
  sky = document.getElementById('sky');
  character = document.getElementById('character');
  leftBtn = document.getElementById('leftBtn');
  rightBtn = document.getElementById('rightBtn');
  dropBtn = document.getElementById('dropBtn');
  statsText = document.getElementById('statsText');
  scoreText = document.getElementById('scoreText');
  bombIconsEl = document.getElementById('bombIcons');
  weaponQueueEl = document.getElementById('weaponQueue');
  canvas = document.getElementById('skyCanvas');
  ctx = canvas.getContext('2d');
  charX = sky.clientWidth / 2;
  character.style.left = `${charX - 37.5}px`;
  
  // Create Character instance mirroring current values
  player = new Character(charX, charY);
  
  // Load all levels from Firestore
  await loadAllLevels();
  
  // Load and setup level 1
  await loadAndSetupLevel(currentLevel);
  
  bgImg = new Image();
  bgImg.src = './images/SpriteSheet2.png?' + Date.now();
  bgImg.onload = ()=>{ bgLoaded = true; handleResize(); };
  bgImg.onerror = (e)=>{ console.warn('Could not load background image', e); };

  bombImg = new Image();
  bombImg.src = './images/bomb.png';
  bombImg.onload = ()=>{ bombImgLoaded = true; };
  bombImg.onerror = (e)=>{ console.warn('Could not load bomb image', e); };
  
  mouseTrapImg = new Image();
  mouseTrapImg.src = './images/mousetrap.png';
  mouseTrapImg.onload = ()=>{ mouseTrapImgLoaded = true; };
  mouseTrapImg.onerror = (e)=>{ console.warn('Could not load mousetrap image', e); };
  
  trampImg = new Image();
  trampImg.src = './images/tramp.png';
  trampImg.onload = ()=>{ trampImgLoaded = true; };
  trampImg.onerror = (e)=>{ console.warn('Could not load tramp image', e); };
  
  lampImg = new Image();
  lampImg.src = './images/lamp.png';
  lampImg.onload = ()=>{ lampImgLoaded = true; if(lampImg.width && lampImg.height){ lampAspect = lampImg.width / lampImg.height; } };
  lampImg.onerror = (e)=>{ console.warn('Could not load lamp image', e); };
  
  platImg = new Image();
  platImg.src = './images/floatingplat.png';
  platImg.onload = ()=>{
    platImgLoaded = true;
    if(platImg.width && platImg.height){
      platAspect = platImg.width / platImg.height;
      recomputePlatformHeights();
    }
  };
  platImg.onerror = (e)=>{ console.warn('Could not load platform image', e); };
  
  ladyRestingImg = new Image();
  ladyRestingImg.src = './images/ladyactor-resting.png';
  ladyRestingImg.onload = ()=>{ ladyRestingImgLoaded = true; };
  ladyRestingImg.onerror = (e)=>{ console.warn('Could not load lady resting image', e); };
  
  ladyScreamSound = new Audio('./sounds/ladyscream.mp3');
  ladyScreamSound.volume = 0.7;
  
  bombHitSound = new Audio('./sounds/bomb.mp3');
  bombHitSound.volume = 0.8;
  
  bindInputs();
  window.addEventListener('resize', handleResize);
  
  // Load test mode state from localStorage
  testMode = localStorage.getItem(TEST_MODE_KEY) === 'true';
  updateTestModeDisplay();
  
  // Set up test mode toggle
  const testModeToggle = document.getElementById('testModeToggle');
  if(testModeToggle){
    testModeToggle.addEventListener('click', ()=>{
      testMode = !testMode;
      localStorage.setItem(TEST_MODE_KEY, testMode);
      updateTestModeDisplay();
      populateLevelButtons();
    });
  }
  
  // Populate level selector buttons
  populateLevelButtons();
  
  // Load and display leaderboard
  await displayLeaderboard();
  
  // Expose leaderboard functions globally
  window.submitToLeaderboard = submitToLeaderboard;
  window.skipLeaderboard = skipLeaderboard;
  
  requestAnimationFrame(loop);
}

function populateLevelButtons() {
  const levelButtonsContainer = document.getElementById('levelButtons');
  if (!levelButtonsContainer) return;
  
  levelButtonsContainer.innerHTML = '';
  
  // Get all available levels and sort them numerically
  const availableLevels = Object.keys(levelsCache)
    .map(Number)
    .sort((a, b) => a - b);
  
  // Create a button for each level
  availableLevels.forEach(levelNum => {
    const btn = document.createElement('button');
    const earned = getLevelStars(levelNum);
    
    // Check if level is accessible
    const isAccessible = testMode || levelNum === 1 || getLevelStars(levelNum - 1) > 0;
    
    const starImgs = Array.from({length:3}, (_,i)=>`<img src="./images/star.png" alt="star" style="width: 30px; height: 30px; opacity: ${i < earned ? 1 : 0.25}; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6)); margin: 0 2px;">`).join('');
    btn.type = 'button';
    btn.className = 'relative focus:outline-none';
    btn.style.width = '140px';
    btn.style.height = '100px';
    btn.style.flex = '0 0 140px';
    btn.style.minWidth = '140px';
    btn.style.minHeight = '100px';
    btn.style.padding = '0';
    btn.style.border = 'none';
    btn.style.backgroundImage = "url('./images/leveltile.png')";
    btn.style.backgroundSize = 'contain';
    btn.style.backgroundRepeat = 'no-repeat';
    btn.style.backgroundPosition = 'center';
    btn.style.display = 'flex';
    btn.style.flexDirection = 'column';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.color = '#e5e7eb';
    btn.style.fontWeight = '800';
    btn.style.textShadow = '0 2px 6px rgba(0,0,0,0.7)';
    btn.style.borderRadius = '10px';
    btn.style.overflow = 'hidden';
    btn.style.opacity = isAccessible ? '1' : '0.3';
    btn.style.cursor = isAccessible ? 'pointer' : 'not-allowed';
    btn.innerHTML = `<div style="font-size:18px; margin-bottom:6px;">Level ${levelNum}</div><div style="line-height:1; display:flex; align-items:center; justify-content:center;">${starImgs}</div>`;
    
    if(isAccessible){
      btn.onclick = () => selectLevel(levelNum);
    } else {
      btn.disabled = true;
      btn.title = 'Beat the previous level to unlock';
    }
    levelButtonsContainer.appendChild(btn);
  });
}

function updateTestModeDisplay(){
  const toggle = document.getElementById('testModeToggle');
  if(!toggle) return;
  if(testMode){
    toggle.style.background = 'rgba(34, 197, 94, 0.3)';
    toggle.style.borderColor = 'rgba(34, 197, 94, 0.5)';
    toggle.style.opacity = '0.8';
    toggle.title = 'Test Mode ON (click to toggle)';
  } else {
    toggle.style.background = 'rgba(255,255,255,0.08)';
    toggle.style.borderColor = 'rgba(255,255,255,0.15)';
    toggle.style.opacity = '0.5';
    toggle.title = 'Test Mode OFF (click to toggle)';
  }
}

window.selectLevel = async function(levelNum) {
  currentLevel = levelNum;
  await loadAndSetupLevel(levelNum);
  await restartLevel();
  populateLevelButtons(); // Update button styling
}

window.addEventListener('DOMContentLoaded', ()=>{
  if(typeof init === 'function') init();
});
