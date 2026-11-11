const mongoose = require("mongoose");

const creditTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    counterpartyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExchangeRequest",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["reserve", "payout", "refund"],
      required: true,
    },

    direction: {
      type: String,
      enum: ["debit", "credit"],
      required: true,
      validate: {
        validator: function (direction) {
          if (this.type === "reserve") {
            return direction === "debit";
          }

          return direction === "credit";
        },
        message: "Transaction direction does not match transaction type",
      },
    },

    amount: {
      type: Number,
      required: true,
      min: 0.5,
      validate: {
        validator: Number.isFinite,
        message: "Transaction amount must be finite",
      },
    },

    // Balance immediately after this transaction.
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    // A stable key prevents the same operation from being recorded twice.
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);

creditTransactionSchema.index({
  userId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("CreditTransaction", creditTransactionSchema);
