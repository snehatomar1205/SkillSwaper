
const express = require("express");
const { authLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const upload = require("../middleware/multer");
const auth = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
  getAchievements,
  getLeaderboard,
  getGamificationProfile,
  getXPHistory,
} = require("../controllers/authController");

// Authentication
router.post(
  "/register",
  authLimiter,
  upload.single("avatar"),
  registerUser
);

router.post(
  "/login",
  authLimiter,
  loginUser
);

router.post(
  "/refresh",
  authLimiter,
  refreshAccessToken
);

router.post(
  "/logout",
  authLimiter,
  logoutUser
);

// User profile
router.get(
  "/me",
  auth,
  getCurrentUser
);

// Achievements
router.get(
  "/achievements",
  auth,
  getAchievements
);

// Gamification profile
router.get(
  "/gamification",
  auth,
  getGamificationProfile
);

// Teacher and student leaderboards
router.get(
  "/leaderboard/:role",
  auth,
  getLeaderboard
);

// XP transaction history
router.get(
  "/xp-history",
  auth,
  getXPHistory
);

module.exports = router;
