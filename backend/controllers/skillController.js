const mongoose = require("mongoose");
const SkillPost = require("../models/SkillPost");
const Comment = require("../models/Comment");
const User = require("../models/User");

const parsePagination = (query) => {
  const page = Number.parseInt(query.page, 10) || 1;
  const limit = Number.parseInt(query.limit, 10) || 12;

  if (
    !Number.isSafeInteger(page) ||
    !Number.isSafeInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 50
  ) {
    return null;
  }

  return { page, limit };
};

const normalizeTags = (tags) => {
  if (tags === undefined || tags === null || tags === "") {
    return [];
  }

  if (Array.isArray(tags)) {
    tags = tags.join(",");
  }

  if (typeof tags !== "string") {
    return null;
  }

  const result = [
    ...new Set(
      tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (result.length > 10 || result.some((tag) => tag.length > 30)) {
    return null;
  }

  return result;
};

const validText = (value, maxLength) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= maxLength;

const validId = (id) => mongoose.isValidObjectId(id);

const sendValidationError = (res, message) =>
  res.status(400).json({
    success: false,
    error: { code: "VALIDATION_ERROR", message },
  });

exports.createSkillPost = async (req, res, next) => {
  try {
    const { skillName, description } = req.body;
    const tags = normalizeTags(req.body.tags);

    if (!validText(skillName, 100)) {
      return sendValidationError(
        res,
        "Skill name is required and must be at most 100 characters",
      );
    }

    if (!validText(description, 5000)) {
      return sendValidationError(
        res,
        "Description is required and must be at most 5000 characters",
      );
    }

    if (tags === null) {
      return sendValidationError(
        res,
        "Provide at most 10 tags, each no longer than 30 characters",
      );
    }

    if (!req.file) {
      return sendValidationError(res, "Image is required");
    }

    const post = await SkillPost.create({
      userId: req.user,
      skillName: skillName.trim(),
      description: description.trim(),
      imageUrl: req.file.path,
      tags,
    });

    return res.status(201).json(post);
  } catch (error) {
    return next(error);
  }
};

exports.getAllSkills = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);

    if (!pagination) {
      return sendValidationError(
        res,
        "Invalid pagination parameters"
      );
    }

    const { page, limit } = pagination;
    const filter = {};

    // Search by skill name or description
    if (req.query.search !== undefined) {
      if (
        typeof req.query.search !== "string" ||
        req.query.search.trim().length > 100
      ) {
        return sendValidationError(
          res,
          "Invalid search parameter"
        );
      }

      const search = req.query.search.trim();

      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        filter.$or = [
          { skillName: { $regex: escaped, $options: "i" } },
          { description: { $regex: escaped, $options: "i" } },
        ];
      }
    }

    // Filter by tag only when a non-empty tag is provided
    if (req.query.tag !== undefined) {
      if (
        typeof req.query.tag !== "string" ||
        req.query.tag.trim().length > 30
      ) {
        return sendValidationError(
          res,
          "Invalid tag parameter"
        );
      }

      const tag = req.query.tag.trim().toLowerCase();

      if (tag) {
        filter.tags = tag;
      }
    }

    // Sorting options
    const sortOptions = {
      newest: { createdAt: -1, _id: -1 },
      oldest: { createdAt: 1, _id: 1 },
      name: { skillName: 1, _id: 1 },
    };

    const sort = req.query.sort || "newest";

    if (!sortOptions[sort]) {
      return sendValidationError(
        res,
        "Invalid sort parameter"
      );
    }

    const [posts, total] = await Promise.all([
      SkillPost.find(filter)
        .populate("userId", "username avatarUrl")
        .sort(sortOptions[sort])
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      SkillPost.countDocuments(filter),
    ]);

    console.log("Explore filter:", JSON.stringify(filter));
    console.log("Explore matched posts:", posts.length);
    console.log("Explore total:", total);

    return res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.getSingleSkill = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_SKILL_ID", message: "Invalid skill ID" },
      });
    }

    const post = await SkillPost.findById(req.params.id).populate(
      "userId",
      "username avatarUrl",
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        error: { code: "SKILL_NOT_FOUND", message: "Skill not found" },
      });
    }

    return res.json(post);
  } catch (error) {
    return next(error);
  }
};

exports.getMyPosts = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);

    if (!pagination) {
      return sendValidationError(
        res,
        "Page must be positive and limit must be between 1 and 50",
      );
    }

    const { page, limit } = pagination;
    const filter = { userId: req.user };

    const [posts, total] = await Promise.all([
      SkillPost.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SkillPost.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateSkill = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_SKILL_ID", message: "Invalid skill ID" },
      });
    }

    const post = await SkillPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: { code: "SKILL_NOT_FOUND", message: "Skill not found" },
      });
    }

    if (post.userId.toString() !== req.user.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Not authorized" },
      });
    }

    const { skillName, description } = req.body;

    if (skillName !== undefined) {
      if (!validText(skillName, 100)) {
        return sendValidationError(res, "Invalid skill name");
      }
      post.skillName = skillName.trim();
    }

    if (description !== undefined) {
      if (!validText(description, 5000)) {
        return sendValidationError(res, "Invalid description");
      }
      post.description = description.trim();
    }

    if (req.body.tags !== undefined) {
      const tags = normalizeTags(req.body.tags);

      if (tags === null) {
        return sendValidationError(res, "Invalid tags");
      }

      post.tags = tags;
    }

    if (req.file) {
      post.imageUrl = req.file.path;
    }

    await post.save();

    return res.json({ success: true, data: post });
  } catch (error) {
    return next(error);
  }
};

exports.deleteSkill = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_SKILL_ID", message: "Invalid skill ID" },
      });
    }

    const post = await SkillPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: { code: "SKILL_NOT_FOUND", message: "Skill not found" },
      });
    }

    if (post.userId.toString() !== req.user.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Not authorized" },
      });
    }

    // Remove comments associated with the deleted post.
    await Comment.deleteMany({ postId: post._id });
    await post.deleteOne();

    return res.json({
      success: true,
      message: "Skill deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};

exports.getPublicProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_USER_ID",
          message: "Invalid user ID",
        },
      });
    }

    const user = await User.findById(id)
      .select(
        "username avatarUrl bio joinedAt learnerStats teacherStats achievements",
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    const skills = await SkillPost.find({ userId: user._id })
      .select("skillName description imageUrl tags createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    return res.json({
      success: true,
      profile: {
        id: user._id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        joinedAt: user.joinedAt,
        learnerStats: {
          level: user.learnerStats?.level ?? 1,
          completedSessions: user.learnerStats?.completedSessions ?? 0,
        },
        teacherStats: {
          level: user.teacherStats?.level ?? 1,
          completedSessions: user.teacherStats?.completedSessions ?? 0,
        },
        achievements: user.achievements ?? [],
        skills,
      },
    });
  } catch (error) {
    return next(error);
  }
};
