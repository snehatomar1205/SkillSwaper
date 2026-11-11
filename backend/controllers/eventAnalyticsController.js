
const mongoose = require("mongoose");

const SeasonalEvent = require("../models/SeasonalEvent");
const EventParticipation = require("../models/EventParticipation");
const EventReward = require("../models/EventReward");

const getEventAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await SeasonalEvent.findById(id).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Seasonal event not found",
      });
    }

    const participations = await EventParticipation.find({
      eventId: id,
    }).lean();

    const rewards = await EventReward.find({
      eventId: id,
    }).lean();

    const teacherParticipants = participations.filter(
      (p) => p.role === "teacher"
    );

    const studentParticipants = participations.filter(
      (p) => p.role === "student"
    );

    const totalCompletedChallenges = participations.reduce(
      (total, participation) =>
        total +
        participation.challenges.filter(
          (challenge) => challenge.completed
        ).length,
      0
    );

    const totalRewardXP = rewards.reduce(
      (total, reward) => total + reward.rewardXP,
      0
    );

    const challengeAnalytics = (event.challenges || []).map(
      (challenge) => {
        let completedCount = 0;
        let participantCount = 0;

        participations.forEach((participation) => {
          const progress = participation.challenges.find(
            (item) =>
              String(item.challengeId) === String(challenge._id)
          );

          if (progress) {
            participantCount++;

            if (progress.completed) {
              completedCount++;
            }
          }
        });

        return {
          challengeId: challenge._id,
          title: challenge.title,
          conditionType: challenge.conditionType,
          target: challenge.target,
          participants: participantCount,
          completed: completedCount,
          completionRate:
            participantCount > 0
              ? Number(
                  (
                    (completedCount / participantCount) *
                    100
                  ).toFixed(2)
                )
              : 0,
        };
      }
    );

    return res.status(200).json({
      success: true,
      analytics: {
        event: {
          id: event._id,
          title: event.title,
          status: event.status,
          startDate: event.startDate,
          endDate: event.endDate,
        },

        participants: {
          total: participations.length,
          teachers: teacherParticipants.length,
          students: studentParticipants.length,
        },

        challenges: {
          total: event.challenges?.length || 0,
          completed: totalCompletedChallenges,
          breakdown: challengeAnalytics,
        },

        rewards: {
          totalIssued: rewards.length,
          totalXPDistributed: totalRewardXP,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEventAnalytics,
};