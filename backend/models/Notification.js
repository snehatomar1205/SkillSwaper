const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "request_received",
        "request_accepted",
        "request_rejected",
        "request_cancelled",
        "session_proposed",
        "session_confirmed",
        "session_rejected",
        "session_cancelled",
        "completion_confirmed",
        "credits_paid",
        "credits_refunded",
        "dispute_opened",
        "dispute_resolved",
        "achievement_unlocked",
        "learner_level_up",
        "teacher_level_up",
        "seasonal_reward",
      ],
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExchangeRequest",
      default: null,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    readAt: {
      type: Date,
      default: null,
    },

    // Unique business-event key prevents duplicate notifications.
    idempotencyKey: {
      type: String,
      required: true,
      immutable: true,
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: true,
  },
);

// Efficient notification history and unread-count queries.
notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

notificationSchema.index({
  recipient: 1,
  readAt: 1,
  createdAt: -1,
});

// A business event can create at most one notification per recipient.
notificationSchema.index({ recipient: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model("Notification", notificationSchema);
