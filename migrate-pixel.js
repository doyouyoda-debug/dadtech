/**
 * Firestore Data Migration Script
 * Migrates treasureHunt/currentTreasure -> pixelHunt/currentPixel
 * Renames giftCardCode -> pixelCode
 */

const admin = require('./functions/node_modules/firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'dadtechgames'
});

const db = admin.firestore();

async function migrateData() {
  try {
    console.log('Starting migration...');

    // Read old document
    const oldRef = db.collection('treasureHunt').doc('currentTreasure');
    const oldDoc = await oldRef.get();

    if (!oldDoc.exists) {
      console.log('No data found in treasureHunt/currentTreasure - nothing to migrate');
      return;
    }

    const oldData = oldDoc.data();
    console.log('Found old data:', oldData);

    // Create new document with renamed fields
    const newData = {
      claimed: oldData.claimed || false,
      claimedBy: oldData.claimedBy || null,
      claimedAt: oldData.claimedAt || null,
      // Rename giftCardCode -> pixelCode
      pixelCode: oldData.giftCardCode || oldData.pixelCode || 'DADTECH-PIXEL-HUNTER-2025',
      resetAt: oldData.resetAt || null,
      userAgent: oldData.userAgent || null,
      // Add migration timestamp
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Write to new location
    const newRef = db.collection('pixelHunt').doc('currentPixel');
    await newRef.set(newData);

    console.log('✓ Successfully migrated data to pixelHunt/currentPixel');
    console.log('New data:', newData);

    // Optionally: Keep old document for backup or delete it
    // await oldRef.delete();
    // console.log('✓ Deleted old document');

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
