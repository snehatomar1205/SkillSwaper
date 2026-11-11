
const mongoose = require("mongoose");
const Notification = require("../models/Notification");

const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user;

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = { recipient: userId };

    if (req.query.unread === "true") {
      filter.readAt = null;
    } else if (req.query.unread === "false") {
      filter.readAt = { $ne: null };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate("actor", "username avatarUrl")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Notification.countDocuments(filter),

      Notification.countDocuments({
        recipient: userId,
        readAt: null,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

const getUnreadNotificationCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user,
      readAt: null,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.isValidObjectId(notificationId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: req.user,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
      {
        new: true,
      }
    );

    if (notification) {
      return res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    }

    // Distinguish an already-read notification from a nonexistent
    // notification without exposing another user's notification.
    const existing = await Notification.exists({
      _id: notificationId,
      recipient: req.user,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        msg: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification was already read",
    });
  } catch (error) {
    return next(error);
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.user,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
