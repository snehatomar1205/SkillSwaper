const SeasonalEvent = require("../models/SeasonalEvent");
const EventParticipation = require("../models/EventParticipation");

async function updateEventProgress({
  userId,
  role,
  request,
  skillPost,
  session,
}) {
  if (!session) {
    throw new Error("A MongoDB transaction session is required");
  }

  const now = new Date();
  // Activate events whose start date has arrived.
  await SeasonalEvent.updateMany(
    {
      status: "scheduled",
      startDate: { $lte: now },
      endDate: { $gte: now },
    },
    { $set: { status: "active" } },
    { session },
  );

  // Complete events whose end date has passed.
  await SeasonalEvent.updateMany(
    {
      status: { $in: ["scheduled", "active"] },
      endDate: { $lt: now },
    },
    { $set: { status: "completed" } },
    { session },
  );
  const xpRole = role === "learner" ? "student" : "teacher";

  const events = await SeasonalEvent.find({
    status: "active",
    startDate: { $lte: now },
    endDate: { $gte: now },
    eligibleRoles: xpRole,
  }).session(session);

  const results = [];

  for (const event of events) {
    const challenges = event.challenges.filter((challenge) => {
      if (
        challenge.eligibleRole !== "both" &&
        challenge.eligibleRole !== xpRole
      ) {
        return false;
      }

      if (
        challenge.conditionType === "skill_category_sessions" &&
        !challenge.skillCategory
      ) {
        return false;
      }

      return true;
    });

    if (challenges.length === 0) continue;

    let participation = await EventParticipation.findOne({
      eventId: event._id,
      userId,
      role: xpRole,
    }).session(session);

    if (!participation) {
      participation = new EventParticipation({
        eventId: event._id,
        userId,
        role: xpRole,
        challenges: challenges.map((challenge) => ({
          challengeId: challenge._id,
        })),
      });
    }

    let modified = false;

    for (const challenge of challenges) {
      let progress = participation.challenges.find(
        (item) => String(item.challengeId) === String(challenge._id),
      );

      if (!progress) {
        participation.challenges.push({
          challengeId: challenge._id,
        });

        progress =
          participation.challenges[participation.challenges.length - 1];
      }

      if (progress.completed) continue;

      let increment = 0;

      switch (challenge.conditionType) {
        case "completed_exchanges":
          increment = 1;
          break;

        case "teaching_sessions":
          increment = role === "teacher" ? 1 : 0;
          break;

        case "learning_sessions":
          increment = role === "learner" ? 1 : 0;
          break;

        case "skill_category_sessions": {
          const tags = (skillPost?.tags || []).map((tag) =>
            String(tag).toLowerCase(),
          );

          increment = tags.includes(challenge.skillCategory.toLowerCase())
            ? 1
            : 0;
          break;
        }

        case "xp_earned":
          // XP progress is updated separately when XP is awarded.
          increment = 0;
          break;

        default:
          increment = 0;
      }

      if (increment > 0) {
        progress.currentProgress += increment;
        modified = true;
      }

      if (progress.currentProgress >= challenge.target) {
        progress.currentProgress = challenge.target;
        progress.completed = true;
        progress.completedAt = now;
        modified = true;
      }
    }

    if (modified || participation.isNew) {
      await participation.save({ session });
    }

    results.push({
      eventId: event._id,
      participationId: participation._id,
      userId,
      role: xpRole,
    });
  } // Closes the event loop

  return results;
}

async function updateEventXPProgress({ userId, role, xpEarned, session }) {
  if (!session) {
    throw new Error("A MongoDB transaction session is required");
  }

  if (!xpEarned || xpEarned <= 0) return [];

  const now = new Date();

  const events = await SeasonalEvent.find({
    status: "active",
    startDate: { $lte: now },
    endDate: { $gte: now },
    eligibleRoles: role,
    "challenges.conditionType": "xp_earned",
  }).session(session);

  const results = [];

  for (const event of events) {
    const challenges = event.challenges.filter(
      (challenge) =>
        challenge.conditionType === "xp_earned" &&
        (challenge.eligibleRole === "both" || challenge.eligibleRole === role),
    );

    if (challenges.length === 0) continue;

    let participation = await EventParticipation.findOne({
      eventId: event._id,
      userId,
      role,
    }).session(session);

    if (!participation) {
      participation = new EventParticipation({
        eventId: event._id,
        userId,
        role,
      });
    }

    let modified = false;

    for (const challenge of challenges) {
      let progress = participation.challenges.find(
        (item) => String(item.challengeId) === String(challenge._id),
      );

      if (!progress) {
        participation.challenges.push({
          challengeId: challenge._id,
        });

        progress =
          participation.challenges[participation.challenges.length - 1];
      }

      if (progress.completed) continue;

      progress.currentProgress = Math.min(
        challenge.target,
        progress.currentProgress + xpEarned,
      );

      if (progress.currentProgress >= challenge.target) {
        progress.completed = true;
        progress.completedAt = now;
      }

      modified = true;
    }

    if (modified || participation.isNew) {
      await participation.save({ session });
    }

    results.push({
      eventId: event._id,
      participationId: participation._id,
      userId,
      role,
    });
  }

  return results;
}

module.exports = {
  updateEventProgress,
  updateEventXPProgress,
};
