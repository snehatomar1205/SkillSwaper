
const mongoose = require("mongoose");

const eventRewardSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeasonalEvent",
      required: true,
      index: true,
    },

    participationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventParticipation",
      required: true,
    },

    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: ["teacher", "student"],
      required: true,
    },

    rewardXP: {
      type: Number,
      default: 0,
      min: 0,
    },

    achievementId: {
      type: String,
      default: null,
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },

    awardedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

eventRewardSchema.index({ userId: 1, eventId: 1 });

module.exports = mongoose.model("EventReward", eventRewardSchema);
