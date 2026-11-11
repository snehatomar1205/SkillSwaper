const express = require("express");
const router = express.Router();
const { loginAdmin } = require("../controllers/adminController");
const requireAdmin = require("../middleware/requireAdmin");
const { getEventAnalytics } = require("../controllers/eventAnalyticsController");
const {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  publishEvent,
  pauseEvent,
  resumeEvent,
  cancelEvent,
} = require("../controllers/seasonalEventController");
const {
  getDisputeAttachment,
} = require("../controllers/disputeAttachmentController");
const {
  getDisputedRequests,
  resolveDispute,
  requestAdditionalEvidence
} = require("../controllers/adminDisputeController");

router.post("/login", loginAdmin);
router.get("/me", requireAdmin, (req, res) => {
  return res.json({
    success: true,
    admin: req.admin,
  });
});
router.get("/disputes", requireAdmin, getDisputedRequests);
router.patch("/disputes/:id/resolve", requireAdmin, resolveDispute);
router.post("/disputes/:id/request-evidence",requireAdmin,requestAdditionalEvidence);
router.get("/disputes/:id/attachments/:attachmentId",requireAdmin,getDisputeAttachment);
router.post("/events", requireAdmin, createEvent);
router.get("/events", requireAdmin, getAllEvents);
router.get("/events/:id", requireAdmin, getEventById);
router.patch("/events/:id", requireAdmin, updateEvent);
router.patch("/events/:id/publish", requireAdmin, publishEvent);
router.patch("/events/:id/pause", requireAdmin, pauseEvent);
router.patch("/events/:id/resume", requireAdmin, resumeEvent);
router.patch("/events/:id/cancel", requireAdmin, cancelEvent);
router.get("/events/:id/analytics", requireAdmin, getEventAnalytics);

module.exports = router;
