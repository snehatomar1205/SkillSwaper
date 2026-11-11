
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

const createAdmin = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env"
    );
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  }

  const existingAdmin = await Admin.findOne();

  if (existingAdmin) {
    if (existingAdmin.email !== email) {
      throw new Error(
        "A different admin already exists. Server startup aborted."
      );
    }

    console.log("Configured admin already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await Admin.create({
    email,
    passwordHash,
    role: "admin",
  });

  console.log("Configured admin created successfully.");
};

module.exports = createAdmin;
