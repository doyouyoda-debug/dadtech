# Monster Opera - Pixel Spots Setup

## Adding Hidden Pixel Spots to Levels

Monster Opera now supports hidden pixel spots that trigger the treasure hunt when clicked.

### Game Code Changes
The game code has been updated to:
1. Load `pixelSpots` array from level configuration in Firestore
2. Detect clicks on the game canvas and check if they hit any pixel spots
3. Trigger the pixel claim process when a spot is clicked

### How to Add a Pixel Spot to Level 7

To add a hidden pixel spot to level 7, you can use one of these methods:

#### Method 1: Browser Console (Easiest)
1. Open the Monster Opera Level Editor: `public/admin/monsterOpera-level-editor.html`
2. Login with your admin credentials
3. Open Developer Console (F12 or Cmd+Option+I)
4. Copy the script from `browser-console-add-pixel-spot.js`
5. Paste into the console and press Enter
6. You should see a success message

#### Method 2: Node.js Script
1. Ensure Node.js is installed
2. Install Firebase Admin SDK:
   ```bash
   npm install -g firebase-admin
   ```
3. Set up your Firebase credentials by setting the `GOOGLE_APPLICATION_CREDENTIALS` environment variable
4. Run:
   ```bash
   node add-pixel-spot-level-7.js
   ```

#### Method 3: Direct Firestore Console
1. Go to Firebase Console: https://console.firebase.google.com/project/dadtechgames/firestore
2. Navigate to `monsterOperaLevels` collection
3. Open the `level_7` document
4. Add a new field called `pixelSpots` (type: array)
5. Add a new map element with:
   ```
   x: 450
   y: 130
   size: 25
   ```
6. Save the document

### Coordinate System

The coordinates use the admin/editor canvas coordinate system (900 × 480):
- **X-axis**: 0-900 (left to right)
- **Y-axis**: 0-480 (top to bottom)
  - 0-380: Above the stage
  - 380+: Stage area

**For "just below the top platform":**
- If your top platform is positioned at Y ≈ 100 in the admin canvas
- Place the pixel spot at Y ≈ 130-150

### Example Pixel Spot for Level 7

```json
{
  "pixelSpots": [
    {
      "x": 450,
      "y": 130,
      "size": 25
    }
  ]
}
```

**Parameters:**
- `x`: X coordinate on the admin canvas (0-900)
- `y`: Y coordinate on the admin canvas (0-480)
- `size`: Clickable radius in pixels (default: 20)
  - Size 15-20: Hard to find
  - Size 20-30: Medium difficulty
  - Size 30+: Easy to find
