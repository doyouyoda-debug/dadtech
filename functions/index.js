/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const {BetaAnalyticsDataClient} = require("@google-analytics/data");

admin.initializeApp();

// Initialize Google Analytics Data API client
const analyticsDataClient = new BetaAnalyticsDataClient();
const GA4_PROPERTY_ID = "properties/512490037"; // Your GA4 property ID

setGlobalOptions({maxInstances: 10});

// Pixel Hunt Configuration
const PIXEL_CONFIG = {
  // Set this to true once someone has claimed the pixel
  claimed: false,
  claimedBy: null,
  claimedAt: null,
  // Your pixel code or prize
  pixelCode: "DADTECH-PIXEL-HUNTER-2025",
  // You can rotate this for different hunts
};

/**
 * Treasure Hunt Cloud Function
 * Handles the hidden pixel treasure claim
 */
// Rate limiting map: IP -> last attempt timestamp
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 5000; // 5 seconds between attempts

exports.claimPixel = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).json({success: false, error: "Method not allowed"});
    return;
  }

  // Rate limiting
  const clientIp = req.ip || "unknown";
  const now = Date.now();
  const lastAttempt = rateLimitMap.get(clientIp);

  if (lastAttempt && (now - lastAttempt) < RATE_LIMIT_MS) {
    res.status(429).json({
      success: false,
      error: "Too many requests. Please wait.",
    });
    return;
  }

  rateLimitMap.set(clientIp, now);

  try {
    // Get Firestore reference
    const db = admin.firestore();
    const pixelRef = db.collection("pixelHunt").doc("currentPixel");

    // Check if this is just a username update
    if (req.body.updateOnly && req.body.tiktokUsername) {
      await pixelRef.set({
        tiktokUsername: req.body.tiktokUsername,
      }, {merge: true});

      return res.status(200).json({
        success: true,
        message: "Username updated",
      });
    }

    // Use a transaction to ensure only one person can claim
    const result = await db.runTransaction(async (transaction) => {
      const pixelDoc = await transaction.get(pixelRef);
      const pixelData = pixelDoc.data() || {};

      if (pixelDoc.exists && pixelData.claimed) {
        // Pixel already claimed
        return {
          success: false,
          alreadyClaimed: true,
          claimedBy: pixelData.claimedBy,
          claimedAt: pixelData.claimedAt,
        };
      }

      // Get the current pixel code from Firestore (or use default)
      const pixelCode = pixelData.pixelCode ||
        PIXEL_CONFIG.pixelCode;

      // Get TikTok username from request body if provided
      const tiktokUsername = req.body.tiktokUsername || null;

      // Claim the pixel!
      const claimData = {
        claimed: true,
        claimedBy: req.ip || "unknown",
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: req.get("user-agent") || "unknown",
        tiktokUsername: tiktokUsername,
        // Don't overwrite pixelCode - let admin update it independently
      };

      transaction.set(pixelRef, claimData, {merge: true});

      return {
        success: true,
        code: pixelCode,
        message: "Congratulations! You found the hidden pixel!",
      };
    });

    // Log the claim attempt
    logger.info("Pixel claim attempt", {
      ip: req.ip,
      success: result.success,
      timestamp: new Date().toISOString(),
    });

    // Return the result
    res.status(200).json(result);
  } catch (error) {
    logger.error("Error claiming pixel", error);
    res.status(500).json({
      success: false,
      error: "Failed to claim pixel",
    });
  }
});

/**
 * Reset Pixel Function (for admins only)
 * Call this to start a new hunt
 */
exports.resetPixel = onRequest({
  cors: true,
  maxInstances: 5,
}, async (req, res) => {
  // Add authentication here if needed
  // For now, you can call this manually to reset

  try {
    const db = admin.firestore();
    const pixelRef = db.collection("pixelHunt").doc("currentPixel");

    await pixelRef.set({
      claimed: false,
      claimedBy: null,
      claimedAt: null,
      resetAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Pixel hunt reset");

    res.status(200).json({
      success: true,
      message: "Pixel hunt has been reset. The hunt is on!",
    });
  } catch (error) {
    logger.error("Error resetting pixel", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset pixel",
    });
  }
});

/**
 * Get Analytics Data
 * Fetches real-time and historical data from Google Analytics
 */
exports.getAnalytics = onRequest({
  cors: true,
  maxInstances: 10,
}, async (req, res) => {
  try {
    // Verify authentication (check if user is admin)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({success: false, error: "Unauthorized"});
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      res.status(401).json({success: false, error: "Invalid token"});
      return;
    }

    // Fetch real-time data (active users)
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: GA4_PROPERTY_ID,
      metrics: [{name: "activeUsers"}],
    });

    const activeUsers = (realtimeResponse.rows &&
      realtimeResponse.rows[0] &&
      realtimeResponse.rows[0].metricValues &&
      realtimeResponse.rows[0].metricValues[0] &&
      realtimeResponse.rows[0].metricValues[0].value) || "0";

    // Fetch today's data
    const [todayResponse] = await analyticsDataClient.runReport({
      property: GA4_PROPERTY_ID,
      dateRanges: [{startDate: "today", endDate: "today"}],
      metrics: [
        {name: "totalUsers"},
        {name: "screenPageViews"},
        {name: "averageSessionDuration"},
      ],
    });

    const todayMetrics = (todayResponse.rows &&
      todayResponse.rows[0] &&
      todayResponse.rows[0].metricValues) || [];
    const todayUsers = (todayMetrics[0] && todayMetrics[0].value) || "0";
    const todayPageviews = (todayMetrics[1] && todayMetrics[1].value) || "0";
    const avgSessionDuration = parseFloat(
        (todayMetrics[2] && todayMetrics[2].value) || "0",
    );

    // Fetch 7-day data
    const [weekResponse] = await analyticsDataClient.runReport({
      property: GA4_PROPERTY_ID,
      dateRanges: [{startDate: "7daysAgo", endDate: "today"}],
      metrics: [
        {name: "totalUsers"},
        {name: "sessions"},
        {name: "screenPageViews"},
        {name: "bounceRate"},
      ],
    });

    const weekMetrics = (weekResponse.rows &&
      weekResponse.rows[0] &&
      weekResponse.rows[0].metricValues) || [];
    const week7Users = (weekMetrics[0] && weekMetrics[0].value) || "0";
    const week7Sessions = (weekMetrics[1] && weekMetrics[1].value) || "0";
    const week7Pageviews = (weekMetrics[2] && weekMetrics[2].value) || "0";
    const week7BounceRate = parseFloat(
        (weekMetrics[3] && weekMetrics[3].value) || "0",
    ) * 100;

    // Fetch top pages
    const [pagesResponse] = await analyticsDataClient.runReport({
      property: GA4_PROPERTY_ID,
      dateRanges: [{startDate: "7daysAgo", endDate: "today"}],
      dimensions: [{name: "pagePath"}],
      metrics: [{name: "screenPageViews"}],
      orderBys: [{metric: {metricName: "screenPageViews"}, desc: true}],
      limit: 10,
    });

    const topPages = (pagesResponse.rows && pagesResponse.rows.map((row) => ({
      path: row.dimensionValues[0].value,
      views: parseInt(row.metricValues[0].value),
    }))) || [];

    res.status(200).json({
      success: true,
      data: {
        activeUsers: parseInt(activeUsers),
        todayUsers: parseInt(todayUsers),
        todayPageviews: parseInt(todayPageviews),
        avgSessionDuration: Math.round(avgSessionDuration),
        week7Users: parseInt(week7Users),
        week7Sessions: parseInt(week7Sessions),
        week7Pageviews: parseInt(week7Pageviews),
        week7BounceRate: week7BounceRate,
        topPages: topPages,
      },
    });
  } catch (error) {
    logger.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics data",
      details: error.message,
    });
  }
});
