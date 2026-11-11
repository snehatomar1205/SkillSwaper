
const mongoose = require("mongoose");
const Comment = require("../models/Comment");
const SkillPost = require("../models/SkillPost");

exports.createComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid skill post ID",
      });
    }

    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.trim().length > 2000
    ) {
      return res.status(400).json({
        success: false,
        msg: "Comment must contain 1–2000 characters",
      });
    }

    const postExists = await SkillPost.exists({ _id: postId });

    if (!postExists) {
      return res.status(404).json({
        success: false,
        msg: "Skill post not found",
      });
    }

    const newComment = await Comment.create({
      postId,
      userId: req.user,
      text: text.trim(),
    });

    const populated = await newComment.populate(
      "userId",
      "username avatarUrl"
    );

    return res.status(201).json({
      success: true,
      comment: populated,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getCommentsByPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid skill post ID",
      });
    }

    const postExists = await SkillPost.exists({ _id: postId });

    if (!postExists) {
      return res.status(404).json({
        success: false,
        msg: "Skill post not found",
      });
    }

    const comments = await Comment.find({ postId })
      .populate("userId", "username avatarUrl")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      comments,
    });
  } catch (error) {
    return next(error);
  }
};

// Edit a comment — author only
exports.updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;

    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid comment ID",
      });
    }

    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.trim().length > 2000
    ) {
      return res.status(400).json({
        success: false,
        msg: "Comment must contain 1–2000 characters",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        msg: "Comment not found",
      });
    }

    if (String(comment.userId) !== String(req.user)) {
      return res.status(403).json({
        success: false,
        msg: "You can only edit your own comments",
      });
    }

    comment.text = text.trim();
    await comment.save();

    const populated = await comment.populate(
      "userId",
      "username avatarUrl"
    );

    return res.json({
      success: true,
      msg: "Comment updated successfully",
      comment: populated,
    });
  } catch (error) {
    return next(error);
  }
};

// Delete a comment — author only
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid comment ID",
      });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        msg: "Comment not found",
      });
    }

    if (String(comment.userId) !== String(req.user)) {
      return res.status(403).json({
        success: false,
        msg: "You can only delete your own comments",
      });
    }

    await comment.deleteOne();

    return res.json({
      success: true,
      msg: "Comment deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
};
