#!/usr/bin/env node
/**
 * Add Pixel Spot to Monster Opera Level 7
 * 
 * Usage:
 * 1. Install Firebase Admin SDK: npm install -g firebase-admin
 * 2. Set up your Firebase credentials
 * 3. Run: node add-pixel-spot-level-7.js
 * 
 * Or use via Firebase Console at: https://console.firebase.google.com/project/dadtechgames/firestore
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// NOTE: You'll need to authenticate with Firebase credentials first
// Set the GOOGLE_APPLICATION_CREDENTIALS environment variable or provide a path to your service account key

try {
  admin.initializeApp();
} catch (e) {
  console.error('Firebase already initialized or error initializing:', e.message);
}

const db = admin.firestore();

async function addPixelSpotToLevel7() {
  try {
    const levelRef = db.collection('monsterOperaLevels').doc('level_7');
    
    // The pixel spot coordinates below the top platform
    // Admin canvas is 900x480, stage top is at y=380
    // Placing the pixel spot at x=450 (center), y=130 (just below expected top platform)
    const pixelSpotData = {
      x: 450,      // center of screen horizontally
      y: 130,      // below the top platform
      size: 25     // clickable radius
    };
    
    // Update the document to add/merge the pixelSpots array
    await levelRef.update({
      pixelSpots: admin.firestore.FieldValue.arrayUnion(pixelSpotData)
    });
    
    console.log('✓ Successfully added pixel spot to level 7!');
    console.log('  Location: x=' + pixelSpotData.x + ', y=' + pixelSpotData.y);
    console.log('  Clickable radius: ' + pixelSpotData.size + 'px');
    console.log('\nThe pixel spot has been added to the Firestore database.');
    console.log('Load level 7 in the game to test it!');
    
  } catch (error) {
    console.error('✗ Error adding pixel spot to level 7:', error.message);
    console.error('\nMake sure you have:');
    console.error('1. Firebase Admin SDK installed');
    console.error('2. GOOGLE_APPLICATION_CREDENTIALS environment variable set');
    console.error('3. Correct Firebase project credentials');
  }
}

// Run the function
addPixelSpotToLevel7().then(() => {
  console.log('\nDone! Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
