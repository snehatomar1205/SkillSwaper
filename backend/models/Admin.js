
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    immutable: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    default: "admin",
    immutable: true,
    enum: ["admin"],
  },
});

module.exports = mongoose.model("Admin", adminSchema);
