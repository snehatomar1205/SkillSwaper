const mongoose = require("mongoose");
const ExchangeRequest = require("../models/ExchangeRequest");
const { cloudinary } = require("../config/cloudinary");

const getDisputeAttachment = async (req, res, next) => {
  const { id: requestId, attachmentId } = req.params;

  if (
    !mongoose.isValidObjectId(requestId) ||
    !mongoose.isValidObjectId(attachmentId)
  ) {
    return res.status(400).json({
      success: false,
      msg: "Invalid request or attachment ID",
    });
  }

  try {
    const request = await ExchangeRequest.findOne({
      _id: requestId,
      status: { $in: ["disputed", "dispute_resolved"] },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        msg: "Dispute not found",
      });
    }

    // Admins can access any dispute attachment.
    const isAdmin = Boolean(req.admin?.id || req.admin?._id);

    // Participants can access attachments only in their own dispute.
    if (!isAdmin) {
      const userId = String(req.user?._id || req.user || "");
      const learnerId = String(request.fromUser);
      const teacherId = String(request.toUser);

      if (userId !== learnerId && userId !== teacherId) {
        return res.status(403).json({
          success: false,
          msg: "You are not authorized to access this attachment",
        });
      }
    }

    let attachment = request.dispute.attachments.id(attachmentId);

    if (!attachment) {
      for (const response of request.dispute.responses || []) {
        attachment = response.attachments.id(attachmentId);

        if (attachment) break;
      }
    }

    if (!attachment) {
      return res.status(404).json({
        success: false,
        msg: "Attachment not found",
      });
    }

    if (
      !attachment.publicId ||
      !attachment.format ||
      !["raw", "image", "video"].includes(attachment.resourceType)
    ) {
      return res.status(400).json({
        success: false,
        msg: "Attachment metadata is incomplete or invalid",
      });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + 300;

    const downloadUrl = cloudinary.utils.private_download_url(
      attachment.publicId,
      attachment.format,
      {
        resource_type: attachment.resourceType,
        type: "authenticated",
        expires_at: expiresAt,
        attachment: true,
      }
    );

    return res.json({
      success: true,
      attachment: {
        id: attachment._id,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        downloadUrl,
        expiresAt,
      },
    });
  } catch (error) {
    console.error(
      "Dispute attachment retrieval failed:",
      error.message
    );

    return next(error);
  }
};

module.exports = {
  getDisputeAttachment,
};