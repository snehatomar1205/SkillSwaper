const mongoose = require("mongoose");
const User = require("../models/User");
const XPTransaction = require("../models/XPTransaction");
const bcrypt = require("bcryptjs");
const XP_RULES = require("../config/xpRules");
const {
  createAuthSession,
  rotateRefreshSession,
  revokeRefreshSession,
} = require("../services/authService");

const {
  REFRESH_COOKIE_NAME,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} = require("../utils/authCookies");

const ACHIEVEMENTS = require("../constants/achievements");

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const validateRegistrationInput = ({ username, email, password, bio }) => {
  if (
    !isNonEmptyString(username) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(password) ||
    !isNonEmptyString(bio)
  ) {
    return "Username, email, password, and bio are required";
  }

  if (username.trim().length > 50) {
    return "Username must be 50 characters or fewer";
  }

  if (bio.trim().length > 500) {
    return "Bio must be 500 characters or fewer";
  }

  if (password.length < 8 || password.length > 128) {
    return "Password must be between 8 and 128 characters";
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    return "Enter a valid email address";
  }

  return null;
};

const registerUser = async (req, res, next) => {
  const { username, email, password, bio } = req.body;

  const validationError = validateRegistrationInput({
    username,
    email,
    password,
    bio,
  });

  if (validationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: validationError,
      },
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        code: "AVATAR_REQUIRED",
        message: "Avatar image is required",
      },
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();

    const userExist = await User.findOne({
      email: normalizedEmail,
    });

    if (userExist) {
      return res.status(409).json({
        success: false,
        error: {
          code: "USER_EXISTS",
          message: "User already exists",
        },
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      passwordHash,
      bio,
      avatarUrl: req.file.path,
    });

    const { accessToken, refreshToken } = await createAuthSession({
      userId: newUser._id,
      req,
    });

    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
        bio: newUser.bio,
        timeCredits: newUser.timeCredits,
      },
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Email and password are required",
        },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
        },
      });
    }

    const { accessToken, refreshToken } = await createAuthSession({
      userId: user._id,
      req,
    });

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        timeCredits: user.timeCredits,
      },
    });
  } catch (error) {
    next(error);
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    const { accessToken, refreshToken: newRefreshToken } =
      await rotateRefreshSession({
        refreshToken,
        req,
      });

    setRefreshTokenCookie(res, newRefreshToken);

    return res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    await revokeRefreshSession(refreshToken);
  } catch (error) {
    return next(error);
  } finally {
    clearRefreshTokenCookie(res);
  }

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        timeCredits: user.timeCredits,
        joinedAt: user.joinedAt,

        learnerStats: {
          level: user.learnerStats?.level ?? 1,
          completedSessions: user.learnerStats?.completedSessions ?? 0,
        },

        teacherStats: {
          level: user.teacherStats?.level ?? 1,
          completedSessions: user.teacherStats?.completedSessions ?? 0,
        },

        gamification: {
          teacherXP: user.gamification?.teacherXP ?? 0,
          studentXP: user.gamification?.studentXP ?? 0,
          totalXP: user.gamification?.totalXP ?? 0,
          teacherLevel: user.gamification?.teacherLevel ?? 1,
          studentLevel: user.gamification?.studentLevel ?? 1,
        },

        achievements: user.achievements ?? [],
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAchievements = async (req, res, next) => {
  try {
    const user = await User.findById(req.user).select(
      "learnerStats teacherStats achievements",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    const unlocked = new Set(user.achievements || []);

    return res.json({
      success: true,
      achievements: ACHIEVEMENTS.map((achievement) => ({
        ...achievement,
        unlocked: unlocked.has(achievement.id),
      })),
      progression: {
        learner: {
          level: user.learnerStats?.level ?? 1,
          completedSessions: user.learnerStats?.completedSessions ?? 0,
        },
        teacher: {
          level: user.teacherStats?.level ?? 1,
          completedSessions: user.teacherStats?.completedSessions ?? 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get leaderboard for teacher or student.
const getLeaderboard = async (req, res, next) => {
  try {
    const { role } = req.params;
    const period = req.query.period || "all-time";
    const userId = req.user;

    if (!["teacher", "student"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leaderboard role",
      });
    }

    if (!["weekly", "monthly", "all-time"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leaderboard period",
      });
    }

    const xpField =
      role === "teacher"
        ? "gamification.teacherXP"
        : "gamification.studentXP";

    const xpKey =
      role === "teacher" ? "teacherXP" : "studentXP";

    const levelField =
      role === "teacher" ? "teacherLevel" : "studentLevel";

    let leaderboard = [];
    let currentUserXP = 0;
    let currentUserLevel = 1;
    let currentUserRank = null;

    if (period === "all-time") {
      const currentUser = await User.findById(userId)
        .select("gamification")
        .lean();

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      currentUserXP =
        currentUser.gamification?.[xpKey] || 0;

      currentUserLevel =
        currentUser.gamification?.[levelField] || 1;

      const [users, usersAhead] = await Promise.all([
        User.find({
          [xpField]: { $gt: 0 },
        })
          .select("username avatarUrl gamification")
          .sort({ [xpField]: -1, _id: 1 })
          .limit(100)
          .lean(),

        currentUserXP > 0
          ? User.countDocuments({
              [xpField]: { $gt: 0 },
              $or: [
                { [xpField]: { $gt: currentUserXP } },
                {
                  [xpField]: currentUserXP,
                  _id: { $lt: new mongoose.Types.ObjectId(userId) },
                },
              ],
            })
          : 0,
      ]);

      leaderboard = users.map((user, index) => ({
        rank: index + 1,
        userId: user._id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        xp: user.gamification?.[xpKey] || 0,
        level: user.gamification?.[levelField] || 1,
      }));

      if (currentUserXP > 0) {
        currentUserRank = usersAhead + 1;
      }
    } else {
      const startDate = new Date();

      if (period === "weekly") {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const xpAggregation = await XPTransaction.aggregate([
        {
          $match: {
            role,
            createdAt: { $gte: startDate },
            amount: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: "$userId",
            xp: { $sum: "$amount" },
          },
        },
        {
          $sort: {
            xp: -1,
            _id: 1,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            _id: 0,
            userId: "$_id",
            username: "$user.username",
            avatarUrl: "$user.avatarUrl",
            xp: 1,
            level:
              role === "teacher"
                ? "$user.gamification.teacherLevel"
                : "$user.gamification.studentLevel",
          },
        },
      ]);

      const currentEntry = xpAggregation.find(
        (entry) =>
          entry.userId.toString() === userId.toString()
      );

      if (currentEntry) {
        currentUserXP = currentEntry.xp;
        currentUserLevel = currentEntry.level || 1;

        const usersAhead = xpAggregation.filter((entry) => {
          if (entry.xp > currentUserXP) return true;

          if (entry.xp < currentUserXP) return false;

          return (
            entry.userId.toString().localeCompare(
              userId.toString()
            ) < 0
          );
        }).length;

        currentUserRank = usersAhead + 1;
      }

      leaderboard = xpAggregation.slice(0, 100).map(
        (user, index) => ({
          ...user,
          rank: index + 1,
          level: user.level || 1,
        })
      );

      if (!currentEntry) {
        const currentUser = await User.findById(userId)
          .select("gamification")
          .lean();

        currentUserLevel =
          currentUser?.gamification?.[levelField] || 1;
      }
    }

    return res.json({
      success: true,
      role,
      period,
      leaderboard,
      currentUser: {
        rank: currentUserRank,
        xp: currentUserXP,
        level: currentUserLevel,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current user's gamification profile

const getGamificationProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user).select(
      "gamification learnerStats teacherStats achievements"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const gamification = user.gamification || {};

    const getLevelProgress = (xp, level) => {
      const thresholds = XP_RULES.levelThresholds;

      const currentThreshold =
        thresholds.find((item) => item.level === level)?.xp || 0;

      const nextThreshold =
        thresholds.find((item) => item.level === level + 1)?.xp ?? null;

      return {
        currentLevelXP: currentThreshold,
        nextLevelXP: nextThreshold,
        xpRemaining:
          nextThreshold === null ? 0 : Math.max(0, nextThreshold - xp),
        progressPercent:
          nextThreshold === null
            ? 100
            : Math.min(
                100,
                Math.round(
                  ((xp - currentThreshold) /
                    (nextThreshold - currentThreshold)) *
                    100
                )
              ),
      };
    };

    const teacherXP = gamification.teacherXP || 0;
    const studentXP = gamification.studentXP || 0;
    const teacherLevel = gamification.teacherLevel || 1;
    const studentLevel = gamification.studentLevel || 1;

    return res.json({
      success: true,

      gamification: {
        teacherXP,
        studentXP,
        totalXP: gamification.totalXP || 0,

        teacherLevel,
        studentLevel,

        teacherProgress: getLevelProgress(teacherXP, teacherLevel),
        studentProgress: getLevelProgress(studentXP, studentLevel),
      },

      learnerStats: {
        completedSessions: user.learnerStats?.completedSessions || 0,
        level: user.learnerStats?.level || 1,
      },

      teacherStats: {
        completedSessions: user.teacherStats?.completedSessions || 0,
        level: user.teacherStats?.level || 1,
      },

      achievements: user.achievements || [],
    });
  } catch (error) {
    next(error);
  }
};

// Get paginated XP history.

const getXPHistory = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination values",
      });
    }

    const filter = {
      userId: req.user,
    };

    if (req.query.role) {
      if (!["teacher", "student"].includes(req.query.role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid XP history role",
        });
      }

      filter.role = req.query.role;
    }

    const [transactions, total] = await Promise.all([
      XPTransaction.find(filter)
        .select(
          "role amount type description relatedRequest metadata createdAt"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      XPTransaction.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getCurrentUser,
  getAchievements,
  getLeaderboard,
  getGamificationProfile,
  getXPHistory,
};
