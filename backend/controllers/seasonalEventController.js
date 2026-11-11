
const SeasonalEvent = require("../models/SeasonalEvent");
const EventParticipation = require("../models/EventParticipation");

// Create a seasonal event
const createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      bannerUrl,
      startDate,
      endDate,
      eligibleRoles,
      challenges,
    } = req.body;

    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message:
          "Title, description, start date and end date are required.",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid event dates.",
      });
    }

    const event = await SeasonalEvent.create({
      title,
      description,
      bannerUrl: bannerUrl || "",
      startDate: start,
      endDate: end,
      eligibleRoles: eligibleRoles || ["teacher", "student"],
      challenges: challenges || [],
      status: "draft",
      createdBy: req.admin.id,
    });

    return res.status(201).json({
      success: true,
      message: "Seasonal event created successfully.",
      event,
    });
  } catch (error) {
    next(error);
  }
};

// Get all seasonal events (admin)
const getAllEvents = async (req, res, next) => {
  try {
    const events = await SeasonalEvent.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      events,
    });
  } catch (error) {
    next(error);
  }
};

// Get one seasonal event
const getEventById = async (req, res, next) => {
  try {
    const event = await SeasonalEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Seasonal event not found.",
      });
    }

    return res.json({
      success: true,
      event,
    });
  } catch (error) {
    next(error);
  }
};

// Update an event only when nobody has joined it
const updateEvent = async (req, res, next) => {
  try {
    const event = await SeasonalEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Seasonal event not found.",
      });
    }

    if (!["draft", "scheduled"].includes(event.status)) {
      return res.status(400).json({
        success: false,
        message: "Only draft or scheduled events can be edited.",
      });
    }

    // Prevent changing rules after participants have joined.
    const hasParticipants = await EventParticipation.exists({
      eventId: event._id,
    });

    if (hasParticipants) {
      return res.status(400).json({
        success: false,
        message:
          "This event already has participants. Its challenge rules cannot be modified.",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "bannerUrl",
      "startDate",
      "endDate",
      "eligibleRoles",
      "challenges",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    }

    if (
      event.startDate >= event.endDate ||
      Number.isNaN(event.startDate.getTime()) ||
      Number.isNaN(event.endDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid event dates.",
      });
    }

    event.rulesVersion += 1;

    await event.save();

    return res.json({
      success: true,
      message: "Seasonal event updated successfully.",
      event,
    });
  } catch (error) {
    next(error);
  }
};

// Publish or schedule an event
const publishEvent = async (req, res, next) => {
  try {
    const event = await SeasonalEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Seasonal event not found.",
      });
    }

    if (!["draft", "scheduled"].includes(event.status)) {
      return res.status(400).json({
        success: false,
        message: "This event cannot be published.",
      });
    }

    if (event.challenges.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one challenge before publishing.",
      });
    }

    const now = new Date();

    if (event.endDate <= now) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish an event that has already ended.",
      });
    }

    event.status = event.startDate > now ? "scheduled" : "active";
    event.publishedAt = now;

    await event.save();

    return res.json({
      success: true,
      message: "Seasonal event published successfully.",
      event,
    });
  } catch (error) {
    next(error);
  }
};

// Pause an event
const pauseEvent = async (req, res, next) => {
  try {
    const event = await SeasonalEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Seasonal event not found.",
      });
    }

    if (event.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Only active events can be paused.",
      });
    }

    event.status = "paused";
    await event.save();

    return res.json({
      success: true,
      message: "Event paused successfully.",
      event,
    });
  } catch (error) {
    next(error);
  }
};

// Resume a paused event
const resumeEvent = async (req, res, next) => {
  try {
    const event = await SeasonalEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Seasonal event not found.",
      });
    }

    if (event.status !== "paused") {
      return res.status(400).json({
        success: false,
        message: "Only paused events can be resumed.",
      });
    }

    const now = new Date();

    if (event.endDate <= now) {
      event.status = "completed";
    } else if (event.startDate > now) {
      event.status = "scheduled";
    } else {
      event.status = "active";
    }

    await event.save();

    return res.json({
      success: true,
      message: "Event status updated successfully.",
      event,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel an event
const cancelEvent = async (req, res, next) => {
  try {
    const event = await SeasonalEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Seasonal event not found.",
      });
    }

    if (["completed", "cancelled"].includes(event.status)) {
      return res.status(400).json({
        success: false,
        message: "This event cannot be cancelled.",
      });
    }

    event.status = "cancelled";
    await event.save();

    return res.json({
      success: true,
      message: "Event cancelled successfully.",
      event,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  publishEvent,
  pauseEvent,
  resumeEvent,
  cancelEvent,
};