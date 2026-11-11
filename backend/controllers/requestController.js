const mongoose = require("mongoose");
const ExchangeRequest = require("../models/ExchangeRequest");
const CreditTransaction = require("../models/CreditTransaction");
const SkillPost = require("../models/SkillPost");
const User = require("../models/User");
const ChatRoom = require("../models/ChatRoom");
const { isValidDisputeEvidence } = require("../utils/disputeValidation");
const { createNotification } = require("../services/notificationService");
const {
  awardCompletedChallengeRewards,
} = require("../services/eventRewardService");
const {
  updateProgression,
  sendProgressionNotifications,
} = require("../services/progressionService");
const { cleanupDisputeUploads } = require("../utils/disputeUploadCleanup");
const {
  updateEventProgress,
  updateEventXPProgress,
} = require("../services/eventProgressService");
// Create a new exchange request.
exports.createRequest = async (req, res) => {
  const { skillPostId, hoursRequested } = req.body;

  try {
    if (
      !mongoose.isValidObjectId(skillPostId) ||
      typeof hoursRequested !== "number" ||
      !Number.isFinite(hoursRequested) ||
      hoursRequested < 0.5
    ) {
      return res.status(400).json({
        msg: "A valid skill post and at least 0.5 hours are required",
      });
    }

    const post = await SkillPost.findById(skillPostId);

    if (!post) {
      return res.status(404).json({
        msg: "Skill post not found",
      });
    }

    const fromUser = String(req.user);
    const toUser = String(post.userId);

    if (toUser === fromUser) {
      return res.status(400).json({
        msg: "Cannot request your own skill",
      });
    }

    const existingRequest = await ExchangeRequest.findOne({
      skillPostId,
      fromUser,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingRequest) {
      return res.status(409).json({
        msg: "You have already requested this skill",
      });
    }

    const match = (post.description || "").match(/min\s*(\d+)/i);

    if (match && hoursRequested < Number(match[1])) {
      return res.status(400).json({
        msg: `Minimum ${Number(match[1])} hours required for this skill`,
      });
    }

    const newRequest = await ExchangeRequest.create({
      fromUser,
      toUser,
      skillPostId,
      hoursRequested,
    });

    await createNotification({
      recipient: toUser,
      actor: fromUser,
      type: "request_received",
      title: "New exchange request",
      message: "Someone has sent you a skill-exchange request.",
      relatedRequest: newRequest._id,
      data: {
        requestId: newRequest._id.toString(),
      },
      idempotencyKey: `request_received:${newRequest._id}`,
    });

    return res.status(201).json(newRequest);
  } catch (err) {
    console.error("Create request failed:", err.message);

    return res.status(500).json({
      msg: "Failed to create exchange request",
    });
  }
};

// Retrieve requests sent or received by the logged-in user.
exports.getMyRequests = async (req, res) => {
  try {
    const myRequests = await ExchangeRequest.find({
      $or: [{ fromUser: req.user }, { toUser: req.user }],
    })
      .populate("fromUser", "username avatarUrl")
      .populate("toUser", "username avatarUrl")
      .populate("skillPostId", "skillName")
      .sort({ createdAt: -1 });

    return res.json(myRequests);
  } catch (err) {
    console.error("Get requests failed:", err.message);

    return res.status(500).json({
      msg: "Failed to retrieve exchange requests",
    });
  }
};

exports.updateRequestStatus = async (req, res) => {
  const { status } = req.body;
  const requestId = req.params.id;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({
      msg: "Invalid request ID",
    });
  }

  if (!["accepted", "declined"].includes(status)) {
    return res.status(400).json({
      msg: "Only accepted or declined status is allowed",
    });
  }

  let session;

  let updatedRequest;

  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const request =
        await ExchangeRequest.findById(requestId).session(session);

      if (!request) {
        const error = new Error("REQUEST_NOT_FOUND");
        throw error;
      }

      if (String(request.toUser) !== String(req.user)) {
        const error = new Error("NOT_AUTHORIZED");
        throw error;
      }

      if (request.status !== "pending") {
        const error = new Error("REQUEST_NOT_PENDING");
        throw error;
      }

      if (status === "declined") {
        request.status = "declined";
        await request.save({ session });

        updatedRequest = request;
        return;
      }

      if (request.creditsReserved) {
        const error = new Error("CREDITS_ALREADY_RESERVED");
        throw error;
      }

      const amount = request.hoursRequested;

      // Atomically debit the learner only if sufficient credits exist.
      const learner = await User.findOneAndUpdate(
        {
          _id: request.fromUser,
          timeCredits: { $gte: amount },
        },
        {
          $inc: { timeCredits: -amount },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!learner) {
        const existingLearner = await User.findById(request.fromUser).session(
          session,
        );

        const error = new Error(
          existingLearner ? "INSUFFICIENT_CREDITS" : "LEARNER_NOT_FOUND",
        );

        throw error;
      }

      const teacherExists = await User.exists({
        _id: request.toUser,
      }).session(session);

      if (!teacherExists) {
        const error = new Error("TEACHER_NOT_FOUND");
        throw error;
      }

      // Record the reservation in the ledger.
      await CreditTransaction.create(
        [
          {
            userId: request.fromUser,
            counterpartyId: request.toUser,
            requestId: request._id,
            type: "reserve",
            direction: "debit",
            amount,
            balanceAfter: learner.timeCredits,
            idempotencyKey: `${request._id}:reserve`,
          },
        ],
        { session },
      );

      // Create the chat room in the same transaction.
      const [room] = await ChatRoom.create(
        [
          {
            requestId: request._id,
            participants: [request.fromUser, request.toUser],
          },
        ],
        { session },
      );

      request.status = "accepted";
      request.creditsReserved = true;
      request.acceptedAt = new Date();
      request.chatRoomId = room._id;

      await request.save({ session });

      updatedRequest = request;
    });

    const notificationRecipient = String(updatedRequest.fromUser);
    const accepted = status === "accepted";

    await createNotification({
      recipient: notificationRecipient,
      actor: String(req.user),
      type: accepted ? "request_accepted" : "request_rejected",
      title: accepted ? "Request accepted" : "Request declined",
      message: accepted
        ? "Your skill-exchange request was accepted."
        : "Your skill-exchange request was declined.",
      relatedRequest: updatedRequest._id,
      data: {
        requestId: updatedRequest._id.toString(),
        status: updatedRequest.status,
      },
      idempotencyKey: `request_status:${updatedRequest._id}:${updatedRequest.status}`,
    });

    return res.json({
      msg:
        status === "accepted"
          ? "Request accepted and credits reserved"
          : "Request declined",
      request: updatedRequest,
    });
  } catch (err) {
    console.error("Update request failed:", err.message);

    const errors = {
      REQUEST_NOT_FOUND: [404, "Request not found"],
      NOT_AUTHORIZED: [403, "Not authorized"],
      REQUEST_NOT_PENDING: [409, "Only pending requests can be updated"],
      CREDITS_ALREADY_RESERVED: [409, "Credits have already been reserved"],
      INSUFFICIENT_CREDITS: [400, "Not enough time credits"],
      LEARNER_NOT_FOUND: [404, "Learner not found"],
      TEACHER_NOT_FOUND: [404, "Teacher not found"],
    };

    const result = errors[err.message];

    if (result) {
      return res.status(result[0]).json({
        msg: result[1],
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        msg: "This credit transaction already exists",
      });
    }

    return res.status(500).json({
      msg: "Failed to update exchange request",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

exports.confirmCompletion = async (req, res) => {
  const requestId = req.params.id;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({
      success: false,
      msg: "Invalid request ID",
    });
  }

  let session;

  try {
    session = await mongoose.startSession();

    let result;
    let progressionResults = [];
    let completedRequest = null;
    let seasonalRewards = [];

    await session.withTransaction(async () => {
      // Reset callback-local results in case MongoDB retries.
      progressionResults = [];
      completedRequest = null;
      seasonalRewards = [];

      const request =
        await ExchangeRequest.findById(requestId).session(session);

      if (!request) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      const userId = String(req.user);
      const learnerId = String(request.fromUser);
      const teacherId = String(request.toUser);

      if (userId !== learnerId && userId !== teacherId) {
        throw new Error("NOT_AUTHORIZED");
      }

      if (request.status === "completed") {
        result = {
          msg: "Session already completed",
          request,
        };
        return;
      }

      if (request.status === "disputed") {
        throw new Error("SESSION_DISPUTED");
      }

      if (request.status !== "accepted" || request.creditsReserved !== true) {
        throw new Error("SESSION_NOT_ELIGIBLE");
      }

      // Record the participant's confirmation.
      if (userId === learnerId) {
        request.learnerConfirmedCompletion = true;
      } else {
        request.teacherConfirmedCompletion = true;
      }

      const bothConfirmed =
        request.learnerConfirmedCompletion &&
        request.teacherConfirmedCompletion;

      if (!bothConfirmed) {
        await request.save({ session });

        result = {
          msg: "Completion confirmation recorded. Waiting for the other participant.",
          request,
        };
        return;
      }

      // Atomically claim completion.
      const claimedRequest = await ExchangeRequest.findOneAndUpdate(
        {
          _id: request._id,
          status: "accepted",
          creditsReserved: true,
          progressionAwarded: false,
        },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            learnerConfirmedCompletion: true,
            teacherConfirmedCompletion: true,
            creditsReserved: false,
            progressionAwarded: true,
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!claimedRequest) {
        throw new Error("SESSION_NOT_ELIGIBLE");
      }

      // Transfer time credits to the teacher.
      const amount = claimedRequest.hoursRequested;

      const teacher = await User.findByIdAndUpdate(
        claimedRequest.toUser,
        { $inc: { timeCredits: amount } },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!teacher) {
        throw new Error("TEACHER_NOT_FOUND");
      }

      // Record the credit payout.
      await CreditTransaction.create(
        [
          {
            userId: claimedRequest.toUser,
            counterpartyId: claimedRequest.fromUser,
            requestId: claimedRequest._id,
            type: "payout",
            direction: "credit",
            amount,
            balanceAfter: teacher.timeCredits,
            idempotencyKey: `${claimedRequest._id}:payout`,
          },
        ],
        { session },
      );

      // Update progression for both participants.
      const [learnerProgress, teacherProgress] = await Promise.all([
        updateProgression(
          claimedRequest.fromUser,
          "learner",
          claimedRequest._id,
          session,
        ),

        updateProgression(
          claimedRequest.toUser,
          "teacher",
          claimedRequest._id,
          session,
        ),
      ]);

      progressionResults = [learnerProgress, teacherProgress];

      // Fetch the skill post for category-based challenges.
      const skillPost = await SkillPost.findById(
        claimedRequest.skillPostId,
      ).session(session);

      // Update exchange/session-based seasonal challenges.
      let sessionEventResults = [];

      if (skillPost) {
        sessionEventResults = await Promise.all([
          updateEventProgress({
            userId: claimedRequest.fromUser,
            role: "learner",
            request: claimedRequest,
            skillPost,
            session,
          }),

          updateEventProgress({
            userId: claimedRequest.toUser,
            role: "teacher",
            request: claimedRequest,
            skillPost,
            session,
          }),
        ]);
      }

      // Update XP-based seasonal challenges.
      const xpEventResults = await Promise.all([
        updateEventXPProgress({
          userId: claimedRequest.fromUser,
          role: "student",
          xpEarned: learnerProgress.xpEarned,
          session,
        }),

        updateEventXPProgress({
          userId: claimedRequest.toUser,
          role: "teacher",
          xpEarned: teacherProgress.xpEarned,
          session,
        }),
      ]);

      // Collect unique participation IDs.
      const participationIds = new Set();

      [...sessionEventResults.flat(), ...xpEventResults.flat()].forEach(
        (item) => {
          participationIds.add(String(item.participationId));
        },
      );

      for (const participationId of participationIds) {
        const rewards = await awardCompletedChallengeRewards({
          participationId,
          session,
        });

        seasonalRewards.push(...rewards);
      }

      completedRequest = claimedRequest;

      result = {
        msg: "Both participants confirmed. Credits settled.",
        request: claimedRequest,
      };
    });

    // Send notifications only after the transaction commits.
    if (completedRequest) {
      const requestIdString = completedRequest._id.toString();
      const learnerId = String(completedRequest.fromUser);
      const teacherId = String(completedRequest.toUser);

      await Promise.all([
        createNotification({
          recipient: learnerId,
          actor: teacherId,
          type: "completion_confirmed",
          title: "Session completed",
          message: "Both participants confirmed completion of the exchange.",
          relatedRequest: completedRequest._id,
          data: {
            requestId: requestIdString,
            status: "completed",
          },
          idempotencyKey: `completion:${requestIdString}:learner`,
        }),

        createNotification({
          recipient: teacherId,
          actor: learnerId,
          type: "credits_paid",
          title: "Credits received",
          message: `${completedRequest.hoursRequested} time credits have been added to your balance.`,
          relatedRequest: completedRequest._id,
          data: {
            requestId: requestIdString,
            amount: completedRequest.hoursRequested,
          },
          idempotencyKey: `completion:${requestIdString}:teacher`,
        }),

        ...progressionResults.map(sendProgressionNotifications),
        ...seasonalRewards.flatMap((reward) => {
          const notifications = [
            createNotification({
              recipient: String(reward.userId),
              type: "seasonal_reward",
              title: "Seasonal challenge completed!",
              message: `You earned ${reward.rewardXP} XP in ${reward.eventTitle}: ${reward.challengeTitle}.`,
              data: {
                eventId: String(reward.eventId),
                challengeId: String(reward.challengeId),
                rewardXP: reward.rewardXP,
              },
              idempotencyKey: `seasonal_reward:${reward.eventId}:${reward.challengeId}:${reward.userId}`,
            }),
          ];

          if (reward.achievementId) {
            notifications.push(
              createNotification({
                recipient: String(reward.userId),
                type: "achievement_unlocked",
                title: "Achievement unlocked!",
                message: `You unlocked ${reward.achievementId} through ${reward.eventTitle}.`,
                data: {
                  eventId: String(reward.eventId),
                  challengeId: String(reward.challengeId),
                  achievementId: reward.achievementId,
                },
                idempotencyKey: `seasonal_achievement:${reward.eventId}:${reward.challengeId}:${reward.userId}`,
              }),
            );
          }
          return notifications;
        }),
      ]);
    }

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("Completion confirmation failed:", err.message);

    const errors = {
      REQUEST_NOT_FOUND: [404, "Request not found"],
      NOT_AUTHORIZED: [403, "Not authorized"],
      SESSION_NOT_ELIGIBLE: [
        409,
        "Only accepted requests with reserved credits can be completed",
      ],
      TEACHER_NOT_FOUND: [404, "Teacher not found"],
      SESSION_DISPUTED: [
        409,
        "This session is under dispute. Completion is blocked until admin resolution.",
      ],
    };

    const error = errors[err.message];

    if (error) {
      return res.status(error[0]).json({
        success: false,
        msg: error[1],
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "A payout or reward transaction already exists",
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Failed to confirm session completion",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

exports.raiseDispute = async (req, res) => {
  const requestId = req.params.id;
  const { reason, evidence } = req.body;
  const uploadedFiles = req.files || [];

  if (!mongoose.isValidObjectId(requestId)) {
    await cleanupDisputeUploads(uploadedFiles);

    return res.status(400).json({
      success: false,
      msg: "Invalid request ID",
    });
  }

  if (
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.trim().length > 2000
  ) {
    await cleanupDisputeUploads(uploadedFiles);

    return res.status(400).json({
      success: false,
      msg: "A reason is required (maximum 2000 characters)",
    });
  }

  if (!isValidDisputeEvidence(evidence)) {
    await cleanupDisputeUploads(uploadedFiles);

    return res.status(400).json({
      success: false,
      msg: "Evidence must be text of at most 5000 characters",
    });
  }

  const attachments = uploadedFiles.map((file) => ({
    publicId: file.filename || file.public_id,
    resourceType: file.resource_type || "raw",
    format: (file.format || file.originalname.split(".").pop()).toLowerCase(),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

  if (
    attachments.some(
      (file) =>
        !file.publicId || !file.originalName || !file.mimeType || !file.format,
    )
  ) {
    await cleanupDisputeUploads(uploadedFiles);

    return res.status(400).json({
      success: false,
      msg: "Failed to process uploaded evidence files",
    });
  }

  let session;
  let updatedRequest;
  let submissionSaved = false;

  try {
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const existingRequest =
        await ExchangeRequest.findById(requestId).session(session);

      if (!existingRequest) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      const userId = String(req.user);
      const learnerId = String(existingRequest.fromUser);
      const teacherId = String(existingRequest.toUser);

      if (userId !== learnerId && userId !== teacherId) {
        throw new Error("NOT_AUTHORIZED");
      }

      const request = await ExchangeRequest.findOneAndUpdate(
        {
          _id: requestId,
          status: "accepted",
          creditsReserved: true,
        },
        {
          $set: {
            status: "disputed",
            "dispute.raisedBy": userId,
            "dispute.reason": reason.trim(),
            "dispute.evidence": evidence?.trim() || null,
            "dispute.attachments": attachments,
            "dispute.raisedAt": new Date(),
            "dispute.workflowStatus": "awaiting_other_party_response",
            "dispute.initialResponseDueAt": new Date(
              Date.now() + 72 * 60 * 60 * 1000,
            ),
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!request) {
        throw new Error("SESSION_NOT_ELIGIBLE");
      }

      updatedRequest = request;
    });

    submissionSaved = true;

    const userId = String(req.user);
    const recipient =
      userId === String(updatedRequest.fromUser)
        ? String(updatedRequest.toUser)
        : String(updatedRequest.fromUser);

    await createNotification({
      recipient,
      actor: userId,
      type: "dispute_opened",
      title: "Session dispute opened",
      message:
        "A dispute has been raised for your exchange. Reserved credits remain locked pending admin review.",
      relatedRequest: updatedRequest._id,
      data: {
        requestId: updatedRequest._id.toString(),
        status: "disputed",
      },
      idempotencyKey: `dispute_opened:${updatedRequest._id}`,
    });

    return res.json({
      success: true,
      msg: "Dispute submitted. Reserved credits remain locked pending admin review.",
      request: updatedRequest,
    });
  } catch (err) {
    // Delete uploaded files only if the database submission failed.
    if (!submissionSaved) {
      await cleanupDisputeUploads(uploadedFiles);
    }

    console.error("Dispute submission failed:", err.message);

    const errors = {
      REQUEST_NOT_FOUND: [404, "Request not found"],
      NOT_AUTHORIZED: [403, "Not authorized"],
      SESSION_NOT_ELIGIBLE: [
        409,
        "Only accepted sessions with reserved credits can be disputed",
      ],
    };

    const error = errors[err.message];

    if (error) {
      return res.status(error[0]).json({
        success: false,
        msg: error[1],
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Failed to submit dispute",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

exports.cancelRequest = async (req, res) => {
  const requestId = req.params.id;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({
      msg: "Invalid request ID",
    });
  }

  let session;
  let cancelledRequest;
  let refunded = false;

  try {
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const request =
        await ExchangeRequest.findById(requestId).session(session);

      if (!request) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      const userId = String(req.user);
      const learnerId = String(request.fromUser);
      const teacherId = String(request.toUser);

      if (userId !== learnerId && userId !== teacherId) {
        throw new Error("NOT_AUTHORIZED");
      }

      // Pending requests can be cancelled by either participant.
      if (request.status === "pending") {
        request.status = "cancelled";
        await request.save({ session });

        cancelledRequest = request;
        return;
      }

      // Accepted requests can only be cancelled by the learner.
      if (request.status !== "accepted") {
        throw new Error("REQUEST_NOT_CANCELLABLE");
      }

      if (userId !== learnerId) {
        throw new Error("ONLY_LEARNER_CAN_CANCEL");
      }

      if (!request.creditsReserved) {
        throw new Error("CREDITS_NOT_RESERVED");
      }

      // Claim cancellation before issuing the refund.
      const claimedRequest = await ExchangeRequest.findOneAndUpdate(
        {
          _id: request._id,
          status: "accepted",
          creditsReserved: true,
        },
        {
          $set: {
            status: "cancelled",
            creditsReserved: false,
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!claimedRequest) {
        throw new Error("REQUEST_NOT_CANCELLABLE");
      }

      const amount = claimedRequest.hoursRequested;

      const learner = await User.findByIdAndUpdate(
        claimedRequest.fromUser,
        { $inc: { timeCredits: amount } },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!learner) {
        throw new Error("LEARNER_NOT_FOUND");
      }

      await CreditTransaction.create(
        [
          {
            userId: claimedRequest.fromUser,
            counterpartyId: claimedRequest.toUser,
            requestId: claimedRequest._id,
            type: "refund",
            direction: "credit",
            amount,
            balanceAfter: learner.timeCredits,
            idempotencyKey: `${claimedRequest._id}:refund`,
          },
        ],
        { session },
      );

      cancelledRequest = claimedRequest;
      refunded = true;
    });

    // Notify the other participant after the transaction commits.
    const userId = String(req.user);
    const learnerId = String(cancelledRequest.fromUser);
    const teacherId = String(cancelledRequest.toUser);

    const recipient = userId === learnerId ? teacherId : learnerId;

    const requestIdString = cancelledRequest._id.toString();

    await createNotification({
      recipient,
      actor: userId,
      type: "request_cancelled",
      title: "Exchange request cancelled",
      message: "Your exchange partner cancelled the request.",
      relatedRequest: cancelledRequest._id,
      data: {
        requestId: requestIdString,
        status: "cancelled",
      },
      idempotencyKey: `request_cancelled:${requestIdString}`,
    });

    // Notify the learner when reserved credits have been refunded.
    if (refunded) {
      await createNotification({
        recipient: learnerId,
        actor: userId,
        type: "credits_refunded",
        title: "Credits refunded",
        message: `${cancelledRequest.hoursRequested} time credits have been returned to your balance.`,
        relatedRequest: cancelledRequest._id,
        data: {
          requestId: requestIdString,
          amount: cancelledRequest.hoursRequested,
        },
        idempotencyKey: `credits_refunded:${requestIdString}`,
      });
    }

    return res.json({
      success: true,
      msg: refunded
        ? "Request cancelled and credits refunded successfully"
        : "Request cancelled successfully",
      request: cancelledRequest,
    });
  } catch (err) {
    console.error("Cancel request failed:", err.message);

    const errors = {
      REQUEST_NOT_FOUND: [404, "Request not found"],
      NOT_AUTHORIZED: [403, "Not authorized"],
      REQUEST_NOT_CANCELLABLE: [
        409,
        "This request cannot be cancelled in its current state",
      ],
      ONLY_LEARNER_CAN_CANCEL: [
        403,
        "Only the learner can cancel an accepted request",
      ],
      CREDITS_NOT_RESERVED: [409, "No reserved credits to refund"],
      LEARNER_NOT_FOUND: [404, "Learner not found"],
    };

    const error = errors[err.message];

    if (error) {
      return res.status(error[0]).json({
        msg: error[1],
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        msg: "A refund transaction already exists for this request",
      });
    }

    return res.status(500).json({
      msg: "Failed to cancel request",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const scheduleSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, note, action } = req.body;
    const userId = String(req.user);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        msg: "Invalid request ID",
      });
    }

    const request = await ExchangeRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        msg: "Request not found",
      });
    }

    const isParticipant =
      String(request.fromUser) === userId || String(request.toUser) === userId;

    if (!isParticipant) {
      return res.status(403).json({
        msg: "Not authorized",
      });
    }

    if (request.status !== "accepted") {
      return res.status(400).json({
        msg: "Only accepted requests can be scheduled",
      });
    }

    const currentSchedule = request.sessionSchedule;

    // Confirm or reject an existing proposal.
    if (action === "confirm" || action === "reject") {
      if (currentSchedule.status !== "proposed") {
        return res.status(400).json({
          msg: "There is no pending session proposal",
        });
      }

      if (String(currentSchedule.proposedBy) === userId) {
        return res.status(400).json({
          msg: "You cannot respond to your own proposal",
        });
      }

      const proposedBy = String(currentSchedule.proposedBy);
      const proposedTime = currentSchedule.scheduledAt;

      if (action === "confirm") {
        currentSchedule.status = "confirmed";
        currentSchedule.confirmedBy = userId;
      } else {
        currentSchedule.status = "rejected";
        currentSchedule.confirmedBy = null;
      }

      // Persist the change before creating the notification.
      await request.save();

      await createNotification({
        recipient: proposedBy,
        actor: userId,
        type: action === "confirm" ? "session_confirmed" : "session_rejected",
        title:
          action === "confirm"
            ? "Session confirmed"
            : "Session proposal rejected",
        message:
          action === "confirm"
            ? "Your proposed session time has been confirmed."
            : "Your proposed session time was rejected.",
        relatedRequest: request._id,
        data: {
          requestId: request._id.toString(),
          scheduledAt: proposedTime,
        },
        idempotencyKey: `session_response:${request._id}:${new Date(proposedTime).getTime()}:${action}`,
      });

      return res.status(200).json({
        msg:
          action === "confirm"
            ? "Session confirmed"
            : "Session proposal rejected",
        sessionSchedule: currentSchedule,
      });
    }

    // Validate action for a new proposal.
    if (action && action !== "propose") {
      return res.status(400).json({
        msg: "Invalid scheduling action",
      });
    }

    // Prevent overwriting another participant's pending proposal.
    if (
      currentSchedule.status === "proposed" &&
      String(currentSchedule.proposedBy) !== userId
    ) {
      return res.status(400).json({
        msg: "Respond to the pending proposal before proposing another time",
      });
    }

    if (!scheduledAt) {
      return res.status(400).json({
        msg: "A session date and time are required",
      });
    }

    const proposedDate = new Date(scheduledAt);

    if (Number.isNaN(proposedDate.getTime()) || proposedDate <= new Date()) {
      return res.status(400).json({
        msg: "Session time must be a valid future date",
      });
    }

    if (note !== undefined && note !== null && typeof note !== "string") {
      return res.status(400).json({
        msg: "Note must be text",
      });
    }

    if (typeof note === "string" && note.trim().length > 500) {
      return res.status(400).json({
        msg: "Note cannot exceed 500 characters",
      });
    }

    // Save the new proposal.
    request.sessionSchedule = {
      scheduledAt: proposedDate,
      proposedBy: userId,
      confirmedBy: null,
      status: "proposed",
      note: typeof note === "string" ? note.trim() || null : null,
    };

    await request.save();

    const recipient =
      userId === String(request.fromUser)
        ? String(request.toUser)
        : String(request.fromUser);

    await createNotification({
      recipient,
      actor: userId,
      type: "session_proposed",
      title: "New session proposal",
      message: "Your exchange partner proposed a session time.",
      relatedRequest: request._id,
      data: {
        requestId: request._id.toString(),
        scheduledAt: proposedDate,
      },
      idempotencyKey: `session_proposed:${request._id}:${proposedDate.getTime()}`,
    });

    return res.status(200).json({
      msg: "Session time proposed",
      sessionSchedule: request.sessionSchedule,
    });
  } catch (error) {
    console.error("Schedule session error:", error);

    return res.status(500).json({
      msg: "Server error",
    });
  }
};

exports.submitDisputeResponse = async (req, res) => {
  const requestId = req.params.id;
  const { message, evidenceRequestId } = req.body;
  const uploadedFiles = req.files || [];

  const cleanup = async () => {
    await cleanupDisputeUploads(uploadedFiles);
  };

  if (!mongoose.isValidObjectId(requestId)) {
    await cleanup();

    return res.status(400).json({
      success: false,
      msg: "Invalid request ID",
    });
  }

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.trim().length > 5000
  ) {
    await cleanup();

    return res.status(400).json({
      success: false,
      msg: "A response is required (maximum 5000 characters)",
    });
  }

  if (
    evidenceRequestId !== undefined &&
    !mongoose.isValidObjectId(evidenceRequestId)
  ) {
    await cleanup();

    return res.status(400).json({
      success: false,
      msg: "Invalid evidence request ID",
    });
  }

  const attachments = uploadedFiles.map((file) => ({
    publicId: file.filename || file.public_id,
    resourceType: file.resource_type || "raw",
    format: (file.format || file.originalname.split(".").pop()).toLowerCase(),
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

  if (
    attachments.some(
      (file) =>
        !file.publicId || !file.originalName || !file.mimeType || !file.format,
    )
  ) {
    await cleanup();

    return res.status(400).json({
      success: false,
      msg: "Failed to process uploaded evidence files",
    });
  }

  let submissionSaved = false;

  try {
    const request = await ExchangeRequest.findOne({
      _id: requestId,
      status: "disputed",
      creditsReserved: true,
    });

    if (!request) {
      await cleanup();

      return res.status(404).json({
        success: false,
        msg: "Open dispute not found",
      });
    }

    const userId = String(req.user);
    const learnerId = String(request.fromUser);
    const teacherId = String(request.toUser);
    const raisedBy = String(request.dispute.raisedBy);

    if (userId !== learnerId && userId !== teacherId) {
      await cleanup();

      return res.status(403).json({
        success: false,
        msg: "Not authorized",
      });
    }

    let evidenceRequest = null;

    if (evidenceRequestId) {
      evidenceRequest = request.dispute.evidenceRequests.id(evidenceRequestId);

      if (!evidenceRequest) {
        await cleanup();

        return res.status(404).json({
          success: false,
          msg: "Evidence request not found",
        });
      }

      if (String(evidenceRequest.requestedFrom) !== userId) {
        await cleanup();

        return res.status(403).json({
          success: false,
          msg: "This evidence request is not assigned to you",
        });
      }

      if (evidenceRequest.status !== "pending") {
        await cleanup();

        return res.status(409).json({
          success: false,
          msg: "This evidence request is no longer pending",
        });
      }

      if (
        evidenceRequest.dueAt &&
        new Date() > new Date(evidenceRequest.dueAt)
      ) {
        evidenceRequest.status = "expired";
        await request.save();
        await cleanup();

        return res.status(409).json({
          success: false,
          msg: "The evidence submission deadline has expired",
        });
      }
    } else {
      if (userId === raisedBy) {
        await cleanup();

        return res.status(403).json({
          success: false,
          msg: "Only the other participant can submit the initial response",
        });
      }

      const deadline = request.dispute.initialResponseDueAt;

      if (deadline && new Date() > new Date(deadline)) {
        await cleanup();

        return res.status(409).json({
          success: false,
          msg: "The 72-hour initial response deadline has expired",
        });
      }

      const alreadyResponded = request.dispute.responses.some(
        (response) => String(response.submittedBy) === userId,
      );

      if (alreadyResponded) {
        await cleanup();

        return res.status(409).json({
          success: false,
          msg: "You have already submitted your initial response",
        });
      }
    }

    request.dispute.responses.push({
      submittedBy: userId,
      message: message.trim(),
      attachments,
      submittedAt: new Date(),
    });

    const response =
      request.dispute.responses[request.dispute.responses.length - 1];

    if (evidenceRequest) {
      evidenceRequest.status = "responded";
      evidenceRequest.responseId = response._id;
      evidenceRequest.respondedAt = new Date();
    }

    request.dispute.workflowStatus = "awaiting_admin_review";

    await request.save();

    submissionSaved = true;

    const recipient = userId === learnerId ? teacherId : learnerId;

    await createNotification({
      recipient,
      actor: userId,
      type: "dispute_response_submitted",
      title: "Dispute response submitted",
      message: evidenceRequest
        ? "Your exchange partner submitted additional dispute evidence."
        : "Your exchange partner submitted their dispute response.",
      relatedRequest: request._id,
      data: {
        requestId: request._id.toString(),
      },
      idempotencyKey: `dispute_response:${request._id}:${response._id}`,
    });

    return res.json({
      success: true,
      msg: "Dispute response submitted successfully",
      response,
    });
  } catch (error) {
    if (!submissionSaved) {
      await cleanup();
    }

    console.error("Submit dispute response failed:", error.message);

    return res.status(500).json({
      success: false,
      msg: "Failed to submit dispute response",
    });
  }
};

const cancelSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.user);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Invalid request ID" });
    }

    const request = await ExchangeRequest.findById(id);

    if (!request) {
      return res.status(404).json({ msg: "Request not found" });
    }

    const isParticipant =
      request.fromUser.toString() === userId ||
      request.toUser.toString() === userId;

    if (!isParticipant) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    if (request.status !== "accepted") {
      return res.status(400).json({
        msg: "Only accepted requests can have their session cancelled",
      });
    }

    const schedule = request.sessionSchedule;

    if (!schedule || !["proposed", "confirmed"].includes(schedule.status)) {
      return res.status(400).json({
        msg: "There is no active session to cancel",
      });
    }

    request.sessionSchedule = {
      scheduledAt: null,
      proposedBy: null,
      confirmedBy: null,
      status: "unscheduled",
      note: null,
    };

    await request.save();

    const recipient =
      String(userId) === String(request.fromUser)
        ? String(request.toUser)
        : String(request.fromUser);

    await createNotification({
      recipient,
      actor: userId,
      type: "session_cancelled",
      title: "Session cancelled",
      message: "Your exchange partner cancelled the scheduled session.",
      relatedRequest: request._id,
      data: {
        requestId: request._id.toString(),
      },
      idempotencyKey: `session_cancelled:${request._id}:${Date.now()}`,
    });

    return res.status(200).json({
      msg: "Session cancelled",
      sessionSchedule: request.sessionSchedule,
    });
  } catch (error) {
    console.error("Cancel session error:", error);
    return res.status(500).json({ msg: "Server error" });
  }
};

module.exports.cancelSession = cancelSession;
module.exports.scheduleSession = scheduleSession;
