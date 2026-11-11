
const mongoose = require("mongoose");

const challengeProgressSchema = new mongoose.Schema(
  {
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    currentProgress: {
      type: Number,
      default: 0,
      min: 0,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    rewardClaimed: {
      type: Boolean,
      default: false,
    },

    rewardClaimedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const eventParticipationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeasonalEvent",
      required: true,
      index: true,
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

    challenges: {
      type: [challengeProgressSchema],
      default: [],
    },

    totalRewardXP: {
      type: Number,
      default: 0,
      min: 0,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One participation record per user per event.
eventParticipationSchema.index(
  { eventId: 1, userId: 1, role: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "EventParticipation",
  eventParticipationSchema
);
