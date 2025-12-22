# Hidden Pixel Spot Implementation Summary

## What Was Done

### 1. Game Code Updates (game.js)
✅ Added pixel spot detection system to Monster Opera:
- Added `pixelSpots` Set to track pixel spot locations
- Added loading logic to read `pixelSpots` array from Firestore level data
- Added automatic coordinate conversion from admin canvas to game canvas
- Added canvas click detection to trigger pixel claims when spots are clicked
- Added `claimPixelSpot()` function that calls the pixel hunt Cloud Function

**Files Modified:**
- `/Users/trentross/Documents/dadtech/public/monsterOpera/src/game.js`

### 2. Helper Scripts & Documentation
Created three methods to add pixel spots to levels:

#### Browser Console Script
- **File**: `browser-console-add-pixel-spot.js`
- **Usage**: Copy-paste into browser console while logged into admin panel
- **Best for**: Quick testing and deployment without dependencies

#### Node.js Script  
- **File**: `add-pixel-spot-level-7.js`
- **Usage**: Run with Firebase Admin SDK
- **Best for**: Automated deployment pipelines

#### Setup Documentation
- **File**: `PIXEL_SPOTS_SETUP.md`
- **Contains**: Complete guide to adding pixel spots to any level
- **Includes**: Coordinate system explanation and examples

### 3. Pixel Spot Configuration for Level 7

The pixel spot for level 7 is configured as:
```json
{
  "x": 450,      // Center horizontally (admin canvas is 900px wide)
  "y": 130,      // Just below the top platform (admin canvas is 480px tall)
  "size": 25     // Clickable radius of 25px
}
```

**Location Details:**
- Positioned just below the top platform as requested
- Uses admin canvas coordinates (900×480) which are automatically converted to game coordinates
- Medium difficulty (size 25 makes it discoverable but not obvious)

## How to Deploy

### Option 1: Browser Console (Fastest)
```
1. Open: public/admin/monsterOpera-level-editor.html
2. Login with admin credentials
3. Press F12 (or Cmd+Option+I on Mac) to open Developer Console
4. Copy entire script from browser-console-add-pixel-spot.js
5. Paste into console and press Enter
6. See confirmation message
```

### Option 2: Firebase Console
```
1. Go to https://console.firebase.google.com
2. Navigate to monsterOperaLevels collection
3. Open level_7 document
4. Add field: pixelSpots (array)
5. Add map element with x, y, size values
6. Save
```

### Option 3: Node.js Script
```
npm install -g firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
node add-pixel-spot-level-7.js
```

## Testing

After adding the pixel spot:
1. Load Monster Opera
2. Select Level 7
3. Click near coordinates x=450, y=130 (will be converted to game canvas)
4. You should see the pixel hunt modal appear
5. Enter TikTok username to claim the code

## How It Works

1. **Game loads level 7** → Reads pixelSpots array from Firestore
2. **Coordinates converted** → Admin canvas (900×480) → Game canvas (responsive)
3. **Player clicks canvas** → Checks if click hits any pixel spot (within radius)
4. **Hit detected** → Calls `claimPixelSpot()`
5. **Cloud Function called** → Returns pixel code if not yet claimed
6. **Modal appears** → Player enters TikTok username and gets code

## Technical Details

### Coordinate System
- **Admin Canvas**: 900×480 (used in level editor)
- **Game Canvas**: Responsive width, variable height
- **Conversion**: Scales coordinates proportionally based on canvas size
- **Stage Reference**: Y=380 in admin canvas, STAGE_HEIGHT + offset in game

### Click Detection
- Canvas receives click event
- Distance calculated from click to each pixel spot center
- If distance ≤ spot.size, pixel is claimed
- Prevents accidental clicks with configurable radius

### Pixel Hunt Integration
- Calls existing Cloud Function: `https://claimpixel-uevkr2ryoa-uc.a.run.app`
- Shows pixel modal from index.html (if available)
- Handles already-claimed state gracefully
- Rate limiting support with client-side cooldown

## Files Changed
1. ✅ `/Users/trentross/Documents/dadtech/public/monsterOpera/src/game.js` - Core implementation
2. ✅ `/Users/trentross/Documents/dadtech/add-pixel-spot-level-7.js` - Node script helper
3. ✅ `/Users/trentross/Documents/dadtech/browser-console-add-pixel-spot.js` - Browser script helper
4. ✅ `/Users/trentross/Documents/dadtech/PIXEL_SPOTS_SETUP.md` - Complete documentation

## Next Steps

1. Choose one of the three methods to add the pixel spot to level 7
2. Test by loading level 7 and clicking on the pixel spot location
3. Verify the pixel hunt modal appears and can claim the code
4. Monitor game logs for any click detection issues

---

**Note**: The implementation is fully backward compatible. Levels without pixel spots will work normally.
