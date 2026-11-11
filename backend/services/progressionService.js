
const User = require("../models/User");
const XPTransaction = require("../models/XPTransaction");
const ACHIEVEMENTS = require("../constants/achievements");
const XP_RULES = require("../config/xpRules");
const { createNotification } = require("./notificationService");

const SESSIONS_PER_LEVEL = 5;

function getLevelFromXP(xp) {
  let level = 1;

  for (const threshold of XP_RULES.levelThresholds) {
    if (xp >= threshold.xp) {
      level = threshold.level;
    } else {
      break;
    }
  }

  return level;
}

async function updateProgression(userId, role, requestId, session) {
  if (!["learner", "teacher"].includes(role)) {
    throw new Error("Invalid progression role");
  }

  if (!session) {
    throw new Error("A MongoDB transaction session is required");
  }

  const statsField = role === "learner" ? "learnerStats" : "teacherStats";
  const xpField = role === "learner" ? "studentXP" : "teacherXP";
  const levelField = role === "learner" ? "studentLevel" : "teacherLevel";
  const xpRole = role === "learner" ? "student" : "teacher";

  const user = await User.findById(userId).session(session);

  if (!user) {
    throw new Error("Progression user not found");
  }

  // Preserve existing session-based progression.
  const stats = user[statsField];
  const previousSessionLevel = stats.level || 1;

  stats.completedSessions = (stats.completedSessions || 0) + 1;
  stats.level = Math.floor(stats.completedSessions / SESSIONS_PER_LEVEL) + 1;

  // Preserve existing achievements.
  const unlockedAchievements = [];

  for (const achievement of ACHIEVEMENTS) {
    if (
      stats.completedSessions >= achievement.requiredSessions &&
      !user.achievements.includes(achievement.id)
    ) {
      user.achievements.push(achievement.id);
      unlockedAchievements.push(achievement);
    }
  }

  // Calculate XP rewards.
  const baseXP = XP_RULES.exchangeCompletion[xpRole] || 0;
  const completedSessions = stats.completedSessions;
  const milestoneBonus =
    XP_RULES.milestoneBonuses[completedSessions] || 0;

  const xpEarned = baseXP + milestoneBonus;

  const xpTransactions = [];

  if (baseXP > 0) {
    xpTransactions.push({
      userId: user._id,
      role: xpRole,
      amount: baseXP,
      type: "exchange_completion",
      description: `XP earned for completing an exchange as a ${xpRole}.`,
      relatedRequest: requestId,
      idempotencyKey: `exchange_completion:${requestId}:${xpRole}`,
    });
  }

  if (milestoneBonus > 0) {
    xpTransactions.push({
      userId: user._id,
      role: xpRole,
      amount: milestoneBonus,
      type: "milestone_bonus",
      description: `Bonus XP for completing ${completedSessions} exchange sessions.`,
      relatedRequest: requestId,
      idempotencyKey: `milestone:${user._id}:${xpRole}:${completedSessions}`,
      metadata: { milestone: completedSessions },
    });
  }

  // Update XP and XP-based level separately from legacy session levels.
  if (!user.gamification) {
    user.gamification = {};
  }

  const previousLevel = user.gamification[levelField] || 1;

  user.gamification[xpField] =
    (user.gamification[xpField] || 0) + xpEarned;

  user.gamification.totalXP =
    (user.gamification.totalXP || 0) + xpEarned;

  const roleXP = user.gamification[xpField];
  const currentLevel = getLevelFromXP(roleXP);

  user.gamification[levelField] = currentLevel;

  if (xpTransactions.length > 0) {
    await XPTransaction.create(xpTransactions, { session });
  }

  await user.save({ session });

  return {
    userId: String(user._id),
    role,
    requestId: String(requestId),
    completedSessions,

    // Legacy session-based level.
    previousSessionLevel,
    sessionLevel: stats.level,

    // New XP-based level.
    previousLevel,
    level: currentLevel,
    leveledUp: currentLevel > previousLevel,

    xpEarned,
    roleXP,
    totalXP: user.gamification.totalXP,
    nextLevelXP:
      XP_RULES.levelThresholds.find(
        (threshold) => threshold.level === currentLevel + 1
      )?.xp ?? null,

    unlockedAchievements,
  };
}

async function sendProgressionNotifications(progress) {
  const {
    userId,
    role,
    requestId,
    completedSessions,
    previousLevel,
    level,
    leveledUp,
    unlockedAchievements,
  } = progress;

  const tasks = unlockedAchievements.map((achievement) =>
    createNotification({
      recipient: userId,
      actor: userId,
      type: "achievement_unlocked",
      title: `Achievement unlocked: ${achievement.title}`,
      message: achievement.description,
      relatedRequest: requestId,
      data: {
        achievementId: achievement.id,
        completedSessions,
        role,
      },
      idempotencyKey: `achievement:${userId}:${role}:${achievement.id}`,
    })
  );

  if (leveledUp) {
    tasks.push(
      createNotification({
        recipient: userId,
        actor: userId,
        type: role === "learner" ? "learner_level_up" : "teacher_level_up",
        title: `${role === "learner" ? "Learner" : "Teacher"} level up!`,
        message: `You reached level ${level}.`,
        relatedRequest: requestId,
        data: {
          role,
          previousLevel,
          newLevel: level,
          completedSessions,
        },
        idempotencyKey: `level_up:${userId}:${role}:${level}`,
      })
    );
  }

  await Promise.all(tasks);
}

module.exports = {
  updateProgression,
  sendProgressionNotifications,
  getLevelFromXP,
  ACHIEVEMENTS,
  SESSIONS_PER_LEVEL,
};
