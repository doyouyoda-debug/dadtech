# Quick Start: Add Pixel Spot to Level 7

## 30-Second Setup (Browser Console Method)

1. Go to: `public/admin/monsterOpera-level-editor.html`
2. Login with admin credentials
3. Press `F12` (or `Cmd+Option+I` on Mac)
4. Paste this into the console:

```javascript
(async () => {
  const docRef = db.collection('monsterOperaLevels').doc('level_7');
  const pixelSpots = (await docRef.get()).data().pixelSpots || [];
  if (!pixelSpots.some(s => Math.abs(s.x-450)<10 && Math.abs(s.y-130)<10)) {
    pixelSpots.push({x: 450, y: 130, size: 25});
    await docRef.update({pixelSpots});
    console.log('✅ Pixel spot added to level 7!');
  } else {
    console.log('⚠️ Pixel spot already exists');
  }
})();
```

5. Press Enter
6. Done! ✨

## Test It
1. Open Monster Opera game
2. Load Level 7
3. Click near the center-top area of the screen
4. Pixel hunt modal should appear!

---

**That's it!** The pixel spot is now live in level 7, positioned just below the top platform.
