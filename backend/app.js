const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const env = require("./config/env");

const authRoutes = require("./routes/authRoutes");
const skillRoutes = require("./routes/skillRoutes");
const requestRoutes = require("./routes/requestRoutes");
const commentRoutes = require("./routes/commentRoutes");
const chatRoutes = require("./routes/chatRoutes");
const errorHandler = require("./middleware/errorHandler");
const requestId = require("./middleware/requestId");
const { apiLimiter } = require("./middleware/rateLimiter");
const cookieParser = require("cookie-parser");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const eventRoutes = require("./routes/eventRoutes");

const app = express();

app.disable("x-powered-by");
app.use(requestId); 
app.use(helmet());

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.use(cookieParser());

app.use("/api", apiLimiter);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/ready", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;

  if (!databaseReady) {
    return res.status(503).json({
      success: false,
      status: "not_ready",
      dependencies: {
        mongodb: "disconnected",
      },
    });
  }

  res.status(200).json({
    success: true,
    status: "ready",
    dependencies: {
      mongodb: "connected",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
    requestId: req.requestId,
  });
});

app.use(errorHandler);

module.exports = app;