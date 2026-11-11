const mongoose = require("mongoose");
const SeasonalEvent = require("../models/SeasonalEvent");
const EventParticipation = require("../models/EventParticipation");

// Keep scheduled and active event statuses synchronized.
async function syncEventStatuses() {
  const now = new Date();

  await SeasonalEvent.updateMany(
    {
      status: "scheduled",
      startDate: { $lte: now },
      endDate: { $gte: now },
    },
    { $set: { status: "active" } }
  );

  await SeasonalEvent.updateMany(
    {
      status: { $in: ["scheduled", "active"] },
      endDate: { $lt: now },
    },
    { $set: { status: "completed" } }
  );
}

// GET /api/events
exports.getPublicEvents = async (req, res) => {
  try {
    await syncEventStatuses();

    const now = new Date();

    const events = await SeasonalEvent.find({
      status: { $in: ["active", "scheduled"] },
      endDate: { $gte: now },
    })
      .select(
        "title description bannerUrl startDate endDate status eligibleRoles challenges"
      )
      .sort({ startDate: 1 });

    const participations = await EventParticipation.find({
      userId: req.user,
      eventId: { $in: events.map((event) => event._id) },
    });

    const participationMap = new Map();

    for (const participation of participations) {
      const key = String(participation.eventId);

      if (!participationMap.has(key)) {
        participationMap.set(key, []);
      }

      participationMap.get(key).push(participation);
    }

    return res.json({
      success: true,
      events: events.map((event) => ({
        ...event.toObject(),
        myParticipations:
          participationMap.get(String(event._id)) || [],
      })),
    });
  } catch (error) {
    console.error("Get public events failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve seasonal events",
    });
  }
};

// POST /api/events/:id/join
exports.joinEvent = async (req, res) => {
  try {
    await syncEventStatuses();

    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (!["teacher", "student"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be teacher or student",
      });
    }

    const event = await SeasonalEvent.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!["active", "scheduled"].includes(event.status)) {
      return res.status(400).json({
        success: false,
        message: "This event is not accepting participants",
      });
    }

    if (!event.eligibleRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "You are not eligible for this event role",
      });
    }

    const eligibleChallenges = event.challenges.filter(
      (challenge) =>
        challenge.eligibleRole === "both" ||
        challenge.eligibleRole === role
    );

    if (eligibleChallenges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No challenges are available for this role",
      });
    }

    const participation = await EventParticipation.findOneAndUpdate(
      {
        eventId: event._id,
        userId: req.user,
        role,
      },
      {
        $setOnInsert: {
          eventId: event._id,
          userId: req.user,
          role,
          challenges: eligibleChallenges.map((challenge) => ({
            challengeId: challenge._id,
            currentProgress: 0,
            completed: false,
            rewardClaimed: false,
          })),
          joinedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Event participation confirmed",
      participation,
    });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await EventParticipation.findOne({
        eventId: req.params.id,
        userId: req.user,
        role: req.body.role,
      });

      if (existing) {
        return res.status(200).json({
          success: true,
          message: "You have already joined this event",
          participation: existing,
        });
      }
    }

    console.error("Join event failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to join seasonal event",
    });
  }
};

// GET /api/events/:id/progress
exports.getEventProgress = async (req, res) => {
  try {
    await syncEventStatuses();

    const { id } = req.params;
    const { role } = req.query;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (role && !["teacher", "student"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const event = await SeasonalEvent.findById(id).select(
      "title description bannerUrl startDate endDate status eligibleRoles challenges"
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const query = {
      eventId: event._id,
      userId: req.user,
    };

    if (role) {
      query.role = role;
    }

    const participations = await EventParticipation.find(query);

    return res.json({
      success: true,
      event,
      participations,
    });
  } catch (error) {
    console.error("Get event progress failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve event progress",
    });
  }
};