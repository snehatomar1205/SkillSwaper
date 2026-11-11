
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const authMiddleware = (req, res, next) => {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: "AUTH_REQUIRED",
        message: "Authentication required",
      },
      requestId: req.requestId,
    });
  }

  const parts = authHeader.trim().split(/\s+/);

  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_AUTH_HEADER",
        message: "Invalid authorization header",
      },
      requestId: req.requestId,
    });
  }

  try {
    const decoded = jwt.verify(parts[1], env.jwt.accessSecret);

    if (
      decoded.type !== "access" ||
      !decoded.sub ||
      decoded.role === "admin"
    ) {
      throw new Error("Invalid user access token");
    }

    req.user = decoded.sub;
    req.auth = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_ACCESS_TOKEN",
        message: "Access token is invalid or expired",
      },
      requestId: req.requestId,
    });
  }
};

module.exports = authMiddleware;
