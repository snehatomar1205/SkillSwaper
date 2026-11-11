
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const { generateAdminAccessToken } = require("../utils/authTokens");

const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const configuredEmail = process.env.ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

    if (!configuredEmail || normalizedEmail !== configuredEmail) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const admin = await Admin.findOne({
      email: configuredEmail,
    }).select("+passwordHash");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin account is not initialized",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const accessToken = generateAdminAccessToken(admin._id);

    return res.json({
      success: true,
      accessToken,
      admin: {
        id: admin._id,
        email: admin.email,
        role: "admin",
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { loginAdmin };
