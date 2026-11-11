
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },

  email: {
    type: String,
    unique: true,
    required: true,
  },

  passwordHash: {
    type: String,
    required: true,
  },

  avatarUrl: {
    type: String,
    required: true,
  },

  timeCredits: {
    type: Number,
    default: 10,
    min: 0,
    validate: {
      validator: Number.isFinite,
      message: "Time credits must be a finite number",
    },
  },

  bio: {
    type: String,
    required: true,
  },

  joinedAt: {
    type: Date,
    default: Date.now,
  },

  // Learner progression
  learnerStats: {
    completedSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
  },

  // Teacher progression
  teacherStats: {
    completedSessions: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
  },

  // Gamification XP
  
  // Gamification XP and levels
  gamification: {
    teacherXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    studentXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalXP: {
      type: Number,
      default: 0,
      min: 0,
    },
    teacherLevel: {
      type: Number,
      default: 1,
      min: 1,
    },
    studentLevel: {
      type: Number,
      default: 1,
      min: 1,
    },
  },


  // Store achievement identifiers already unlocked
  achievements: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("User", userSchema);
