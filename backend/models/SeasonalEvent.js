
const mongoose = require("mongoose");

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    conditionType: {
      type: String,
      enum: [
        "completed_exchanges",
        "teaching_sessions",
        "learning_sessions",
        "xp_earned",
        "skill_category_sessions",
      ],
      required: true,
    },

    target: {
      type: Number,
      required: true,
      min: 1,
    },

    skillCategory: {
      type: String,
      trim: true,
      default: null,
    },

    eligibleRole: {
      type: String,
      enum: ["teacher", "student", "both"],
      default: "both",
    },

    rewardXP: {
      type: Number,
      required: true,
      min: 0,
    },

    rewardAchievementId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

const seasonalEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    bannerUrl: {
      type: String,
      default: "",
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "scheduled",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },

    eligibleRoles: {
      type: [String],
      enum: ["teacher", "student"],
      default: ["teacher", "student"],
    },

    challenges: {
      type: [challengeSchema],
      default: [],
    },

    rulesVersion: {
      type: Number,
      default: 1,
      min: 1,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

seasonalEventSchema.index({ status: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("SeasonalEvent", seasonalEventSchema);