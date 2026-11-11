
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");

const generateAccessToken = (userId) => {
  return jwt.sign(
    {
      sub: userId.toString(),
      type: "access",
    },
    env.jwt.accessSecret,
    {
      expiresIn: env.jwt.accessExpiresIn,
    }
  );
};

const generateAdminAccessToken = (adminId) => {
  return jwt.sign(
    {
      sub: adminId.toString(),
      type: "access",
      role: "admin",
    },
    env.jwt.accessSecret,
    {
      expiresIn: env.jwt.accessExpiresIn,
    }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

const hashRefreshToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

module.exports = {
  generateAccessToken,
  generateAdminAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
