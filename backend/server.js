
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const app = require("./app");
const env = require("./config/env");
const connectDB = require("./config/db");
const createAdmin = require("./scripts/createAdmin");
const ChatRoom = require("./models/ChatRoom");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    credentials: true,
  },
});
global.io = io;
// Make Socket.IO available to Express routes
app.set("io", io);

// Authenticate Socket.IO connections
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, env.jwt.accessSecret);

    if (
      decoded.type !== "access" ||
      !decoded.sub ||
      decoded.role === "admin"
    ) {
      return next(new Error("Invalid user access token"));
    }

    socket.userId = decoded.sub;
    return next();
  } catch (error) {
    return next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  
  console.log(`Socket connected: ${socket.id}`);
  socket.join(`user:${socket.userId}`);
  // Allow only chat participants to join a room
  socket.on("join_room", async (roomId) => {
    try {
      if (!mongoose.isValidObjectId(roomId)) return;

      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      const isParticipant = room.participants.some(
        (participant) =>
          participant.toString() === String(socket.userId)
      );

      if (!isParticipant) return;

      socket.join(roomId);
    } catch (error) {
      console.error("join_room error:", error);
    }
  });
  
  // Messages are saved by the REST endpoint, not Socket.IO
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log("Shutdown complete");
      process.exit(0);
    } catch (error) {
      console.error("Shutdown error:", error);
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const startServer = async () => {
  try {
    await connectDB();
    await createAdmin();

    server.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
