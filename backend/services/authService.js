const mongoose = require("mongoose");
const RefreshSession = require("../models/RefreshSession");
const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} = require("../utils/authTokens");
const env = require("../config/env");

const parseRefreshExpiry = (value) => {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(
      "JWT_REFRESH_EXPIRES_IN must use a format such as 15m, 12h, or 7d"
    );
  }

  const amount = Number(match[1]);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(
      "JWT_REFRESH_EXPIRES_IN must be a positive duration"
    );
  }

  const unitMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const durationMs = amount * unitMs[match[2]];

  if (!Number.isSafeInteger(durationMs)) {
    throw new Error(
      "JWT_REFRESH_EXPIRES_IN is too large"
    );
  }

  return durationMs;
};


const createAuthSession = async ({ userId, req }) => {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date(
    Date.now() + parseRefreshExpiry(env.jwt.refreshExpiresIn)
  );

  await RefreshSession.create({
    userId,
    tokenHash,
    expiresAt,
    userAgent: req.get("user-agent") || null,
    ipAddress: req.ip || null,
  });

  const accessToken = generateAccessToken(userId);

  return {
    accessToken,
    refreshToken,
  };
};


const rotateRefreshSession = async ({ refreshToken, req }) => {
  if (!refreshToken) {
    const error = new Error("Refresh token required");
    error.statusCode = 401;
    error.code = "REFRESH_TOKEN_REQUIRED";
    throw error;
  }

  const oldHash = hashRefreshToken(refreshToken);
  const session = await RefreshSession.findOne({
    tokenHash: oldHash,
  });

  if (!session) {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    error.code = "INVALID_REFRESH_TOKEN";
    throw error;
  }

  if (session.revokedAt) {
    await RefreshSession.updateMany(
      {
        userId: session.userId,
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      }
    );

    const error = new Error("Refresh token reuse detected");
    error.statusCode = 401;
    error.code = "REFRESH_TOKEN_REUSED";
    throw error;
  }

  if (session.expiresAt <= new Date()) {
    await RefreshSession.updateOne(
      { _id: session._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    const error = new Error("Refresh token expired");
    error.statusCode = 401;
    error.code = "REFRESH_TOKEN_EXPIRED";
    throw error;
  }

  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newRefreshToken);
  const now = new Date();

  const newExpiresAt = new Date(
    now.getTime() + parseRefreshExpiry(env.jwt.refreshExpiresIn)
  );

  const newSessionId = new mongoose.Types.ObjectId();

  const dbSession = await mongoose.startSession();

  let accessToken;

  try {
    await dbSession.withTransaction(async () => {
      // Revoke only if this session is still active.
      const revoked = await RefreshSession.findOneAndUpdate(
        {
          _id: session._id,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        {
          $set: {
            revokedAt: now,
            replacedByTokenHash: newTokenHash,
          },
        },
        {
          new: true,
          session: dbSession,
        }
      );

      if (!revoked) {
        const error = new Error("Refresh token already used");
        error.statusCode = 401;
        error.code = "REFRESH_TOKEN_REUSED";
        throw error;
      }

      await RefreshSession.create(
        [
          {
            _id: newSessionId,
            userId: session.userId,
            tokenHash: newTokenHash,
            expiresAt: newExpiresAt,
            userAgent: req.get("user-agent") || null,
            ipAddress: req.ip || null,
          },
        ],
        { session: dbSession }
      );

      accessToken = generateAccessToken(session.userId);
    });
  } finally {
    await dbSession.endSession();
  }

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};


const revokeRefreshSession = async (refreshToken) => {
  if (!refreshToken) return;

  const tokenHash = hashRefreshToken(refreshToken);

  await RefreshSession.findOneAndUpdate(
    {
      tokenHash,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    }
  );
};

module.exports = {
  createAuthSession,
  rotateRefreshSession,
  revokeRefreshSession,
};