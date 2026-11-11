const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const uploadDisputeEvidence = require("../middleware/disputeUpload");
const {
  getDisputeAttachment,
} = require("../controllers/disputeAttachmentController");
const {
  createRequest,
  getMyRequests,
  updateRequestStatus,
  confirmCompletion,
  raiseDispute,
  submitDisputeResponse,
  cancelRequest,
  scheduleSession,
  cancelSession,
} = require("../controllers/requestController");

router.post("/", auth, createRequest);
router.get("/me", auth, getMyRequests);
router.put("/:id/status", auth, updateRequestStatus);
router.post("/:id/confirm-completion", auth, confirmCompletion);
router.post("/:id/dispute", auth, uploadDisputeEvidence.array("attachments", 5), raiseDispute);
router.post("/:id/dispute-response", auth, uploadDisputeEvidence.array("attachments", 5), submitDisputeResponse);
router.post("/:id/cancel", auth, cancelRequest);
router.put("/:id/schedule", auth, scheduleSession);
router.post("/:id/cancel-session", auth, cancelSession);
router.get(
  "/:id/dispute/attachments/:attachmentId",
  auth,
  getDisputeAttachment,
);
module.exports = router;
