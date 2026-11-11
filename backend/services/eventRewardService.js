
const SeasonalEvent = require("../models/SeasonalEvent");
const EventParticipation = require("../models/EventParticipation");
const EventReward = require("../models/EventReward");
const XPTransaction = require("../models/XPTransaction");
const User = require("../models/User");

const { getLevelFromXP } = require("./progressionService");

async function awardCompletedChallengeRewards({
  participationId,
  session,
}) {
  if (!session) {
    throw new Error("A MongoDB transaction session is required");
  }

  const participation = await EventParticipation.findById(
    participationId
  ).session(session);

  if (!participation) {
    throw new Error("Event participation not found");
  }

  const event = await SeasonalEvent.findById(
    participation.eventId
  ).session(session);

  if (!event) {
    throw new Error("Seasonal event not found");
  }

  const user = await User.findById(participation.userId).session(session);

  if (!user) {
    throw new Error("Event participant user not found");
  }

  const role = participation.role;

  const xpField = role === "teacher" ? "teacherXP" : "studentXP";
  const levelField = role === "teacher" ? "teacherLevel" : "studentLevel";

  const awardedRewards = [];

  for (const progress of participation.challenges) {
    if (!progress.completed || progress.rewardClaimed) {
      continue;
    }

    const challenge = event.challenges.id(progress.challengeId);

    if (!challenge) {
      continue;
    }

    const rewardXP = Math.max(0, Number(challenge.rewardXP) || 0);
    const achievementId = challenge.rewardAchievementId || null;

    const idempotencyKey =
      `seasonal:${event._id}:${challenge._id}:${user._id}:${role}`;

    // Check whether this challenge reward was already recorded.
    const existingReward = await EventReward.findOne({
      idempotencyKey,
    }).session(session);

    if (existingReward) {
      progress.rewardClaimed = true;
      progress.rewardClaimedAt = existingReward.awardedAt;
      continue;
    }

    // Record the reward in the permanent reward ledger.
    await EventReward.create(
      [
        {
          eventId: event._id,
          participationId: participation._id,
          challengeId: challenge._id,
          userId: user._id,
          role,
          rewardXP,
          achievementId,
          idempotencyKey,
        },
      ],
      { session }
    );

    // Award XP and update the user's level.
    if (rewardXP > 0) {
      const currentXP = Number(user.gamification[xpField] || 0);
      const newXP = currentXP + rewardXP;

      user.gamification[xpField] = newXP;
      user.gamification.totalXP =
        Number(user.gamification.totalXP || 0) + rewardXP;

      user.gamification[levelField] = getLevelFromXP(newXP);

      await XPTransaction.create(
        [
          {
            userId: user._id,
            role,
            amount: rewardXP,
            type: "seasonal_reward",
            description: `Seasonal event reward: ${challenge.title}`,
            relatedRequest: null,
            idempotencyKey,
            metadata: {
              eventId: event._id,
              challengeId: challenge._id,
              eventTitle: event.title,
            },
          },
        ],
        { session }
      );
    }

    // Award the achievement if it has not already been unlocked.
    if (
      achievementId &&
      !user.achievements.includes(achievementId)
    ) {
      user.achievements.push(achievementId);
    }

    progress.rewardClaimed = true;
    progress.rewardClaimedAt = new Date();

    participation.totalRewardXP =
      Number(participation.totalRewardXP || 0) + rewardXP;

    awardedRewards.push({
      eventId: event._id,
      eventTitle: event.title,
      challengeId: challenge._id,
      challengeTitle: challenge.title,
      userId: user._id,
      role,
      rewardXP,
      achievementId,
    });
  }

  await user.save({ session });
  await participation.save({ session });

  return awardedRewards;
}

module.exports = {
  awardCompletedChallengeRewards,
};
