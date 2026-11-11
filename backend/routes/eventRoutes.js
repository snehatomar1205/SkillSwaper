
const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { getEventLeaderboard } = require("../controllers/eventLeaderboardController");
const {
  getPublicEvents,
  joinEvent,
  getEventProgress,
} = require("../controllers/seasonalEventUserController");
router.use(auth);
router.get("/", getPublicEvents);
router.post("/:id/join", joinEvent);
router.get("/:id/progress", getEventProgress);
router.get("/:id/leaderboard", getEventLeaderboard);
module.exports = router;
