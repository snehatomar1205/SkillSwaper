
const express = require("express");
const auth = require("../middleware/authMiddleware");

const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", auth, getMyNotifications);
router.get("/unread-count", auth, getUnreadNotificationCount);
router.patch("/read-all", auth, markAllNotificationsAsRead);
router.patch("/:notificationId/read", auth, markNotificationAsRead);

module.exports = router;
