# Code Changes Summary

## Modified File: `/Users/trentross/Documents/dadtech/public/monsterOpera/src/game.js`

### Change 1: Added pixelSpots Set (Line ~20)
**Location:** After the `platforms` Set declaration

```javascript
const pixelSpots = new Set(); // hidden pixel spots for treasure hunt
```

**Purpose:** Tracks all pixel spot objects for the current level

---

### Change 2: Added claimPixelSpot() Function (Line ~1673)
**Location:** New function between `nextLevel()` and `bindInputs()`

```javascript
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
```

**Purpose:** Handles the pixel claim process when a spot is clicked

---

### Change 3: Added Canvas Click Detection (Line ~1743)
**Location:** In `bindInputs()` function, after all the event listeners

```javascript
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
```

**Purpose:** Detects when player clicks on canvas and checks if they hit a pixel spot

---

### Change 4: Added Pixel Spot Loading (Line ~2030)
**Location:** In `loadAndSetupLevel()` function, after the holes loading code

```javascript
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
```

**Purpose:** Loads pixel spots from Firestore level data and converts coordinates

---

## Summary of Changes

| Change | Type | Lines | Purpose |
|--------|------|-------|---------|
| pixelSpots Set | Addition | ~20 | Store pixel spot objects |
| claimPixelSpot() | Function | ~35 | Handle pixel claim process |
| Canvas Click Listener | Event Handler | ~25 | Detect clicks on pixel spots |
| Pixel Spot Loading | Data Loading | ~40 | Load spots from Firestore |

**Total Lines Added:** ~120 lines
**Files Modified:** 1 file
**Breaking Changes:** None (fully backward compatible)
**Errors:** None

---

## Testing the Changes

1. Load level 7 in Monster Opera
2. Open browser console
3. Type: `console.log('pixelSpots:', pixelSpots);`
4. You should see the pixelSpots Set with one entry
5. Click on the game canvas near (x:450, y:130)
6. Pixel hunt modal should appear

---

## Rollback Instructions

If needed, remove these four changes:
1. Delete the `pixelSpots` Set declaration
2. Delete the `claimPixelSpot()` function
3. Delete the canvas click listener in `bindInputs()`
4. Delete the pixel spot loading code in `loadAndSetupLevel()`

The game will function normally without pixel spots.
