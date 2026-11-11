
const Notification = require("../models/Notification");

async function createNotification({
  recipient,
  actor = null,
  type,
  title,
  message,
  relatedRequest = null,
  data = {},
  idempotencyKey,
}) {
  if (!recipient || !type || !title || !message || !idempotencyKey) {
    throw new Error("Missing required notification fields");
  }

  let result;

  try {
    result = await Notification.findOneAndUpdate(
      { recipient, idempotencyKey },
      {
        $setOnInsert: {
          recipient,
          actor,
          type,
          title,
          message,
          relatedRequest,
          data,
          idempotencyKey,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        includeResultMetadata: true,
      }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;

    const existing = await Notification.findOne({
      recipient,
      idempotencyKey,
    });

    if (!existing) throw error;

    return existing;
  }

  const notification = result.value || result;
  const wasInserted = Boolean(result.lastErrorObject?.upserted);

  if (wasInserted) {
    const io = global.io;

    if (io) {
      io.to(`user:${recipient}`).emit("notification", notification);
    }
  }

  return notification;
}

module.exports = { createNotification };