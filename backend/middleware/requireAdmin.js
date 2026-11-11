
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const Admin = require("../models/Admin");

const requireAdmin = async (req, res, next) => {
  const authHeader = req.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Admin authentication required",
    });
  }

  try {
    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    const decoded = jwt.verify(token, env.jwt.accessSecret);

    if (
      decoded.type !== "access" ||
      decoded.role !== "admin" ||
      !decoded.sub
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const configuredEmail = process.env.ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

    if (!configuredEmail) {
      return res.status(500).json({
        success: false,
        message: "Admin authentication is not configured",
      });
    }

    const admin = await Admin.findOne({
      _id: decoded.sub,
      email: configuredEmail,
    }).select("_id email role");

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Admin account is not authorized",
      });
    }

    req.admin = {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    };

    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired admin token",
      });
    }

    next(error);
  }
};

module.exports = requireAdmin;
