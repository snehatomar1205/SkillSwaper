const mongoose = require("mongoose");
const EventParticipation = require("../models/EventParticipation");
const SeasonalEvent = require("../models/SeasonalEvent");

const getEventLeaderboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const role = req.query.role || "teacher";

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (!["teacher", "student"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leaderboard role",
      });
    }

    const event = await SeasonalEvent.findById(id)
      .select("title status")
      .lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Seasonal event not found",
      });
    }

    const participants = await EventParticipation.find({
      eventId: id,
      role,
    })
      .populate("userId", "username avatarUrl")
      .sort({ totalRewardXP: -1, userId: 1 })
      .lean();

    const leaderboard = participants
      .filter((entry) => entry.userId)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId._id,
        username: entry.userId.username,
        avatarUrl: entry.userId.avatarUrl,
        xp: entry.totalRewardXP || 0,
        completedChallenges: entry.challenges.filter(
          (challenge) => challenge.completed,
        ).length,
      }));

    const currentUserId = req.user?._id || req.user?.id || req.user;

    const currentUser = leaderboard.find(
      (entry) => String(entry.userId) === String(currentUserId),
    );

    return res.json({
      success: true,
      event: {
        id: event._id,
        title: event.title,
        status: event.status,
      },
      role,
      leaderboard: leaderboard.slice(0, 100),
      currentUser: currentUser || null,
      totalParticipants: leaderboard.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getEventLeaderboard };
