const mongoose = require("mongoose");
const CreditTransaction = require("../models/CreditTransaction");
const User = require("../models/User");
const ExchangeRequest = require("../models/ExchangeRequest");
const {
  isValidDisputeDecision,
  isValidDisputeNotes,
} = require("../utils/disputeValidation");
const {
  canResolveDispute,
} = require("../utils/disputeEligibility");
const { createNotification } = require("../services/notificationService");


const getDisputedRequests = async (req, res, next) => {
  try {
    const requests = await ExchangeRequest.find({
      status: "disputed",
      creditsReserved: true,
    })
      .populate("fromUser", "username email avatarUrl")
      .populate("toUser", "username email avatarUrl")
      .populate("skillPostId", "skillName description")
      .populate("dispute.raisedBy", "username email")
      .populate("dispute.responses.submittedBy", "username email avatarUrl")
      .populate("dispute.evidenceRequests.requestedFrom", "username email avatarUrl")
      .populate("dispute.evidenceRequests.requestedBy", "username email")
      .sort({ "dispute.raisedAt": 1 })
      .lean();

    return res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    return next(error);
  }
};

const resolveDispute = async (req, res, next) => {
  const { decision, notes } = req.body;
  const requestId = req.params.id;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({
      success: false,
      msg: "Invalid request ID",
    });
  }

  if (!isValidDisputeDecision(decision)) {
    return res.status(400).json({
      success: false,
      msg: "Decision must be refund_learner or pay_teacher",
    });
  }

  if (!isValidDisputeNotes(notes)) {
    return res.status(400).json({
      success: false,
      msg: "Notes must be text of at most 2000 characters",
    });
  }

  let session;

  try {
    session = await mongoose.startSession();

    let resolvedRequest;

    await session.withTransaction(async () => {
      // Find the disputed request.
      const request = await ExchangeRequest.findOne({
        _id: requestId,
        status: "disputed",
        creditsReserved: true,
      }).session(session);

      if (!request) {
        const existingRequest =
          await ExchangeRequest.findById(requestId).session(session);

        if (!existingRequest) {
          throw new Error("REQUEST_NOT_FOUND");
        }

        throw new Error("DISPUTE_NOT_RESOLVABLE");
      }

      // Check whether the other participant has responded
      // or the applicable response deadline has expired.
      if (!canResolveDispute(request)) {
        throw new Error("RESPONSE_PERIOD_ACTIVE");
      }

      // Atomically claim the dispute before settlement.
      const claimedRequest = await ExchangeRequest.findOneAndUpdate(
        {
          _id: requestId,
          status: "disputed",
          creditsReserved: true,
          "dispute.resolution.resolvedAt": null,
        },
        {
          $set: {
            "dispute.resolution.resolvedAt": new Date(),
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      if (!claimedRequest) {
        throw new Error("DISPUTE_NOT_RESOLVABLE");
      }

      // Verify the original credit reservation.
      const reservation = await CreditTransaction.findOne({
        requestId: claimedRequest._id,
        type: "reserve",
        direction: "debit",
        userId: claimedRequest.fromUser,
        counterpartyId: claimedRequest.toUser,
        amount: claimedRequest.hoursRequested,
        idempotencyKey: `${claimedRequest._id}:reserve`,
      }).session(session);

      if (!reservation) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      // Prevent duplicate payouts or refunds.
      const existingSettlement = await CreditTransaction.findOne({
        requestId: claimedRequest._id,
        type: { $in: ["payout", "refund"] },
      }).session(session);

      if (existingSettlement) {
        throw new Error("SETTLEMENT_ALREADY_EXISTS");
      }

      const amount = reservation.amount;
      const isRefund = decision === "refund_learner";

      const recipientId = isRefund
        ? claimedRequest.fromUser
        : claimedRequest.toUser;

      const counterpartyId = isRefund
        ? claimedRequest.toUser
        : claimedRequest.fromUser;

      // Credit the correct participant.
      const recipient = await User.findByIdAndUpdate(
        recipientId,
        { $inc: { timeCredits: amount } },
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      if (!recipient) {
        throw new Error("RECIPIENT_NOT_FOUND");
      }

      // Record the settlement in the same transaction.
      await CreditTransaction.create(
        [
          {
            userId: recipientId,
            counterpartyId,
            requestId: claimedRequest._id,
            type: isRefund ? "refund" : "payout",
            direction: "credit",
            amount,
            balanceAfter: recipient.timeCredits,
            idempotencyKey: `${claimedRequest._id}:${
              isRefund ? "refund" : "payout"
            }`,
          },
        ],
        { session }
      );

      // Finalize the dispute.
      claimedRequest.status = "dispute_resolved";
      claimedRequest.creditsReserved = false;
      claimedRequest.dispute.workflowStatus = "resolved";

      claimedRequest.dispute.resolution.decision = decision;
      claimedRequest.dispute.resolution.adminId = req.admin.id;
      claimedRequest.dispute.resolution.notes = notes?.trim() || null;
      claimedRequest.dispute.resolution.resolvedAt = new Date();

      await claimedRequest.save({ session });

      resolvedRequest = claimedRequest;
    });

    return res.json({
      success: true,
      msg:
        decision === "refund_learner"
          ? "Dispute resolved. Credits refunded to the learner."
          : "Dispute resolved. Credits paid to the teacher.",
      request: resolvedRequest,
    });

  } catch (error) {
    if (error.message === "REQUEST_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        msg: "Request not found",
      });
    }

    if (error.message === "DISPUTE_NOT_RESOLVABLE") {
      return res.status(409).json({
        success: false,
        msg: "This dispute is no longer eligible for resolution",
      });
    }

    if (error.message === "RESPONSE_PERIOD_ACTIVE") {
      return res.status(409).json({
        success: false,
        msg: "The other participant's 72-hour response period is still active.",
      });
    }

    if (error.message === "RECIPIENT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        msg: "Credit recipient not found",
      });
    }

    if (error.message === "RESERVATION_NOT_FOUND") {
      return res.status(409).json({
        success: false,
        msg: "Original reservation not found. Manual review is required.",
      });
    }

    if (error.message === "SETTLEMENT_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        msg: "A payout or refund already exists. Manual review is required.",
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "A credit transaction already exists for this resolution",
      });
    }

    return next(error);

  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const requestAdditionalEvidence = async (req, res, next) => {
  const requestId = req.params.id;
  const { requestedFrom, question, dueAt } = req.body;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({
      success: false,
      msg: "Invalid request ID",
    });
  }

  if (!mongoose.isValidObjectId(requestedFrom)) {
    return res.status(400).json({
      success: false,
      msg: "Invalid participant ID",
    });
  }

  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.trim().length > 2000
  ) {
    return res.status(400).json({
      success: false,
      msg: "A question is required (maximum 2000 characters)",
    });
  }

  const deadline = new Date(dueAt);

  if (!dueAt || Number.isNaN(deadline.getTime()) || deadline <= new Date()) {
    return res.status(400).json({
      success: false,
      msg: "A valid future deadline is required",
    });
  }

  try {
    const request = await ExchangeRequest.findOne({
      _id: requestId,
      status: "disputed",
      creditsReserved: true,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        msg: "Open dispute not found",
      });
    }

    const learnerId = String(request.fromUser);
    const teacherId = String(request.toUser);

    if (
      String(requestedFrom) !== learnerId &&
      String(requestedFrom) !== teacherId
    ) {
      return res.status(400).json({
        success: false,
        msg: "Evidence can only be requested from a dispute participant",
      });
    }

    request.dispute.evidenceRequests.push({
      requestedFrom,
      requestedBy: req.admin.id,
      question: question.trim(),
      dueAt: deadline,
      status: "pending",
    });

    request.dispute.workflowStatus = "additional_evidence_requested";

    await request.save();

    await createNotification({
      recipient: requestedFrom,
      actor: req.admin.id,
      type: "dispute_evidence_requested",
      title: "Additional dispute evidence requested",
      message: question.trim(),
      relatedRequest: request._id,
      data: {
        requestId: request._id.toString(),
        dueAt: deadline,
      },
      idempotencyKey: `evidence_request:${request._id}:${request.dispute.evidenceRequests[request.dispute.evidenceRequests.length - 1]._id}`,
    });

    return res.json({
      success: true,
      msg: "Additional evidence requested",
      request,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDisputedRequests,
  resolveDispute,
  requestAdditionalEvidence
};
