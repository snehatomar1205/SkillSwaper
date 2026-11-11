const express = require("express");
const auth = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const ChatRoom = require("../models/ChatRoom");
const mongoose = require("mongoose");

const router = express.Router();

// Get messages from a chat room
router.get("/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user;

    if (!mongoose.isValidObjectId(roomId)) {
      return res.status(400).json({ msg: "Invalid room ID" });
    }

    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({ msg: "Chat room not found" });
    }

    const isParticipant = room.participants.some(
      (participant) => participant.toString() === String(userId)
    );

    if (!isParticipant) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const messages = await Message.find({ roomId: room._id })
      .populate("sender", "username avatarUrl")
      .sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (error) {
    console.error("Fetch chat messages failed:", error);

    return res.status(500).json({
      msg: "Failed to load chat messages",
    });
  }
});

// Send and save a message, then broadcast it to the room
router.post("/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text } = req.body;
    const userId = req.user;

    if (
      !mongoose.isValidObjectId(roomId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res.status(400).json({ msg: "Invalid room or user ID" });
    }

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ msg: "Message text is required" });
    }

    const trimmedText = text.trim();

    if (trimmedText.length > 2000) {
      return res.status(400).json({
        msg: "Message cannot exceed 2000 characters",
      });
    }

    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({ msg: "Chat room not found" });
    }

    const isParticipant = room.participants.some(
      (participant) => participant.toString() === String(userId)
    );

    if (!isParticipant) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const message = await Message.create({
      roomId: room._id,
      sender: userId,
      text: trimmedText,
    });

    await message.populate("sender", "username avatarUrl");

    const io = req.app.get("io");

    if (io) {
      io.to(roomId).emit("receive_message", message);
    }

    return res.status(201).json(message);
  } catch (error) {
    console.error("Send chat message failed:", error);

    return res.status(500).json({
      msg: "Failed to send message",
    });
  }
});

module.exports = router;
