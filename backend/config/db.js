const mongoose = require("mongoose");
const env = require("./env");

const connectDB = async () => {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log("Connected database:", mongoose.connection.name);
  console.log("MongoDB URI database path:", new URL(env.mongoUri).pathname);

  console.log("MongoDB connected");
};

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

module.exports = connectDB;