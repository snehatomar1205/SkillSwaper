const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      enum: ["image", "raw"],
      default: "raw",
    },
    format: {
      type: String,
      required: true,
      maxlength: 10,
    },
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      maxlength: 150,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
      max: 5 * 1024 * 1024,
    },
  },
  { _id: true },
);

const disputeResponseSchema = new mongoose.Schema(
  {
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: (files) => files.length <= 5,
        message: "A submission can contain at most 5 attachments",
      },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false },
);

const evidenceRequestSchema = new mongoose.Schema(
  {
    requestedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    dueAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "responded", "expired"],
      default: "pending",
    },
    responseId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: false },
);

const exchangeRequestSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    skillPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SkillPost",
      required: true,
    },

    hoursRequested: {
      type: Number,
      required: true,
      min: 0.5,
      validate: {
        validator: Number.isFinite,
        message: "Hours requested must be a finite number",
      },
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "declined",
        "completed",
        "cancelled",
        "disputed",
        "dispute_resolved",
      ],
      default: "pending",
      index: true,
    },

    creditsReserved: {
      type: Boolean,
      default: false,
    },

    learnerConfirmedCompletion: {
      type: Boolean,
      default: false,
    },

    teacherConfirmedCompletion: {
      type: Boolean,
      default: false,
    },

    progressionAwarded: {
      type: Boolean,
      default: false,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    dispute: {
      raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      reason: {
        type: String,
        default: null,
        maxlength: 2000,
      },

      evidence: {
        type: String,
        default: null,
        maxlength: 5000,
      },

      attachments: {
        type: [attachmentSchema],
        default: [],
        validate: {
          validator: (files) => files.length <= 5,
          message: "A dispute can contain at most 5 attachments",
        },
      },

      raisedAt: {
        type: Date,
        default: null,
      },

      initialResponseDueAt: {
        type: Date,
        default: null,
      },

      workflowStatus: {
        type: String,
        enum: [
          "awaiting_other_party_response",
          "awaiting_admin_review",
          "additional_evidence_requested",
          "resolved",
        ],
        default: "awaiting_other_party_response",
      },

      responses: {
        type: [disputeResponseSchema],
        default: [],
        validate: {
          validator: (responses) => responses.length <= 100,
          message: "Too many dispute responses",
        },
      },

      evidenceRequests: {
        type: [evidenceRequestSchema],
        default: [],
        validate: {
          validator: (requests) => requests.length <= 50,
          message: "Too many evidence requests",
        },
      },

      resolution: {
        decision: {
          type: String,
          enum: ["refund_learner", "pay_teacher", null],
          default: null,
        },

        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Admin",
          default: null,
        },

        notes: {
          type: String,
          default: null,
          maxlength: 2000,
        },

        resolvedAt: {
          type: Date,
          default: null,
        },
      },
    },

    sessionSchedule: {
      scheduledAt: {
        type: Date,
        default: null,
      },
      proposedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      status: {
        type: String,
        enum: ["unscheduled", "proposed", "confirmed", "rejected"],
        default: "unscheduled",
      },
      note: {
        type: String,
        default: null,
        maxlength: 500,
      },
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    chatRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

exchangeRequestSchema.index({
  fromUser: 1,
  createdAt: -1,
});

exchangeRequestSchema.index({
  toUser: 1,
  createdAt: -1,
});

module.exports = mongoose.model("ExchangeRequest", exchangeRequestSchema);
