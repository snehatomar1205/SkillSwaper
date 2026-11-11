
const mongoose = require("mongoose");

const xpTransactionSchema = new mongoose.Schema(
  {
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

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    type: {
      type: String,
      enum: [
        "exchange_completion",
        "milestone_bonus",
        "seasonal_reward",
        "admin_adjustment",
      ],
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExchangeRequest",
      default: null,
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

xpTransactionSchema.index({ userId: 1, role: 1, createdAt: -1 });

module.exports = mongoose.model("XPTransaction", xpTransactionSchema);
