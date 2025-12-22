/**
 * Browser Console Script to Add Pixel Spot to Level 7
 * 
 * Usage:
 * 1. Open Monster Opera Level Editor at: public/admin/monsterOpera-level-editor.html
 * 2. Login with your admin credentials
 * 3. Open the browser Developer Console (F12 or Cmd+Option+I)
 * 4. Copy and paste this entire script into the console
 * 5. Press Enter to run
 * 
 * The script will add a pixel spot to level 7 just below the top platform.
 */

(async () => {
  try {
    // Get the level_7 document from Firestore
    const docRef = db.collection('monsterOperaLevels').doc('level_7');
    const docSnap = await docRef.get();
    
    if (!docSnap.exists()) {
      console.error('❌ Level 7 not found in Firestore');
      return;
    }
    
    const levelData = docSnap.data();
    console.log('📋 Current level 7 data:', levelData);
    
    // The pixel spot coordinates
    // Admin canvas: 900x480, stage top at y=380
    // Place below the top platform
    const newPixelSpot = {
      x: 450,      // center horizontally
      y: 130,      // below top platform (estimated)
      size: 25     // clickable radius
    };
    
    // Get existing pixel spots or create new array
    const pixelSpots = levelData.pixelSpots || [];
    
    // Check if a similar pixel spot already exists
    const exists = pixelSpots.some(spot => 
      Math.abs(spot.x - newPixelSpot.x) < 10 && 
      Math.abs(spot.y - newPixelSpot.y) < 10
    );
    
    if (exists) {
      console.warn('⚠️  A pixel spot already exists near this location!');
      console.log('Existing spots:', pixelSpots);
      return;
    }
    
    // Add the new pixel spot
    pixelSpots.push(newPixelSpot);
    
    // Update Firestore
    await docRef.update({ pixelSpots });
    
    console.log('✅ Successfully added pixel spot to level 7!');
    console.log('📍 Location: x=' + newPixelSpot.x + ', y=' + newPixelSpot.y);
    console.log('🎯 Clickable radius: ' + newPixelSpot.size + 'px');
    console.log('\n✨ The pixel spot is now active in level 7!');
    console.log('Load level 7 in the game and click near the coordinates to test it.');
    
  } catch (error) {
    console.error('❌ Error adding pixel spot:', error);
  }
})();
